import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { JwtService } from '@nestjs/jwt';

const SKIP = !process.env.TEST_DATABASE_URL;

function makeToken(jwtService: JwtService, userId: number): string {
  return jwtService.sign({ sub: userId, email: `user${userId}@test.com` });
}

(SKIP ? describe.skip : describe)('Analytics — facility-level access control (integration)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = moduleFixture.get(DataSource);
    jwtService = moduleFixture.get(JwtService);

    await seedTestData(dataSource);
  });

  afterAll(async () => {
    await cleanTestData(dataSource);
    await app.close();
  });

  describe('GET /analytics/facilities', () => {
    it('returns only facilities authorized for the user', async () => {
      const token = makeToken(jwtService, TEST_USER_REGION_A);

      const res = await request(app.getHttpServer())
        .get('/analytics/facilities')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const ids = res.body.map((f: any) => f.id);
      expect(ids).toEqual(expect.arrayContaining(REGION_A_FACILITIES));
      REGION_B_FACILITIES.forEach(id => expect(ids).not.toContain(id));
    });

    it('returns empty array for user with no permissions', async () => {
      const token = makeToken(jwtService, TEST_USER_NO_PERMS);

      const res = await request(app.getHttpServer())
        .get('/analytics/facilities')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .get('/analytics/facilities')
        .expect(401);
    });
  });

  describe('GET /analytics/pulse', () => {
    it('scopes response to authorized facilities only', async () => {
      const token = makeToken(jwtService, TEST_USER_REGION_A);

      const res = await request(app.getHttpServer())
        .get('/analytics/pulse')
        .query({ dateFrom: '2020-01-01', dateTo: '2099-12-31' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const facilityIds = [...new Set(res.body.map((r: any) => r.facilityId))];
      facilityIds.forEach(id =>
        expect(REGION_A_FACILITIES).toContain(id),
      );
    });

    it('cannot expand scope via manipulated facilityIds param', async () => {
      const token = makeToken(jwtService, TEST_USER_REGION_A);

      const res = await request(app.getHttpServer())
        .get('/analytics/pulse')
        .query({
          dateFrom: '2020-01-01',
          dateTo: '2099-12-31',
          facilityIds: REGION_B_FACILITIES,
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('POST /analytics/export', () => {
    it('export respects same facility scope as view endpoints', async () => {
      const token = makeToken(jwtService, TEST_USER_REGION_A);

      const res = await request(app.getHttpServer())
        .post('/analytics/export')
        .set('Authorization', `Bearer ${token}`)
        .send({ dateFrom: '2020-01-01', dateTo: '2099-12-31', dataType: 'pulse' })
        .expect(200);

      const facilityIds = [...new Set(res.body.map((r: any) => r.facilityId))];
      facilityIds.forEach(id =>
        expect(REGION_A_FACILITIES).toContain(id),
      );
    });
  });
});

const TEST_USER_REGION_A = 1001;
const TEST_USER_NO_PERMS = 1002;
const REGION_A_FACILITIES = [101, 102, 103];
const REGION_B_FACILITIES = [201, 202];

async function seedTestData(ds: DataSource): Promise<void> {
  await ds.query(`
    INSERT INTO users (id, email, password_hash, is_active)
    VALUES
      (${TEST_USER_REGION_A}, 'region_a@test.com', 'x', true),
      (${TEST_USER_NO_PERMS}, 'noperms@test.com', 'x', true)
    ON CONFLICT DO NOTHING;

    INSERT INTO org_nodes (id, name, level, parent_id, path)
    VALUES
      (1, 'Root', 0, NULL, '1'),
      (2, 'Region A', 1, 1, '1.2'),
      (3, 'Region B', 1, 1, '1.3')
    ON CONFLICT DO NOTHING;

    INSERT INTO facilities (id, name, code, org_node_id, is_active)
    VALUES
      (101, 'Facility A1', 'A1', 2, true),
      (102, 'Facility A2', 'A2', 2, true),
      (103, 'Facility A3', 'A3', 2, true),
      (201, 'Facility B1', 'B1', 3, true),
      (202, 'Facility B2', 'B2', 3, true)
    ON CONFLICT DO NOTHING;

    INSERT INTO user_permissions (user_id, org_node_id, org_node_level, can_view_analytics, can_view_pulse, is_active)
    VALUES
      (${TEST_USER_REGION_A}, 2, 1, true, true, true)
    ON CONFLICT DO NOTHING;
  `);
}

async function cleanTestData(ds: DataSource): Promise<void> {
  await ds.query(`
    DELETE FROM user_permissions WHERE user_id IN (${TEST_USER_REGION_A}, ${TEST_USER_NO_PERMS});
    DELETE FROM pulse_responses WHERE facility_id IN (101,102,103,201,202);
    DELETE FROM facilities WHERE id IN (101,102,103,201,202);
    DELETE FROM org_nodes WHERE id IN (1,2,3);
    DELETE FROM users WHERE id IN (${TEST_USER_REGION_A}, ${TEST_USER_NO_PERMS});
  `);
}
