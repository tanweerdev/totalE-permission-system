export class FacilityContext {
  readonly userId: number;
  private readonly ids: Set<number>;

  constructor(userId: number, facilityIds: number[]) {
    this.userId = userId;
    this.ids = new Set(facilityIds);
  }

  isEmpty(): boolean {
    return this.ids.size === 0;
  }

  contains(facilityId: number): boolean {
    return this.ids.has(facilityId);
  }

  toArray(): number[] {
    return Array.from(this.ids);
  }

  intersect(requestedIds: number[]): number[] {
    return requestedIds.filter(id => this.ids.has(id));
  }
}
