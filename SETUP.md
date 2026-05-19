# TotalE Backend Setup

This file covers local installation, database setup, seeded users, and end-to-end API testing.

## Prerequisites

Install the Nest CLI first:

```bash
npm install -g @nestjs/cli
```

## Install

```bash
npm install
```

## Seed Database

Run:

```bash
./db/setup.sh
```

This script:
- creates the database if needed
- creates tables
- seeds org nodes, facilities, users, permissions, and analytics data

## Start The App

If you are using the seeded SQL database, start with:

```bash
NODE_ENV=production npm run start:dev
```

This avoids TypeORM trying to auto-change the schema on startup.

## Seeded Users

All seeded users currently use:

```text
password123
```

Available users:
- `admin@totale.com`
- `region-west@totale.com`
- `area-north@totale.com`
- `district@totale.com`
- `campus@totale.com`
- `region-east@totale.com`

## Expected Access By User

- `admin@totale.com` can see all seeded facilities
- `region-west@totale.com` can see the West branch
- `area-north@totale.com` can see the North Area branch
- `district@totale.com` can see the Downtown District branch
- `campus@totale.com` can only see Main Campus Health
- `region-east@totale.com` can only see East Medical Center

## End-To-End Testing

### 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@totale.com",
    "password": "password123"
  }'
```

Copy the `accessToken` from the response.

### 2. Save The Token

```bash
export TOKEN="<paste-access-token>"
```

### 3. Get Facilities

```bash
curl http://localhost:3000/analytics/facilities \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Get Pulse Analytics

```bash
curl "http://localhost:3000/analytics/pulse?dateFrom=2024-01-01&dateTo=2099-12-31&granularity=day" \
  -H "Authorization: Bearer $TOKEN"
```

### 5. Get Survey Analytics

```bash
curl "http://localhost:3000/analytics/survey?dateFrom=2024-01-01&dateTo=2099-12-31&granularity=day" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Export Data

```bash
curl -X POST http://localhost:3000/analytics/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dateFrom": "2024-01-01",
    "dateTo": "2099-12-31",
    "dataType": "pulse"
  }'
```

## What To Check

- admin sees all facilities
- west region user sees only west facilities
- campus user sees only campus facility
- east region user does not see west data
- request without token returns unauthorized
- request with unauthorized facility IDs returns only allowed data or empty data
