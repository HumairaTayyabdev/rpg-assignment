import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { HelloWorldResolver } from './hello-world/hello-world.resolver';
import { HelloWorldService } from './hello-world/hello-world.service';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './auth/user.entity';
import { BlogModule } from './blog/blog.module';
import { BlogPost } from './blog/blog-post.entity';
import { BlogNotification } from './blog/blog-notification.entity';

function graphqlContext(context: unknown) {
  if (
    context &&
    typeof context === 'object' &&
    'connectionInitReceived' in context &&
    'connectionParams' in context
  ) {
    const wsContext = context as { connectionParams?: Record<string, unknown> };
    const raw = wsContext.connectionParams?.authorization;
    const authorization = typeof raw === 'string' ? raw : undefined;

    return {
      req: {
        headers: {
          authorization,
        },
      },
    };
  }

  const httpContext = context as { req?: unknown };
  return { req: httpContext.req ?? context };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        join(process.cwd(), '.env.local'),
        join(process.cwd(), '.env'),
      ],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'rpg_user',
      password: process.env.DB_PASSWORD ?? 'rpg_password',
      database: process.env.DB_DATABASE ?? 'rpg_blog',
      entities: [User, BlogPost, BlogNotification],
      synchronize: process.env.TYPEORM_SYNCHRONIZE !== 'false',
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      subscriptions: {
        'graphql-ws': {
          path: '/graphql-ws',
        },
      },
      context: graphqlContext,
    }),
    AuthModule,
    BlogModule,
  ],
  controllers: [AppController],
  providers: [AppService, HelloWorldResolver, HelloWorldService],
})
export class AppModule {}
