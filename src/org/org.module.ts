import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrgNode } from './entities/org-node.entity';

@Module({
  imports: [TypeOrmModule.forFeature([OrgNode])],
  exports: [TypeOrmModule],
})
export class OrgModule {}
