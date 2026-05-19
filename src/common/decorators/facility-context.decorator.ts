import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FacilityContext } from '../interfaces/facility-context.interface';

export const FACILITY_CONTEXT_KEY = 'facilityContext';
export const FacilityCtx = createParamDecorator(
  (_data: unknown, executionContext: ExecutionContext): FacilityContext => {
    return executionContext.switchToHttp().getRequest()[FACILITY_CONTEXT_KEY];
  },
);
