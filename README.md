# TotalE Backend Case Study

## Purpose

This backend serves analytics data for the TotalE dashboard.

The main security goal is:

**a user must only see data for the facilities they are allowed to access**

For local installation, database seeding, and API testing steps, see [SETUP.md](SETUP.md).

---

## 1. Design Overview

### The Problem

If analytics endpoints are not properly filtered, a user may accidentally or intentionally see data outside their allowed scope.

This can happen when:
- a client sends manipulated `facilityIds`
- a client removes filters from the request
- one endpoint applies authorization correctly but another endpoint does not

That creates two risks:
- **security risk**: users can see data they should not see
- **data integrity risk**: the UI may show one scope while the backend returns a wider scope

### The Core Idea

The backend does **not trust the client** to decide which facilities are allowed.

Instead, the backend:
1. authenticates the user
2. looks up the user’s permission scope in the database
3. converts that scope into a list of allowed facilities
4. forces every analytics query to use only those facilities

### How To Think About The Scope

Think of the company as a tree:

- Company
- Region
- Area
- District
- Campus
- Facility

If a person is allowed to see one Region, they are also allowed to see the Areas, Districts, Campuses, and Facilities under that Region.

The backend works out that list automatically.

So even if a user tries to ask for more data, the backend still only returns data for the facilities under their assigned branch.

### Request Flow

```text
User logs in
  ->
Backend verifies email and password
  ->
Backend gives JWT token
  ->
User calls analytics endpoint with token
  ->
Backend validates token
  ->
Backend finds user's org permissions
  ->
Backend resolves allowed facilities
  ->
Backend runs query only for those facilities
  ->
User receives only authorized data
```

### Main Components

| Component | Responsibility |
|---|---|
| `AuthService` | Checks email/password and issues JWT |
| `JwtAuthGuard` | Rejects requests with missing or invalid token |
| `FacilityScopeGuard` | Loads the user’s allowed facility scope for the request |
| `FacilityScopeService` | Resolves user permissions into actual facility IDs |
| `FacilityContext` | Holds the authorized facilities for one request |
| `FacilityScopedBuilder` | Forces analytics queries to use only authorized facilities |
| `AnalyticsService` | Runs pulse, survey, and export queries |
| `FacilityService` | Returns only authorized facilities in the dropdown |

---

## 2. How Facility Access Is Determined

### Permission Model

The system uses:
- an **additive** permission model
- a **hierarchical** organization structure

Additive means:
- only allow rules exist
- every permission adds access
- there are no deny rules

### Hierarchy Levels

```text
Level 0: Company
Level 1: Region
Level 2: Area
Level 3: District
Level 4: Campus
Level 5: Facility
```

### How Access Is Calculated

Each user has one or more permission rows in `user_permissions`.

Each permission points to an org node in `org_nodes`.

The backend then walks downward through the org tree and collects all facilities under those nodes.

Example:
- if a user is assigned to `West Region`, they can see all facilities under that region
- if a user is assigned to `Main Campus`, they can only see that campus facility

### Why This Is Secure

The client never sends “final authority.”

The client may send filters, but the backend still calculates the real allowed facilities from server-side permission data.

That means access is based on:
- stored user identity
- stored org permissions
- stored org hierarchy

not on browser input.

---

## 3. Implementation Approach

### Step 1: Authentication

The user logs in through:

- `POST /auth/login`

The backend:
- finds the user by email
- checks the plain password against the stored bcrypt hash
- returns a JWT token if valid

Protected endpoints then require:

```http
Authorization: Bearer <token>
```

If the token is missing, invalid, expired, or belongs to an inactive user, access is rejected before analytics logic runs.

### Step 2: Resolve Authorized Facilities

After the JWT is accepted, `FacilityScopeGuard` runs.

It asks `FacilityScopeService` to compute the facilities the current user is allowed to access.

That service:
- loads active permission rows for the user
- starts from the assigned org nodes
- walks downward through child nodes
- finds the matching active facilities
- stores the result in `FacilityContext`

This result is cached briefly for performance.

### Step 3: Apply Scope To Every Analytics Query

All analytics methods receive the `FacilityContext`.

Before a query runs, `FacilityScopedBuilder` injects the authorized facility filter into the query.

So the final query always includes the facility restriction from the backend.

### Step 4: Allow Narrowing, But Not Expansion

The client can still ask for a subset of facilities using `facilityIds`.

But the backend only uses the **intersection**:

- requested facilities
- authorized facilities

So the client can reduce results, but cannot increase them.

---

## 4. How The System Prevents Unauthorized Access

This is the most important part of the solution.

### A. Invalid or Missing Login

If a user does not log in successfully, they do not get a token.

Without a valid token, protected analytics routes are rejected.

### B. Invalid or Expired Token

If a token is invalid or expired, `JwtAuthGuard` blocks the request.

That means the request never reaches analytics data access.

### C. Manipulated Query Parameters

A user may try to send:
- facility IDs outside their scope
- no facility filter at all
- crafted requests through another client

This still does not bypass authorization, because the backend always applies the server-side authorized facility list first.

### D. Missing Client Filters

If the client sends no `facilityIds`, the backend does **not** return all database rows.

Instead, it returns only the facilities already authorized for that user.

### E. Empty Scope

If a user has no active facility permissions, the system returns an empty result.

It does not “fail open.”

### F. Consistent Enforcement Across Endpoints

The same authorization pattern is used across:
- facility dropdown
- pulse analytics
- survey analytics
- export

This is important because partial enforcement is a common source of data leakage.

---

## 5. Security Considerations

### Main Security Strengths

The current design is secure because:

1. authorization is based on server-side permission data
2. the JWT only identifies the user, it does not define their full scope
3. facility access is recalculated from database permissions
4. query-level filtering is enforced before data is returned
5. client filters can only narrow access, not expand it
6. users with no scope get no data

### Failure Scenarios Considered

| Scenario | Risk | Current Protection |
|---|---|---|
| User sends fake facility IDs | Tries to access extra facilities | Backend intersects with authorized facilities only |
| User omits filters | Tries to get broad data | Backend still applies authorized facility scope |
| User uses alternate client/tool | Tries to bypass UI restrictions | Backend enforcement still applies |
| Invalid JWT | Fake identity | JWT validation blocks request |
| Inactive user | Old or disabled account still used | User lookup checks active status |
| No permissions | User sees everything by mistake | Empty scope returns empty results |

### Important Security Principle

The UI can help with usability, but the UI is **not** the security boundary.

The backend is the security boundary.

That is why facility scoping is enforced inside the backend request lifecycle and query construction.

---

## 6. Test Strategy

### What Should Be Tested

The system should be tested at two levels:
- unit tests
- integration tests

### Unit Tests

Key unit test areas:
- valid login returns JWT
- wrong password is rejected
- invalid user is rejected
- permission resolution returns correct facilities
- overlapping org permissions are handled correctly
- query builder always applies authorized facility filtering
- client facility filters cannot expand access

### Integration Tests

Key integration scenarios:
- login works for seeded users
- analytics endpoints reject missing token
- region-scoped user only sees region facilities
- campus-scoped user only sees campus facility
- east-region user cannot see west-region data
- exports follow the same scope as analytics views
- facility dropdown only returns allowed facilities

### Important Edge Cases

- user has no permissions
- user has multiple permission grants
- user has parent and child grants together
- user requests unauthorized facility IDs
- facility is inactive
- permission changes after caching

---

## 7. Tradeoffs

### Current Tradeoffs

#### 1. Cached Scope

The system caches resolved facility scope briefly for performance.

Tradeoff:
- faster repeated requests
- slight delay before permission changes are reflected

#### 2. Additive Model Only

The current model supports allow rules only.

Tradeoff:
- simpler logic
- no built-in deny overrides

#### 3. Query-Level Enforcement In Application Code

The current design enforces access in backend code instead of database row-level security.

Tradeoff:
- easier to read and implement in the application
- still depends on developers consistently using the shared query path

---

## 8. Why An Unauthorized Person Does Not Get Data

In simple terms:

- they cannot access analytics without a valid login
- they cannot use a bad or expired token
- they cannot expand access by sending extra facility IDs
- they cannot remove filters to get broader data
- they cannot use another endpoint to escape scope, because scope is applied across the analytics backend

So the current system is designed to **fail safely**:

if authorization is missing or empty, the user gets no data, not extra data.

---

## 9. Final Summary

The current system secures analytics access by combining:

- login-based authentication
- JWT verification
- server-side permission resolution
- hierarchy-aware facility scoping
- query-level enforcement

This means the backend, not the browser, decides what data a user can access.

That is how the system protects against unauthorized access and keeps analytics data limited to the right facilities.
