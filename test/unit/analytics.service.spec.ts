import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AnalyticsService } from '../../src/analytics/analytics.service';
import { PulseResponse } from '../../src/analytics/entities/pulse-response.entity';
import { SurveyResponse } from '../../src/analytics/entities/survey-response.entity';
import { Facility } from '../../src/facility/entities/facility.entity';
import { FacilityContext } from '../../src/common/interfaces/facility-context.interface';
import { AnalyticsQueryDto } from '../../src/analytics/dto/analytics-query.dto';

function makeMockQb() {
  const qb: any = {
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue([]),
  };
  return qb;
}

const mockPulseRepo = () => ({
  createQueryBuilder: jest.fn(),
});
const mockSurveyRepo = () => ({ createQueryBuilder: jest.fn() });
const mockFacilityRepo = () => ({ createQueryBuilder: jest.fn() });

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let pulseRepo: ReturnType<typeof mockPulseRepo>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getRepositoryToken(PulseResponse), useFactory: mockPulseRepo },
        { provide: getRepositoryToken(SurveyResponse), useFactory: mockSurveyRepo },
        { provide: getRepositoryToken(Facility), useFactory: mockFacilityRepo },
      ],
    }).compile();

    service = module.get(AnalyticsService);
    pulseRepo = module.get(getRepositoryToken(PulseResponse));
  });

  describe('getPulseAnalytics', () => {
    const baseQuery: AnalyticsQueryDto = {
      dateFrom: '2024-01-01',
      dateTo: '2024-03-31',
    };

    it('returns empty array when facility context is empty', async () => {
      const qb = makeMockQb();
      pulseRepo.createQueryBuilder.mockReturnValue(qb);

      const ctx = new FacilityContext(1, []);
      const results = await service.getPulseAnalytics(ctx, baseQuery);

      expect(results).toEqual([]);
    });

    it('passes authorized facility IDs into the query', async () => {
      const qb = makeMockQb();
      pulseRepo.createQueryBuilder.mockReturnValue(qb);

      const ctx = new FacilityContext(1, [5, 10, 15]);
      await service.getPulseAnalytics(ctx, baseQuery);

      const calls: any[][] = qb.andWhere.mock.calls;
      const scopeCall = calls.find(c => String(c[0]).includes('__authorizedFacilityIds'));
      expect(scopeCall).toBeDefined();
      expect(scopeCall![1].__authorizedFacilityIds).toEqual(
        expect.arrayContaining([5, 10, 15]),
      );
    });

    it('intersects client facilityIds with authorized set', async () => {
      const qb = makeMockQb();
      pulseRepo.createQueryBuilder.mockReturnValue(qb);

      const ctx = new FacilityContext(1, [1, 2, 3]);
      await service.getPulseAnalytics(ctx, { ...baseQuery, facilityIds: [2, 99] });

      const calls: any[][] = qb.andWhere.mock.calls;
      const clientFilterCall = calls.find(c =>
        String(c[0]).includes('__clientFacilityFilter'),
      );
      expect(clientFilterCall).toBeDefined();
      expect(clientFilterCall![1].__clientFacilityFilter).toContain(2);
      expect(clientFilterCall![1].__clientFacilityFilter).not.toContain(99);
    });
  });

  describe('exportData', () => {
    it('returns empty array when context is empty', async () => {
      const ctx = new FacilityContext(1, []);
      const result = await service.exportData(ctx, {
        dateFrom: '2024-01-01',
        dateTo: '2024-12-31',
        dataType: 'pulse',
      });
      expect(result).toEqual([]);
    });
  });
});
