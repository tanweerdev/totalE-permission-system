import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeaturePermissionGuard } from '../../src/common/guards/feature-permission.guard';
import { FACILITY_CONTEXT_KEY } from '../../src/common/decorators/facility-context.decorator';
import { FacilityContext } from '../../src/common/interfaces/facility-context.interface';

function makeContext(features?: Partial<Record<'canViewAnalytics' | 'canViewPulse' | 'canViewSurvey' | 'canExportAnalytics' | 'canManagePermissions', boolean>>) {
  return new FacilityContext(
    1,
    {
      canViewAnalytics: [1],
      canViewPulse: [1],
      canViewSurvey: [1],
      canExportAnalytics: [1],
    },
    {
      canViewAnalytics: features?.canViewAnalytics ?? true,
      canViewPulse: features?.canViewPulse ?? true,
      canViewSurvey: features?.canViewSurvey ?? true,
      canExportAnalytics: features?.canExportAnalytics ?? true,
      canManagePermissions: features?.canManagePermissions ?? false,
    },
  );
}

function makeExecutionContext(request: Record<string, unknown>) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}

describe('FeaturePermissionGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: FeaturePermissionGuard;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new FeaturePermissionGuard(reflector as unknown as Reflector);
  });

  it('allows access when no features are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(makeExecutionContext({}));

    expect(result).toBe(true);
  });

  it('throws when permission context is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(['canViewPulse']);

    expect(() => guard.canActivate(makeExecutionContext({}))).toThrow(
      new ForbiddenException('Permission context is missing'),
    );
  });

  it('allows access when all required features are present', () => {
    reflector.getAllAndOverride.mockReturnValue(['canViewAnalytics', 'canViewPulse']);

    const result = guard.canActivate(
      makeExecutionContext({
        [FACILITY_CONTEXT_KEY]: makeContext(),
      }),
    );

    expect(result).toBe(true);
  });

  it('throws when a required feature is missing', () => {
    reflector.getAllAndOverride.mockReturnValue(['canManagePermissions']);

    expect(() =>
      guard.canActivate(
        makeExecutionContext({
          [FACILITY_CONTEXT_KEY]: makeContext({ canManagePermissions: false }),
        }),
      ),
    ).toThrow(new ForbiddenException('Missing required permission: canManagePermissions'));
  });
});
