import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PulseResponse } from './entities/pulse-response.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { FacilityModule } from '../facility/facility.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PulseResponse, SurveyResponse]),
    FacilityModule,
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
