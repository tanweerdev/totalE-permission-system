import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Facility } from './entities/facility.entity';
import { FacilityContext } from '../common/interfaces/facility-context.interface';

export interface FacilityOption {
  id: number;
  name: string;
  code: string;
  organizationId: number;
  organizationName: string;
}

@Injectable()
export class FacilityService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
  ) {}
  async getAuthorizedDropdown(context: FacilityContext): Promise<FacilityOption[]> {
    const ids = context.toArray('canViewAnalytics');
    if (!ids.length) {
      return [];
    }

    return this.facilityRepo
      .createQueryBuilder('f')
      .innerJoin('f.organization', 'org')
      .select([
        'f.id AS id',
        'f.name AS name',
        'f.code AS code',
        'org.id AS "organizationId"',
        'org.name AS "organizationName"',
      ])
      .where('f.id IN (:...ids)', { ids })
      .andWhere('f.is_active = true')
      .orderBy('org.name', 'ASC')
      .addOrderBy('f.name', 'ASC')
      .getRawMany<FacilityOption>();
  }
}
