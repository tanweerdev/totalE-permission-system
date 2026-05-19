import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { OrgNode } from '../../org/entities/org-node.entity';
@Entity('user_permissions')
export class UserPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  userId: number;

  @ManyToOne(() => User, user => user.permissions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Index()
  @Column()
  orgNodeId: number;

  @ManyToOne(() => OrgNode)
  @JoinColumn({ name: 'orgNodeId' })
  orgNode: OrgNode;

  @Column({ type: 'int' })
  orgNodeLevel: number;

  @Column({ default: true })
  isActive: boolean;
}
