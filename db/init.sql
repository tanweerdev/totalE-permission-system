CREATE TABLE IF NOT EXISTS organizations (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  level INT NOT NULL CHECK (level BETWEEN 0 AND 4),
  parent_id BIGINT NULL REFERENCES organizations(id) ON DELETE SET NULL,
  path TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations (parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_level ON organizations (level);
CREATE INDEX IF NOT EXISTS idx_organizations_path ON organizations (path);
CREATE INDEX IF NOT EXISTS idx_organizations_is_active ON organizations (is_active);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users (is_active);

CREATE TABLE IF NOT EXISTS facilities (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) NULL,
  organization_id BIGINT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facilities_organization_id ON facilities (organization_id);
CREATE INDEX IF NOT EXISTS idx_facilities_is_active ON facilities (is_active);

CREATE TABLE IF NOT EXISTS user_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id BIGINT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  facility_id BIGINT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  can_view_analytics BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_pulse BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_survey BOOLEAN NOT NULL DEFAULT FALSE,
  can_export_analytics BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_permissions BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (organization_id IS NOT NULL AND facility_id IS NULL)
    OR
    (organization_id IS NULL AND facility_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_organization_id ON user_permissions (organization_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_facility_id ON user_permissions (facility_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_active ON user_permissions (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_manage_permissions
  ON user_permissions (user_id, can_manage_permissions, is_active);

CREATE TABLE IF NOT EXISTS pulses (
  id BIGSERIAL PRIMARY KEY,
  facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  score INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulses_facility_id ON pulses (facility_id);
CREATE INDEX IF NOT EXISTS idx_pulses_created_at ON pulses (created_at);
CREATE INDEX IF NOT EXISTS idx_pulses_facility_created ON pulses (facility_id, created_at);

CREATE TABLE IF NOT EXISTS surveys (
  id BIGSERIAL PRIMARY KEY,
  facility_id BIGINT NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  survey_type VARCHAR(100) NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_surveys_facility_id ON surveys (facility_id);
CREATE INDEX IF NOT EXISTS idx_surveys_created_at ON surveys (created_at);
CREATE INDEX IF NOT EXISTS idx_surveys_facility_created ON surveys (facility_id, created_at);

TRUNCATE TABLE
  surveys,
  pulses,
  user_permissions,
  facilities,
  users,
  organizations
RESTART IDENTITY CASCADE;

INSERT INTO organizations (id, name, level, parent_id, path, is_active) VALUES
  (1, 'Acme Corp', 0, NULL, '1', true),
  (2, 'West Region', 1, 1, '1.2', true),
  (3, 'North Area', 2, 2, '1.2.3', true),
  (4, 'Downtown District', 3, 3, '1.2.3.4', true),
  (5, 'Main Campus', 4, 4, '1.2.3.4.5', true),
  (6, 'East Region', 1, 1, '1.6', true),
  (7, 'East Area', 2, 6, '1.6.7', true),
  (8, 'South Region', 1, 1, '1.8', false),
  (9, 'South Area', 2, 8, '1.8.9', false);

INSERT INTO facilities (id, name, code, organization_id, is_active) VALUES
  (10, 'Sunset Clinic', 'SC-01', 3, true),
  (11, 'Riverside Clinic', 'RC-01', 3, true),
  (12, 'Downtown Clinic', 'DC-01', 4, true),
  (13, 'Main Campus Health', 'MCH-01', 5, true),
  (14, 'East Medical Center', 'EMC-01', 7, true),
  (15, 'East Specialty Clinic', 'ESC-01', 7, true),
  (16, 'Retired South Clinic', 'RSC-01', 9, false);

INSERT INTO users (id, email, password_hash, is_active) VALUES
  (1, 'admin@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (2, 'region-west@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (3, 'area-north@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (4, 'district@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (5, 'campus@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (6, 'region-east@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (7, 'mixed-scope@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (8, 'pulse-only@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (9, 'survey-only@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (10, 'permissions-manager@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (11, 'no-permissions@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (12, 'inactive-grant@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', true),
  (13, 'inactive-user@totale.com', '$2b$04$z1WGGx/8JDeoVQ77QAb0H.AToxfaeyoe7LXkDm2dKk9b/0gSibgDO', false);

INSERT INTO user_permissions (
  user_id,
  organization_id,
  facility_id,
  can_view_analytics,
  can_view_pulse,
  can_view_survey,
  can_export_analytics,
  can_manage_permissions,
  is_active
) VALUES
  (1, 1, NULL, true, true, true, true, true, true),
  (2, 2, NULL, true, true, true, true, false, true),
  (3, 3, NULL, true, true, true, false, false, true),
  (4, 4, NULL, true, true, true, false, false, true),
  (5, 5, NULL, true, true, true, false, false, true),
  (6, 6, NULL, true, true, true, false, false, true),
  (6, NULL, 13, true, false, true, false, false, true),
  (7, 2, NULL, true, true, true, false, false, true),
  (7, NULL, 14, true, true, true, false, false, true),
  (7, NULL, 15, true, true, true, false, false, true),
  (8, 2, NULL, true, true, false, false, false, true),
  (9, 7, NULL, true, false, true, true, false, true),
  (10, NULL, 13, true, true, true, false, false, true),
  (12, 6, NULL, true, true, true, true, false, false),
  (13, 1, NULL, true, true, true, true, false, true);

INSERT INTO pulses (facility_id, score, category, created_at) VALUES
  (10, 8, 'Engagement', NOW() - INTERVAL '6 days'),
  (10, 6, 'Wellbeing', NOW() - INTERVAL '5 days'),
  (10, 9, 'Engagement', NOW() - INTERVAL '3 days'),
  (11, 7, 'Safety', NOW() - INTERVAL '5 days'),
  (11, 5, 'Wellbeing', NOW() - INTERVAL '2 days'),
  (11, 8, 'Safety', NOW() - INTERVAL '1 day'),
  (12, 7, 'Engagement', NOW() - INTERVAL '4 days'),
  (12, 5, 'Safety', NOW() - INTERVAL '3 days'),
  (13, 9, 'Wellbeing', NOW() - INTERVAL '5 days'),
  (13, 8, 'Engagement', NOW() - INTERVAL '2 days'),
  (14, 6, 'Safety', NOW() - INTERVAL '3 days'),
  (14, 7, 'Wellbeing', NOW() - INTERVAL '1 day'),
  (15, 8, 'Engagement', NOW() - INTERVAL '4 days'),
  (15, 6, 'Safety', NOW() - INTERVAL '2 days');

INSERT INTO surveys (facility_id, survey_type, answers, created_at) VALUES
  (10, 'annual', '{"q1":"yes","q2":"somewhat"}'::jsonb, NOW() - INTERVAL '6 days'),
  (10, 'quarterly', '{"q1":"no"}'::jsonb, NOW() - INTERVAL '2 days'),
  (11, 'annual', '{"q1":"yes"}'::jsonb, NOW() - INTERVAL '4 days'),
  (11, 'quarterly', '{"q1":"yes","q2":"very"}'::jsonb, NOW() - INTERVAL '1 day'),
  (12, 'annual', '{"q1":"yes"}'::jsonb, NOW() - INTERVAL '4 days'),
  (13, 'quarterly', '{"q1":"yes","q2":"very"}'::jsonb, NOW() - INTERVAL '3 days'),
  (14, 'annual', '{"q1":"no","q2":"somewhat"}'::jsonb, NOW() - INTERVAL '2 days'),
  (15, 'quarterly', '{"q1":"yes","q2":"somewhat"}'::jsonb, NOW() - INTERVAL '3 days'),
  (15, 'annual', '{"q1":"yes","q2":"very"}'::jsonb, NOW() - INTERVAL '1 day');
