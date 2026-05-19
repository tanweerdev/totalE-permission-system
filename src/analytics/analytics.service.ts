import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PulseResponse } from './entities/pulse-response.entity';
import { SurveyResponse } from './entities/survey-response.entity';
import { FacilityContext } from '../common/interfaces/facility-context.interface';
import { FacilityScopedBuilder } from '../query/facility-scoped.builder';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { AnalyticsExportDto } from './dto/analytics-export.dto';

export interface PulseAnalyticRow {
  facilityId: number;
  facilityName: string;
  category: string;
  avgScore: number;
  responseCount: number;
  period: string;
}

export interface SurveyAnalyticRow {
  facilityId: number;
  facilityName: string;
  surveyType: string;
  responseCount: number;
  period: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(PulseResponse)
    private readonly pulseRepo: Repository<PulseResponse>,
    @InjectRepository(SurveyResponse)
    private readonly surveyRepo: Repository<SurveyResponse>,
  ) {}

  async getPulseAnalytics(
    context: FacilityContext,
    query: AnalyticsQueryDto,
  ): Promise<PulseAnalyticRow[]> {
    const dateTrunc = this.dateTruncExpr('pulse', query.granularity ?? 'day');

    const qb = this.pulseRepo
      .createQueryBuilder('pulse')
      .innerJoin('pulse.facility', 'facility')
      .select([
        'pulse.facilityId AS "facilityId"',
        'facility.name AS "facilityName"',
        'pulse.category AS category',
        `AVG(pulse.score) AS "avgScore"`,
        `COUNT(pulse.id) AS "responseCount"`,
        `${dateTrunc} AS period`,
      ])
      .where('pulse.createdAt BETWEEN :from AND :to', {
        from: query.dateFrom,
        to: query.dateTo,
      })
      .groupBy('pulse.facilityId, facility.name, pulse.category, period')
      .orderBy('period', 'DESC');

    return new FacilityScopedBuilder(qb, context, 'pulse.facilityId')
      .withClientFacilityFilter(query.facilityIds)
      .getQuery()
      .getRawMany<PulseAnalyticRow>();
  }

  async getSurveyAnalytics(
    context: FacilityContext,
    query: AnalyticsQueryDto,
  ): Promise<SurveyAnalyticRow[]> {
    const dateTrunc = this.dateTruncExpr('survey', query.granularity ?? 'day');

    const qb = this.surveyRepo
      .createQueryBuilder('survey')
      .innerJoin('survey.facility', 'facility')
      .select([
        'survey.facilityId AS "facilityId"',
        'facility.name AS "facilityName"',
        'survey.surveyType AS "surveyType"',
        `COUNT(survey.id) AS "responseCount"`,
        `${dateTrunc} AS period`,
      ])
      .where('survey.createdAt BETWEEN :from AND :to', {
        from: query.dateFrom,
        to: query.dateTo,
      })
      .groupBy('survey.facilityId, facility.name, survey.surveyType, period')
      .orderBy('period', 'DESC');

    return new FacilityScopedBuilder(qb, context, 'survey.facilityId')
      .withClientFacilityFilter(query.facilityIds)
      .getQuery()
      .getRawMany<SurveyAnalyticRow>();
  }

  async exportData(
    context: FacilityContext,
    dto: AnalyticsExportDto,
  ): Promise<Record<string, unknown>[]> {
    if (context.isEmpty()) {
      return [];
    }

    if (dto.dataType === 'pulse' || dto.dataType === 'combined') {
      const qb = this.pulseRepo
        .createQueryBuilder('pulse')
        .innerJoin('pulse.facility', 'facility')
        .select([
          'pulse.id AS id',
          'facility.name AS "facilityName"',
          'pulse.category AS category',
          'pulse.score AS score',
          'pulse.createdAt AS "createdAt"',
        ])
        .where('pulse.createdAt BETWEEN :from AND :to', {
          from: dto.dateFrom,
          to: dto.dateTo,
        });

      return new FacilityScopedBuilder(qb, context, 'pulse.facilityId')
        .withClientFacilityFilter(dto.facilityIds)
        .getQuery()
        .getRawMany();
    }

    if (dto.dataType === 'survey') {
      const qb = this.surveyRepo
        .createQueryBuilder('survey')
        .innerJoin('survey.facility', 'facility')
        .select([
          'survey.id AS id',
          'facility.name AS "facilityName"',
          'survey.surveyType AS "surveyType"',
          'survey.answers AS answers',
          'survey.createdAt AS "createdAt"',
        ])
        .where('survey.createdAt BETWEEN :from AND :to', {
          from: dto.dateFrom,
          to: dto.dateTo,
        });

      return new FacilityScopedBuilder(qb, context, 'survey.facilityId')
        .withClientFacilityFilter(dto.facilityIds)
        .getQuery()
        .getRawMany();
    }

    return [];
  }

  private dateTruncExpr(alias: string, granularity: 'day' | 'week' | 'month'): string {
    return `DATE_TRUNC('${granularity}', ${alias}."createdAt")`;
  }
}
