import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pulse } from './entities/pulse-response.entity';
import { Survey } from './entities/survey-response.entity';
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

export interface ExportRow {
  id: number;
  facilityId: number;
  facilityName: string;
  dataType: 'pulse' | 'survey';
  category?: string;
  score?: number;
  surveyType?: string;
  answers?: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Pulse)
    private readonly pulseRepo: Repository<Pulse>,
    @InjectRepository(Survey)
    private readonly surveyRepo: Repository<Survey>,
  ) {}

  async getPulseAnalytics(
    context: FacilityContext,
    query: AnalyticsQueryDto,
  ): Promise<PulseAnalyticRow[]> {
    const dateTrunc = this.dateTruncExpr('pulse', query.granularity ?? 'day');
    const authorizedFacilityIds = context.toArray('canViewPulse');

    const qb = this.pulseRepo
      .createQueryBuilder('pulse')
      .innerJoin('pulse.facility', 'facility')
      .select([
        'pulse.facility_id AS "facilityId"',
        'facility.name AS "facilityName"',
        'pulse.category AS category',
        `AVG(pulse.score) AS "avgScore"`,
        `COUNT(pulse.id) AS "responseCount"`,
        `${dateTrunc} AS period`,
      ])
      .where('pulse.created_at BETWEEN :from AND :to', {
        from: query.dateFrom,
        to: query.dateTo,
      })
      .groupBy('pulse.facility_id, facility.name, pulse.category, period')
      .orderBy('period', 'DESC');

    return new FacilityScopedBuilder(qb, authorizedFacilityIds, 'pulse.facility_id')
      .withClientFacilityFilter(query.facilityIds)
      .getQuery()
      .getRawMany<PulseAnalyticRow>();
  }

  async getSurveyAnalytics(
    context: FacilityContext,
    query: AnalyticsQueryDto,
  ): Promise<SurveyAnalyticRow[]> {
    const dateTrunc = this.dateTruncExpr('survey', query.granularity ?? 'day');
    const authorizedFacilityIds = context.toArray('canViewSurvey');

    const qb = this.surveyRepo
      .createQueryBuilder('survey')
      .innerJoin('survey.facility', 'facility')
      .select([
        'survey.facility_id AS "facilityId"',
        'facility.name AS "facilityName"',
        'survey.survey_type AS "surveyType"',
        `COUNT(survey.id) AS "responseCount"`,
        `${dateTrunc} AS period`,
      ])
      .where('survey.created_at BETWEEN :from AND :to', {
        from: query.dateFrom,
        to: query.dateTo,
      })
      .groupBy('survey.facility_id, facility.name, survey.survey_type, period')
      .orderBy('period', 'DESC');

    return new FacilityScopedBuilder(qb, authorizedFacilityIds, 'survey.facility_id')
      .withClientFacilityFilter(query.facilityIds)
      .getQuery()
      .getRawMany<SurveyAnalyticRow>();
  }

  async exportData(
    context: FacilityContext,
    dto: AnalyticsExportDto,
  ): Promise<ExportRow[]> {
    const authorizedFacilityIds = context.toArray('canExportAnalytics');
    if (!authorizedFacilityIds.length) {
      return [];
    }

    const rows: ExportRow[] = [];

    if (dto.dataType === 'pulse' || dto.dataType === 'combined') {
      rows.push(
        ...(await this.buildPulseExport(dto, authorizedFacilityIds)),
      );
    }

    if (dto.dataType === 'survey' || dto.dataType === 'combined') {
      rows.push(
        ...(await this.buildSurveyExport(dto, authorizedFacilityIds)),
      );
    }

    return rows.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }

  private dateTruncExpr(alias: string, granularity: 'day' | 'week' | 'month'): string {
    return `DATE_TRUNC('${granularity}', ${alias}.created_at)`;
  }

  private async buildPulseExport(
    dto: AnalyticsExportDto,
    authorizedFacilityIds: number[],
  ): Promise<ExportRow[]> {
    const qb = this.pulseRepo
      .createQueryBuilder('pulse')
      .innerJoin('pulse.facility', 'facility')
      .select([
        'pulse.id AS id',
        'pulse.facility_id AS "facilityId"',
        'facility.name AS "facilityName"',
        `'pulse' AS "dataType"`,
        'pulse.category AS category',
        'pulse.score AS score',
        'pulse.created_at AS "createdAt"',
      ])
      .where('pulse.created_at BETWEEN :from AND :to', {
        from: dto.dateFrom,
        to: dto.dateTo,
      });

    return new FacilityScopedBuilder(qb, authorizedFacilityIds, 'pulse.facility_id')
      .withClientFacilityFilter(dto.facilityIds)
      .getQuery()
      .getRawMany<ExportRow>();
  }

  private async buildSurveyExport(
    dto: AnalyticsExportDto,
    authorizedFacilityIds: number[],
  ): Promise<ExportRow[]> {
    const qb = this.surveyRepo
      .createQueryBuilder('survey')
      .innerJoin('survey.facility', 'facility')
      .select([
        'survey.id AS id',
        'survey.facility_id AS "facilityId"',
        'facility.name AS "facilityName"',
        `'survey' AS "dataType"`,
        'survey.survey_type AS "surveyType"',
        'survey.answers AS answers',
        'survey.created_at AS "createdAt"',
      ])
      .where('survey.created_at BETWEEN :from AND :to', {
        from: dto.dateFrom,
        to: dto.dateTo,
      });

    return new FacilityScopedBuilder(qb, authorizedFacilityIds, 'survey.facility_id')
      .withClientFacilityFilter(dto.facilityIds)
      .getQuery()
      .getRawMany<ExportRow>();
  }
}
