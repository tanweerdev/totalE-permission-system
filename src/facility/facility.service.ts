import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Facility } from './entities/facility.entity';
import { FacilityContext } from '../common/interfaces/facility-context.interface';

export interface FacilityOption {
  id: number;
  name: string;
  code: string;
}

@Injectable()
export class FacilityService {
  constructor(
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
  ) {}
  async getAuthorizedDropdown(context: FacilityContext): Promise<FacilityOption[]> {
    if (context.isEmpty()) {
      return [];
    }

    return this.facilityRepo
      .createQueryBuilder('f')
      .select(['f.id AS id', 'f.name AS name', 'f.code AS code'])
      .where('f.id IN (:...ids)', { ids: context.toArray() })
      .andWhere('f.isActive = true')
      .orderBy('f.name', 'ASC')
      .getRawMany<FacilityOption>();
  }
}
