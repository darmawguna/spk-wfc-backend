# admin-auth

## ADDED Requirements

### Requirement: Admin user storage
The system MUST persist admin accounts in an `admins` table with columns `{ id, email, passwordHash, nama, createdAt, updatedAt }`. Email is unique and case-insensitive. Passwords are stored as bcrypt hashes with cost factor `12`; plaintext passwords are never written to the database or logs.

#### Scenario: Seed admin exists
- **WHEN** the seed script runs
- **THEN** exactly one admin row exists with email `admin@spk.local` and a bcrypt hash of `admin123`, flagged in the README as requiring password change before any real deployment

#### Scenario: Duplicate email rejected
- **WHEN** a second admin is created with an email that already exists (case-insensitive)
- **THEN** the endpoint returns `409` with `message: "Email sudah digunakan"`

### Requirement: Login endpoint
The system MUST expose `POST /api/auth/login` accepting `{ email, password }` and returning a signed JWT on success.

#### Scenario: Valid credentials
- **WHEN** the request supplies an existing email and the correct password
- **THEN** the endpoint returns `200` with `{ token, admin: { id, email, nama }, expiresAt }`

#### Scenario: Invalid credentials
- **WHEN** the email is unknown or the password does not match the stored hash
- **THEN** the endpoint returns `401` with `message: "Email atau password salah"` and the response time is constant within ±50 ms regardless of which field is wrong

#### Scenario: Malformed body
- **WHEN** the request body is missing `email` or `password`
- **THEN** the endpoint returns `422` with field-level errors

### Requirement: JWT verification middleware
The system MUST mount a `requireAdmin` middleware on every write route (POST, PUT, DELETE under `/api/cafes`, `/api/criterias`, `/api/values`, `/api/waspas/calculate`). The middleware reads the `Authorization: Bearer <token>` header, verifies the JWT signature and expiry using a server-side secret from `process.env.JWT_SECRET`, and attaches `req.admin = { id, email }` on success.

#### Scenario: Valid token
- **WHEN** a write request carries a valid, non-expired JWT
- **THEN** the middleware passes through and the route handler runs

#### Scenario: Missing token
- **WHEN** a write request has no `Authorization` header
- **THEN** the middleware returns `401` with `message: "Token tidak ditemukan"`

#### Scenario: Expired token
- **WHEN** a write request carries a JWT whose `exp` claim is in the past
- **THEN** the middleware returns `401` with `message: "Token kedaluwarsa"`

#### Scenario: Invalid signature
- **WHEN** a write request carries a JWT signed with a different secret
- **THEN** the middleware returns `401` with `message: "Token tidak valid"`

### Requirement: Read endpoints stay public
The system MUST NOT require authentication on any GET endpoint under `/api/cafes`, `/api/criterias`, `/api/values`, `/api/waspas/results`, `/api/waspas/results/:cafe_id`, or `/api/waspas/recommendation`. The user-facing pages rely on these endpoints rendering without a login flow.

#### Scenario: Unauthenticated GET succeeds
- **WHEN** a client issues `GET /api/cafes` without any `Authorization` header
- **THEN** the endpoint returns `200` with the cafe list

### Requirement: Token expiry
The system MUST issue JWTs with an `exp` claim set to 8 hours after issuance. Tokens past their expiry MUST be rejected even if their signature is otherwise valid.

#### Scenario: Token issued now
- **WHEN** `POST /api/auth/login` returns a token
- **THEN** the token's `exp` claim is exactly `now + 8h` and `expiresAt` in the response body matches that ISO timestamp

#### Scenario: Token after 9 hours
- **WHEN** a token issued 9 hours ago is presented to a protected route
- **THEN** the middleware returns `401` with `message: "Token kedaluwarsa"`

### Requirement: Password change endpoint
The system MUST expose `POST /api/auth/password` (authenticated) accepting `{ oldPassword, newPassword }` and updating the caller's password hash.

#### Scenario: Correct old password
- **WHEN** the request supplies the current password and a new password of at least 8 characters
- **THEN** the endpoint returns `200` and the admin's next login must use the new password

#### Scenario: Wrong old password
- **WHEN** `oldPassword` does not match the stored hash
- **THEN** the endpoint returns `401` with `message: "Password lama salah"`

#### Scenario: Weak new password
- **WHEN** `newPassword` is shorter than 8 characters
- **THEN** the endpoint returns `422` with `errors.newPassword: ["min 8 characters"]`