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

@Entity('survey_responses')
export class SurveyResponse {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column()
  facilityId: number;

  @ManyToOne(() => Facility)
  @JoinColumn({ name: 'facilityId' })
  facility: Facility;

  @Column({ length: 100 })
  surveyType: string;

  @Column({ type: 'jsonb' })
  answers: Record<string, unknown>;

  @Index()
  @CreateDateColumn()
  createdAt: Date;
}
