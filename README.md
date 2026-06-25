# SPK WASPAS — Backend API

Sistem Pendukung Keputusan WASPAS untuk pemilihan cafe Work From Cafe.

**Tech Stack:** Express 5, TypeScript (strict), Prisma ORM (SQLite), Zod validation, JWT auth, bcryptjs.

## Quick Start

```bash
npm install
cp .env.example .env
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Server starts at `http://localhost:3001`.

## Default Admin

| Field    | Value              |
| -------- | ------------------ |
| Email    | admin@spk.local    |
| Password | admin123           |

## Scripts

| Script                | Description                                      |
| --------------------- | ------------------------------------------------ |
| `npm run dev`         | Start dev server with hot reload (tsx watch)     |
| `npm run build`       | Compile TypeScript ke dist/                      |
| `npm start`           | Start production server dari dist/                |
| `npm test`            | Jalankan semua test (vitest)                     |
| `npm run smoke`       | Smoke test: seed + hit API + verifikasi A10     |
| `npm run check-reference` | Verifikasi engine output vs PRD reference   |
| `npm run db:migrate`  | Jalankan Prisma migration                        |
| `npm run db:seed`     | Seed database dengan data default                |
| `npm run db:reset`    | Reset DB (drop + migrate + seed)                 |

## Test

```bash
npm test        # 47 tests (17 engine + 30 integration)
npm run smoke   # End-to-end: server + DB + calculate + verify A10=0.7541
npm run check-reference  # Engine-only: verify all 10 reference rows
```

## API Endpoints

### Health Check

```
GET /health
```

**Response (200):**
```json
{ "status": "ok" }
```

---

### Auth

#### POST /api/auth/login

Login admin — tidak perlu token.

**Request:**
```json
{
  "email": "admin@spk.local",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "admin": { "id": 1, "email": "admin@spk.local", "nama": "Admin SPK" },
  "expiresAt": "2026-06-24T21:00:00.000Z"
}
```

**Response (401):**
```json
{ "success": false, "message": "Email atau password salah" }
```

**Response (422 — validasi):**
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": [{ "path": "email", "message": "Email tidak valid" }]
}
```

#### POST /api/auth/password

Ganti password — perlu token.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "oldPassword": "admin123",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{ "success": true, "message": "Password berhasil diubah" }
```

**Response (422):**
```json
{
  "success": false,
  "message": "Validasi gagal",
  "errors": [{ "path": "newPassword", "message": "Password baru minimal 6 karakter" }]
}
```

---

### Cafes

#### GET /api/cafes

List semua cafe — publik, tanpa token.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "kode": "A1",
      "nama": "Sanchi House",
      "alamat": "Jl. Ahmad Yani No. 45",
      "linkMaps": "https://maps.google.com/?q=Sanchi+House",
      "photo": null,
      "createdAt": "2026-06-24T12:00:00.000Z",
      "updatedAt": "2026-06-24T12:00:00.000Z"
    }
  ]
}
```

#### POST /api/cafes

Buat cafe baru — perlu token.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "kode": "A11",
  "nama": "Kafe Baru",
  "alamat": "Jl. Merdeka No. 1",
  "linkMaps": "https://maps.google.com/?q=Kafe+Baru",
  "photo": null
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": 11,
    "kode": "A11",
    "nama": "Kafe Baru",
    "alamat": "Jl. Merdeka No. 1",
    "linkMaps": "https://maps.google.com/?q=Kafe+Baru",
    "photo": null,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

#### PUT /api/cafes/:id

Update cafe — perlu token.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{ "nama": "Sanchi House Updated" }
```

**Response (200):**
```json
{ "success": true, "data": { "id": 1, "nama": "Sanchi House Updated", ... } }
```

#### DELETE /api/cafes/:id

Hapus cafe (cascade ke alternative_values dan waspas_results) — perlu token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "success": true, "message": "Cafe berhasil dihapus" }
```

---

### Criterias

#### GET /api/criterias

List semua kriteria (urutan ascending) — publik.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "kode": "K1",
      "nama": "Kecepatan Internet",
      "jenis": "benefit",
      "satuan": "Mbps",
      "bobot": 0.30,
      "urutan": 1,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

#### POST /api/criterias

Buat kriteria baru. Bobot baru + total bobot existing harus == 1 — perlu token.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "kode": "K7",
  "nama": "Kenyamanan Kursi",
  "jenis": "benefit",
  "satuan": "poin",
  "bobot": 0.10,
  "urutan": 7
}
```

**Response (201) / (422 jika bobot sum != 1):**
```json
{ "success": false, "message": "Total bobot harus 1. Saat ini 0.90 + 0.10 = 1.10" }
```

#### PUT /api/criterias/:id

Update kriteria. Jika mengubah `bobot`, total bobot tetap harus == 1 — perlu token.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{ "bobot": 0.25 }
```

**Response (200) / (422 jika bobot sum != 1).**

#### DELETE /api/criterias/:id

Hapus kriteria. Gagal (409) jika masih ada alternative_values yang mereferensi.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "success": true, "message": "Kriteria berhasil dihapus" }
```

**Response (409):**
```json
{ "success": false, "message": "Kriteria masih memiliki data nilai alternatif" }
```

---

### Values

#### GET /api/values

List semua nilai alternatif (dengan relasi cafe + criteria) — publik.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cafeId": 1,
      "criteriaId": 1,
      "nilai": 104.21,
      "cafe": { "id": 1, "kode": "A1", "nama": "Sanchi House" },
      "criteria": { "id": 1, "kode": "K1", "nama": "Kecepatan Internet", "satuan": "Mbps" }
    }
  ]
}
```

#### POST /api/values

Upsert (update jika sudah ada) satu nilai alternatif — perlu token.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "cafeId": 1,
  "criteriaId": 1,
  "nilai": 110
}
```

**Response (201):**
```json
{
  "success": true,
  "data": { "id": 1, "cafeId": 1, "criteriaId": 1, "nilai": 110 }
}
```

#### POST /api/values/batch

Batch upsert — perlu token. Semua upsert dalam satu transaksi.

**Headers:** `Authorization: Bearer <token>`

**Request:**
```json
{
  "values": [
    { "cafeId": 1, "criteriaId": 1, "nilai": 110 },
    { "cafeId": 1, "criteriaId": 2, "nilai": 15 }
  ]
}
```

**Response (200):**
```json
{ "success": true, "data": [{ "cafeId": 1, "criteriaId": 1, "nilai": 110 }, ...] }
```

---

### WASPAS

#### POST /api/waspas/calculate

Jalankan perhitungan WASPAS penuh: normalisasi → WSM → WPM → Qi → ranking → keunggulan — perlu token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "results": [
    {
      "id": 10,
      "cafeId": 10,
      "ranking": 1,
      "wsm": 0.7932,
      "wpm": 0.7150,
      "qi": 0.7541,
      "cafe": { "id": 10, "kode": "A10", "nama": "Tomoro Coffee" }
    }
  ],
  "keunggulan": [
    "Kecepatan Internet (96.38 Mbps)",
    "Jumlah Stop Kontak (31 unit)",
    "Jarak dari Kampus (0.12 km)"
  ]
}
```

#### GET /api/waspas/results

Dapatkan semua hasil perhitungan (sorted by ranking) — publik.

**Response (200):** Sama seperti `results` di atas.

#### GET /api/waspas/results/:cafe_id

Dapatkan hasil untuk satu cafe — publik.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 10,
    "cafeId": 10,
    "ranking": 1,
    "wsm": 0.7932,
    "wpm": 0.7150,
    "qi": 0.7541,
    "cafe": { "id": 10, "kode": "A10", "nama": "Tomoro Coffee" }
  }
}
```

#### GET /api/waspas/recommendation

Dapatkan rekomendasi #1 (ranking 1) — publik.

**Response (200):** Sama seperti `data` di atas.

**Response (404):**
```json
{ "success": false, "message": "Belum ada hasil perhitungan" }
```

## Contoh Curl Lengkap

```bash
# 1. Login
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spk.local","password":"admin123"}' | jq .

# 2. Simpan token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@spk.local","password":"admin123"}' | jq -r .token)

# 3. List cafes (publik)
curl -s http://localhost:3001/api/cafes | jq .

# 4. List kriteria (publik)
curl -s http://localhost:3001/api/criterias | jq .

# 5. Lihat data nilai (publik)
curl -s http://localhost:3001/api/values | jq .

# 6. Hitung WASPAS (perlu token)
curl -s -X POST http://localhost:3001/api/waspas/calculate \
  -H "Authorization: Bearer $TOKEN" | jq .

# 7. Lihat hasil ranking (publik)
curl -s http://localhost:3001/api/waspas/results | jq .

# 8. Lihat rekomendasi #1 (publik)
curl -s http://localhost:3001/api/waspas/recommendation | jq .
```

## Arsitektur

```
src/
├── app.ts                    # Express app (middleware + routes)
├── server.ts                 # Entry point (listen)
├── lib/
│   ├── prisma.ts             # Prisma client singleton
│   └── env.ts                # Env validation (JWT_SECRET min 32 chars)
├── middleware/
│   ├── validate.ts           # Zod validation middleware
│   ├── error.ts              # Error handler → { success, message, errors? }
│   └── requireAdmin.ts       # JWT bearer token guard
├── repositories/             # Data access layer (Prisma queries)
│   ├── adminRepository.ts
│   ├── cafeRepository.ts
│   ├── criteriaRepository.ts
│   ├── valueRepository.ts
│   └── waspasRepository.ts
├── services/                 # Business logic
│   ├── authService.ts        # Login + change password (bcrypt constant-time)
│   ├── bobotValidator.ts     # Bobot sum invariant
│   └── calculateService.ts   # Pre-flight + engine + persist
├── engine/                   # Pure calculation (no I/O)
│   ├── types.ts              # EngineInput, EngineOutput, dll
│   ├── waspas.ts             # calculate() + pickKeunggulan()
│   └── check-reference.ts    # Verifikasi terhadap PRD reference
├── routes/                   # Express route handlers
│   ├── auth.ts
│   ├── cafes.ts
│   ├── criterias.ts
│   ├── values.ts
│   └── waspas.ts
├── smoke.ts                  # End-to-end smoke test
└── __tests__/                # Integration tests (supertest)
    ├── auth.routes.test.ts
    ├── cafes.routes.test.ts
    ├── criterias.routes.test.ts
    ├── values.routes.test.ts
    └── waspas.routes.test.ts
```

## Environment Variables

| Variable         | Default                                  | Description               |
| ---------------- | ---------------------------------------- | ------------------------- |
| `DATABASE_URL`   | `file:./dev.db`                          | SQLite database path      |
| `PORT`           | `3001`                                   | Server port               |
| `CORS_ORIGIN`    | `http://localhost:5173`                   | Frontend origin for CORS  |
| `JWT_SECRET`     | `change-me-in-production-min-32-chars`    | Secret key (min 32 chars) |
| `JWT_EXPIRES_IN` | `8h`                                     | Token expiry duration     |

## Algoritma

Lihat [docs/algorithm.md](docs/algorithm.md) untuk penjelasan lengkap 5 langkah WASPAS + tabel referensi.

## Migrasi Database

Lihat [docs/migration-to-mysql.md](docs/migration-to-mysql.md) untuk migrasi dari SQLite ke MySQL.

## Frontend Integration

Lihat [docs/frontend-integration.md](docs/frontend-integration.md) untuk kontrak API, auth flow, dan konfigurasi `VITE_USE_LOCAL`.
