import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from '../../org/entities/organization.entity';

@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 50, nullable: true })
  code: string;

  @Index()
  @Column({ name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, { eager: false })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
