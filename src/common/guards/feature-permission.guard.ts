import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRED_FEATURES_KEY } from '../decorators/feature-permission.decorator';
import { PermissionFeature } from '../../auth/entities/user-permission.entity';
import { FACILITY_CONTEXT_KEY } from '../decorators/facility-context.decorator';
import { FacilityContext } from '../interfaces/facility-context.interface';

@Injectable()
export class FeaturePermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeatures = this.reflector.getAllAndOverride<PermissionFeature[]>(
      REQUIRED_FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const facilityContext = request[FACILITY_CONTEXT_KEY] as FacilityContext | undefined;

    if (!facilityContext) {
      throw new ForbiddenException('Permission context is missing');
    }

    const missingFeature = requiredFeatures.find(feature => !facilityContext.hasFeature(feature));
    if (missingFeature) {
      throw new ForbiddenException(`Missing required permission: ${missingFeature}`);
    }

    return true;
  }
}
