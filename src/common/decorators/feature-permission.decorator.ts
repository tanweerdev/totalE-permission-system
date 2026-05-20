import { SetMetadata } from '@nestjs/common';
import { PermissionFeature } from '../../auth/entities/user-permission.entity';

export const REQUIRED_FEATURES_KEY = 'requiredPermissionFeatures';
export const RequireFeatures = (...features: PermissionFeature[]) =>
  SetMetadata(REQUIRED_FEATURES_KEY, features);
