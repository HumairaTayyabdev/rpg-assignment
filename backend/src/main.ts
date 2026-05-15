import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const configService = app.get(ConfigService);
  const frontendOrigin =
    configService.get<string>('FRONTEND_ORIGIN') ?? 'http://localhost:5173';

  app.enableCors({
    origin: frontendOrigin,
  });

  const port = Number(configService.get<string>('PORT') ?? 3200);
  await app.listen(port);
  console.log(`Graphql Endpoint: http://localhost:${port}/graphql`);
}
void bootstrap();
