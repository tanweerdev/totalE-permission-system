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

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({ name: 'facility_id' })
  facilityId: number;

  @ManyToOne(() => Facility)
  @JoinColumn({ name: 'facility_id' })
  facility: Facility;

  @Column({ name: 'survey_type', length: 100 })
  surveyType: string;

  @Column({ type: 'jsonb' })
  answers: Record<string, unknown>;

  @Index()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
