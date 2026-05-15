import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../auth/user.entity';
import { BlogPost } from './blog-post.entity';

@Entity({ name: 'blog_notifications' })
export class BlogNotification {
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'recipient_id', type: 'uuid' })
  recipientId: string;

  @Column({ name: 'blog_post_id', type: 'uuid' })
  blogPostId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  @ManyToOne(() => BlogPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'blog_post_id' })
  blogPost: BlogPost;

  @Column({ type: 'boolean', default: false })
  read: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
