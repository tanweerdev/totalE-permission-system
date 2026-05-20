import { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
export class FacilityScopedBuilder<T extends ObjectLiteral> {
  private readonly qb: SelectQueryBuilder<T>;
  private readonly facilityColumn: string;
  private readonly authorizedFacilityIds: number[];

  constructor(
    qb: SelectQueryBuilder<T>,
    authorizedFacilityIds: number[],
    facilityColumn = 'entity.facilityId',
  ) {
    this.qb = qb;
    this.facilityColumn = facilityColumn;
    this.authorizedFacilityIds = authorizedFacilityIds;
    this.applyAuthorizedScope(facilityColumn);
  }

  private applyAuthorizedScope(facilityColumn: string): void {
    if (!this.authorizedFacilityIds.length) {
      this.qb.andWhere('false');
      return;
    }

    this.qb.andWhere(
      `${facilityColumn} IN (:...__authorizedFacilityIds)`,
      { __authorizedFacilityIds: this.authorizedFacilityIds },
    );
  }

  withClientFacilityFilter(requestedFacilityIds: number[] | undefined): this {
    if (!requestedFacilityIds?.length) {
      return this;
    }

    const authorized = new Set(this.authorizedFacilityIds);
    const allowedIds = requestedFacilityIds.filter(id => authorized.has(id));

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
