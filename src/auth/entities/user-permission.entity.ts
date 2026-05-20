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
import { User } from './user.entity';
import { Organization } from '../../org/entities/organization.entity';
import { Facility } from '../../facility/entities/facility.entity';

export type PermissionFeature =
  | 'canViewAnalytics'
  | 'canViewPulse'
  | 'canViewSurvey'
  | 'canExportAnalytics'
  | 'canManagePermissions';

@Entity('user_permissions')
export class UserPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, user => user.permissions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Index()
  @Column({ name: 'organization_id', nullable: true })
  organizationId: number | null;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization | null;

  @Index()
  @Column({ name: 'facility_id', nullable: true })
  facilityId: number | null;

  @ManyToOne(() => Facility, { nullable: true })
  @JoinColumn({ name: 'facility_id' })
  facility: Facility | null;

  @Column({ name: 'can_view_analytics', default: false })
  canViewAnalytics: boolean;

  @Column({ name: 'can_view_pulse', default: false })
  canViewPulse: boolean;

  @Column({ name: 'can_view_survey', default: false })
  canViewSurvey: boolean;

  @Column({ name: 'can_export_analytics', default: false })
  canExportAnalytics: boolean;

  @Column({ name: 'can_manage_permissions', default: false })
  canManagePermissions: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
