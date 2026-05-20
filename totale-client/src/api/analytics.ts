import client from './client';
import type { Facility, PulseRow, SurveyRow, ExportRow, AnalyticsQuery } from '../types';

function buildParams(query: AnalyticsQuery) {
  const params = new URLSearchParams();
  params.set('dateFrom', query.dateFrom);
  params.set('dateTo', query.dateTo);
  if (query.granularity) params.set('granularity', query.granularity);
  if (query.facilityIds?.length) {
    query.facilityIds.forEach((id) => params.append('facilityIds[]', String(id)));
  }
  return params;
}

export async function getFacilities(): Promise<Facility[]> {
  const res = await client.get<Facility[]>('/analytics/facilities');
  // getRawMany returns BIGINT as strings — normalize to numbers
  return res.data.map((f) => ({ ...f, id: Number(f.id), organizationId: Number(f.organizationId) }));
}

export async function getPulse(query: AnalyticsQuery): Promise<PulseRow[]> {
  const res = await client.get<PulseRow[]>('/analytics/pulse', { params: buildParams(query) });
  return res.data;
}

export async function getSurvey(query: AnalyticsQuery): Promise<SurveyRow[]> {
  const res = await client.get<SurveyRow[]>('/analytics/survey', { params: buildParams(query) });
  return res.data;
}

export interface ExportDto {
  dateFrom: string;
  dateTo: string;
  dataType: 'pulse' | 'survey' | 'combined';
  facilityIds?: number[];
}

export async function exportData(dto: ExportDto): Promise<ExportRow[]> {
  const res = await client.post<ExportRow[]>('/analytics/export', dto);
  return res.data;
}
