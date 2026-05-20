import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Index()
  @Column({ type: 'int' })
  level: number;

  @Index()
  @Column({ name: 'parent_id', nullable: true, type: 'bigint' })
  parentId: number | null;

  @ManyToOne(() => Organization, organization => organization.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Organization;

  @OneToMany(() => Organization, organization => organization.parent)
  children: Organization[];

  @Index()
  @Column({ type: 'text', nullable: true })
  path: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
