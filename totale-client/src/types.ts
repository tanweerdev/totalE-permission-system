export type PermissionFeature =
  | 'canViewAnalytics'
  | 'canViewPulse'
  | 'canViewSurvey'
  | 'canExportAnalytics'
  | 'canManagePermissions';

export interface FeatureFlags {
  canViewAnalytics: boolean;
  canViewPulse: boolean;
  canViewSurvey: boolean;
  canExportAnalytics: boolean;
  canManagePermissions: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
}

export interface UserPermission {
  id: number;
  userId: number;
  organizationId: number | null;
  facilityId: number | null;
  organizationName: string | null;
  facilityName: string | null;
  canViewAnalytics: boolean;
  canViewPulse: boolean;
  canViewSurvey: boolean;
  canExportAnalytics: boolean;
  canManagePermissions: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Facility {
  id: number;
  name: string;
  code: string | null;
  organizationId: number;
  organizationName: string;
}

export interface PulseRow {
  period: string;
  facilityId: number;
  facilityName: string;
  category: string;
  avgScore: number;
  responseCount: number;
}

export interface SurveyRow {
  period: string;
  facilityId: number;
  facilityName: string;
  surveyType: string;
  responseCount: number;
}

export interface ExportRow {
  id: number;
  facilityId: number;
  facilityName: string;
  dataType: 'pulse' | 'survey';
  // pulse-specific
  category?: string;
  score?: number;
  // survey-specific
  surveyType?: string;
  answers?: Record<string, unknown>;
  createdAt: string;
}

export interface AnalyticsQuery {
  dateFrom: string;
  dateTo: string;
  facilityIds?: number[];
  granularity?: 'day' | 'week' | 'month';
}

export interface CreatePermissionDto {
  organizationId?: number | null;
  facilityId?: number | null;
  canViewAnalytics: boolean;
  canViewPulse: boolean;
  canViewSurvey: boolean;
  canExportAnalytics: boolean;
  canManagePermissions: boolean;
}
