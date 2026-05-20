import { FacilityScopedBuilder } from '../../src/query/facility-scoped.builder';
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';

function makeMockQb(): jest.Mocked<SelectQueryBuilder<ObjectLiteral>> {
  return {
    andWhere: jest.fn().mockReturnThis(),
    getQuery: jest.fn().mockReturnThis(),
  } as unknown as jest.Mocked<SelectQueryBuilder<ObjectLiteral>>;
}

describe('FacilityScopedBuilder', () => {
  describe('constructor — authorized scope injection', () => {
    it('adds IN clause for authorized facility IDs on construction', () => {
      const qb = makeMockQb();

      new FacilityScopedBuilder(qb, [10, 20, 30], 'entity.facilityId');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('IN (:...__authorizedFacilityIds)'),
        { __authorizedFacilityIds: expect.arrayContaining([10, 20, 30]) },
      );
    });

    it('applies `false` predicate when the authorized scope is empty', () => {
      const qb = makeMockQb();

      new FacilityScopedBuilder(qb, [], 'entity.facilityId');

      expect(qb.andWhere).toHaveBeenCalledWith('false');
    });
  });

  describe('withClientFacilityFilter', () => {
    it('is a no-op when requestedIds is undefined', () => {
      const qb = makeMockQb();
      const callsBefore = (qb.andWhere as jest.Mock).mock.calls.length;

      const builder = new FacilityScopedBuilder(qb, [1, 2, 3]);
      builder.withClientFacilityFilter(undefined);

      expect((qb.andWhere as jest.Mock).mock.calls.length).toBe(callsBefore + 1);
    });

    it('is a no-op when requestedIds is empty', () => {
      const qb = makeMockQb();
      const builder = new FacilityScopedBuilder(qb, [1, 2, 3]);
      const callsBefore = (qb.andWhere as jest.Mock).mock.calls.length;

      builder.withClientFacilityFilter([]);

      expect((qb.andWhere as jest.Mock).mock.calls.length).toBe(callsBefore);
    });

    it('intersects client IDs with the authorized set', () => {
      const qb = makeMockQb();

      new FacilityScopedBuilder(qb, [1, 2, 3]).withClientFacilityFilter([2, 3, 99]);

      const calls = (qb.andWhere as jest.Mock).mock.calls;
      const clientFilterCall = calls.find(call => String(call[0]).includes('__clientFacilityFilter'));
      expect(clientFilterCall).toBeDefined();
      expect(clientFilterCall?.[1].__clientFacilityFilter).toEqual(
        expect.arrayContaining([2, 3]),
      );
      expect(clientFilterCall?.[1].__clientFacilityFilter).not.toContain(99);
    });

    it('applies false predicate when the intersection is empty', () => {
      const qb = makeMockQb();

      new FacilityScopedBuilder(qb, [1, 2, 3]).withClientFacilityFilter([50, 60, 70]);

      const calls = (qb.andWhere as jest.Mock).mock.calls;
      const falseCall = calls.find(call => call[0] === 'false');
      expect(falseCall).toBeDefined();
    });
  });
});
