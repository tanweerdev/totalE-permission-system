import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { OrgModule } from './org/org.module';
import { FacilityModule } from './facility/facility.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'totale',
      autoLoadEntities: true,
      synchronize: false,
    }),
    CacheModule.register({
      isGlobal: true,
      ttl: 300_000,
      max: 1000,
    }),
    AuthModule,
    OrgModule,
    FacilityModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
