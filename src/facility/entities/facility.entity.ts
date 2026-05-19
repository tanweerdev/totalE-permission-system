import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrgNode } from '../../org/entities/org-node.entity';

@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  name: string;

  @Column({ length: 50, nullable: true })
  code: string;

  @Index()
  @Column()
  orgNodeId: number;

  @ManyToOne(() => OrgNode, { eager: false })
  @JoinColumn({ name: 'orgNodeId' })
  orgNode: OrgNode;

  @Column({ default: true })
  isActive: boolean;
}
