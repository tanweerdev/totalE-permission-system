import { FacilityScopedBuilder } from '../../src/query/facility-scoped.builder';
import { FacilityContext } from '../../src/common/interfaces/facility-context.interface';
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
      const ctx = new FacilityContext(1, [10, 20, 30]);

      new FacilityScopedBuilder(qb, ctx, 'entity.facilityId');

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('IN (:...__authorizedFacilityIds)'),
        { __authorizedFacilityIds: expect.arrayContaining([10, 20, 30]) },
      );
    });

    it('applies `false` predicate when context is empty', () => {
      const qb = makeMockQb();
      const ctx = new FacilityContext(1, []);

      new FacilityScopedBuilder(qb, ctx, 'entity.facilityId');

      expect(qb.andWhere).toHaveBeenCalledWith('false');
    });
  });

  describe('withClientFacilityFilter', () => {
    it('is a no-op when requestedIds is undefined', () => {
      const qb = makeMockQb();
      const ctx = new FacilityContext(1, [1, 2, 3]);
      const callsBefore = (qb.andWhere as jest.Mock).mock.calls.length;

      const builder = new FacilityScopedBuilder(qb, ctx);
      builder.withClientFacilityFilter(undefined);

      expect((qb.andWhere as jest.Mock).mock.calls.length).toBe(callsBefore + 1);
    });

    it('is a no-op when requestedIds is empty', () => {
      const qb = makeMockQb();
      const ctx = new FacilityContext(1, [1, 2, 3]);
      const builder = new FacilityScopedBuilder(qb, ctx);
      const callsBefore = (qb.andWhere as jest.Mock).mock.calls.length;

      builder.withClientFacilityFilter([]);

      expect((qb.andWhere as jest.Mock).mock.calls.length).toBe(callsBefore);
    });

    it('intersects client IDs with authorized set — cannot expand scope', () => {
      const qb = makeMockQb();
      const ctx = new FacilityContext(1, [1, 2, 3]);

      new FacilityScopedBuilder(qb, ctx)
        .withClientFacilityFilter([2, 3, 99]);

      const calls = (qb.andWhere as jest.Mock).mock.calls;
      const clientFilterCall = calls.find(c => String(c[0]).includes('__clientFacilityFilter'));
      expect(clientFilterCall).toBeDefined();
      expect(clientFilterCall[1].__clientFacilityFilter).toEqual(expect.arrayContaining([2, 3]));
      expect(clientFilterCall[1].__clientFacilityFilter).not.toContain(99);
    });

    it('applies false predicate when intersection is empty', () => {
      const qb = makeMockQb();
      const ctx = new FacilityContext(1, [1, 2, 3]);

      new FacilityScopedBuilder(qb, ctx)
        .withClientFacilityFilter([50, 60, 70]);

      const calls = (qb.andWhere as jest.Mock).mock.calls;
      const falseCall = calls.find(c => c[0] === 'false');
      expect(falseCall).toBeDefined();
    });
  });

  describe('FacilityContext', () => {
    it('intersect returns only IDs in the authorized set', () => {
      const ctx = new FacilityContext(1, [10, 20, 30]);
      expect(ctx.intersect([10, 30, 999])).toEqual(expect.arrayContaining([10, 30]));
      expect(ctx.intersect([10, 30, 999])).not.toContain(999);
    });

    it('contains returns false for unauthorized IDs', () => {
      const ctx = new FacilityContext(1, [1, 2]);
      expect(ctx.contains(3)).toBe(false);
    });

    it('internal state is not publicly exposed', () => {
      const ctx = new FacilityContext(1, [1]);
      expect('authorizedFacilityIds' in ctx).toBe(false);
      expect(ctx.contains(999)).toBe(false);
      expect(ctx.toArray()).toEqual([1]);
    });
  });
});
