import { PermissionFeature } from '../../auth/entities/user-permission.entity';

export type ScopedPermissionFeature =
  | 'canViewAnalytics'
  | 'canViewPulse'
  | 'canViewSurvey'
  | 'canExportAnalytics';

type FeatureScopeMap = Record<ScopedPermissionFeature, number[]>;
type FeatureFlagMap = Record<PermissionFeature, boolean>;

export class FacilityContext {
  readonly userId: number;
  private readonly featureScopes: Record<ScopedPermissionFeature, Set<number>>;
  private readonly featureFlags: FeatureFlagMap;

  constructor(
    userId: number,
    featureScopes: FeatureScopeMap,
    featureFlags: FeatureFlagMap,
  ) {
    this.userId = userId;
    this.featureScopes = {
      canViewAnalytics: new Set(featureScopes.canViewAnalytics),
      canViewPulse: new Set(featureScopes.canViewPulse),
      canViewSurvey: new Set(featureScopes.canViewSurvey),
      canExportAnalytics: new Set(featureScopes.canExportAnalytics),
    };
    this.featureFlags = { ...featureFlags };
  }

  hasFeature(feature: PermissionFeature): boolean {
    return this.featureFlags[feature];
  }

  isEmptyFor(feature: ScopedPermissionFeature): boolean {
    return this.featureScopes[feature].size === 0;
  }

  toArray(feature: ScopedPermissionFeature): number[] {
    return Array.from(this.featureScopes[feature]);
  }

  intersect(feature: ScopedPermissionFeature, requestedIds: number[]): number[] {
    return requestedIds.filter(id => this.featureScopes[feature].has(id));
  }

  toJSON(): { userId: number; featureScopes: FeatureScopeMap; featureFlags: FeatureFlagMap } {
    return {
      userId: this.userId,
      featureScopes: {
        canViewAnalytics: this.toArray('canViewAnalytics'),
        canViewPulse: this.toArray('canViewPulse'),
        canViewSurvey: this.toArray('canViewSurvey'),
        canExportAnalytics: this.toArray('canExportAnalytics'),
      },
      featureFlags: { ...this.featureFlags },
    };
  }

  static empty(userId: number): FacilityContext {
    return new FacilityContext(
      userId,
      {
        canViewAnalytics: [],
        canViewPulse: [],
        canViewSurvey: [],
        canExportAnalytics: [],
      },
      {
        canViewAnalytics: false,
        canViewPulse: false,
        canViewSurvey: false,
        canExportAnalytics: false,
        canManagePermissions: false,
      },
    );
  }

  static fromCached(value: {
    userId: number;
    featureScopes: FeatureScopeMap;
    featureFlags: FeatureFlagMap;
  }): FacilityContext {
    return new FacilityContext(value.userId, value.featureScopes, value.featureFlags);
  }
}
