import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
} from 'typeorm';
import { Facility } from '../../facility/entities/facility.entity';

@Entity('pulses')
export class Pulse {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'facility_id' })
  facilityId: number;

  @ManyToOne(() => Facility)
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @Column({ type: 'int' })
  score: number;

  @Column({ length: 100 })
  category: string;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
