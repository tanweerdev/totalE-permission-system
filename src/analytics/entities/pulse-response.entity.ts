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

@Entity('pulse_responses')
export class PulseResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  facilityId: number;

  @ManyToOne(() => Facility)
  @JoinColumn({ name: 'facilityId' })
  facility: Facility;

  @Column({ type: 'int' })
  score: number;

  @Column({ length: 100 })
  category: string;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
