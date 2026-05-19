import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { FacilityContext } from '../common/interfaces/facility-context.interface';
export class FacilityScopedBuilder<T extends ObjectLiteral> {
  private readonly qb: SelectQueryBuilder<T>;
  private readonly facilityColumn: string;

  constructor(
    qb: SelectQueryBuilder<T>,
    private readonly context: FacilityContext,
    facilityColumn = 'entity.facilityId',
  ) {
    this.qb = qb;
    this.facilityColumn = facilityColumn;
    this.applyAuthorizedScope(facilityColumn);
  }

  private applyAuthorizedScope(facilityColumn: string): void {
    if (this.context.isEmpty()) {
      this.qb.andWhere('false');
      return;
    }

    this.qb.andWhere(
      `${facilityColumn} IN (:...__authorizedFacilityIds)`,
      { __authorizedFacilityIds: this.context.toArray() },
    );
  }

  withClientFacilityFilter(requestedFacilityIds: number[] | undefined): this {
    if (!requestedFacilityIds?.length) {
      return this;
    }

    const allowedIds = this.context.intersect(requestedFacilityIds);

    if (!allowedIds.length) {
      this.qb.andWhere('false');
      return this;
    }

    this.qb.andWhere(
      `${this.facilityColumn} IN (:...__clientFacilityFilter)`,
      { __clientFacilityFilter: allowedIds },
    );

    return this;
  }

  getQuery(): SelectQueryBuilder<T> {
    return this.qb;
  }
}
