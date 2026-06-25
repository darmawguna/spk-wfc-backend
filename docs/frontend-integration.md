# Frontend Integration Guide

Dokumen ini menjelaskan arsitektur integrasi frontend-backend dan kontrak API.

## 1. Arsitektur Dual-Mode

Frontend menggunakan **AppContext sebagai integration layer**. Pages tetap memanggil `useAppContext()` seperti biasa — context secara transparan switch antara:

- **Local mode** (`VITE_USE_LOCAL=true`): seed data in-memory + WASPAS compute client-side
- **API mode** (`VITE_USE_LOCAL=false`): fetch dari backend pada mount + semua mutations via API

Mode ditentukan saat AppContext mount. Tidak perlu refactor per page.

### File yang Terlibat

- `frontend-spk/src/lib/config.ts` — export `USE_LOCAL` dan `API_URL`
- `frontend-spk/src/lib/api.ts` — typed API helpers + `ApiError` class
- `frontend-spk/src/lib/storage.ts` — token session storage (`loadSession()`)
- `frontend-spk/src/app/context/AppContext.tsx` — dual-mode integration layer
- `frontend-spk/src/app/context/AuthContext.tsx` — login/logout state

## 2. Konfigurasi Environment

```bash
# frontend-spk/.env.local
VITE_USE_LOCAL=false
VITE_API_URL=http://localhost:3001/api
```

Default-nya `VITE_USE_LOCAL=true` agar frontend bisa jalan tanpa backend (untuk dev atau demo).

## 3. Auth Flow

### Login

`POST /api/auth/login` dengan `{ email, password }` → `{ success: true, data: { token, admin, expiresAt } }`.

Token disimpan di `localStorage` dengan key `spk_admin_session` (object JSON, bukan string).

### Protected Requests

Setiap POST/PUT/DELETE ke endpoint admin butuh header:
```
Authorization: Bearer <token>
```

AppContext auto-mengambil token dari `loadSession()` untuk setiap mutation.

## 4. Endpoint Contracts (Final Shape)

### GET /api/cafes

```json
{ "success": true, "data": [{ "id": 1, "kode": "A1", "nama": "...", "alamat": "...", "linkMaps": null, "photo": null }] }
```

### GET /api/criterias

```json
{ "success": true, "data": [{ "id": 1, "kode": "K1", "nama": "...", "jenis": "benefit", "satuan": "Mbps", "bobot": 0.30, "urutan": 1 }] }
```

### GET /api/values

```json
{
  "success": true,
  "data": [
    { "id": 1, "cafeId": 1, "criteriaId": 1, "nilai": 104.21, "cafe": { "id": 1, "kode": "A1", "nama": "..." }, "criteria": { "id": 1, "kode": "K1", "nama": "...", "satuan": "Mbps" } }
  ]
}
```

### POST /api/values

Body: `{ cafeId: number, criteriaId: number, nilai: number }`

### POST /api/values/batch

Body: `{ values: [{ cafeId, criteriaId, nilai }, ...] }` — minimal 1 item.

### PUT /api/criterias/:id

Body: `Partial<Kriteria>` (hanya field yang ingin diubah).

### PUT /api/criterias/bobot

Body: `{ weights: [{ id: number, bobot: number }, ...] }` — total semua weights harus = 1.0 ± 0.001. Endpoint ini digunakan oleh halaman DataBobot untuk atomic update.

### POST /api/waspas/calculate (admin)

Menghitung WASPAS dan menyimpan ke DB. Response:

```json
{
  "success": true,
  "data": {
    "results": [{ "cafeId": 10, "kode": "A10", "wsm": 0.7932, "wpm": 0.7150, "qi": 0.7541, "ranking": 1 }, ...],
    "keunggulan": ["Kecepatan Internet (96.38 Mbps)", ...]
  }
}
```

### GET /api/waspas/results

Mengambil hasil tersimpan.

```json
{
  "success": true,
  "data": {
    "calculated_at": "2026-06-24T15:32:02.860Z",
    "results": [{ "cafeId": 10, "ranking": 1, "wsm": 0.7932, "wpm": 0.7150, "qi": 0.7541, "cafe": { "id": 10, "kode": "A10", "nama": "..." } }, ...]
  }
}
```

### GET /api/waspas/recommendation

Mengambil top-1.

```json
{
  "success": true,
  "data": { "cafeId": 10, "cafe": { "id": 10, "kode": "A10", "nama": "...", "alamat": "...", "linkMaps": "..." }, "qi": 0.7541, "ranking": 1, "unggulan": [] }
}
```

## 5. Data Transformation

AppContext mengubah data dari format backend ke format internal frontend:

| Backend                              | Internal (Context)            | Notes                                |
|--------------------------------------|-------------------------------|--------------------------------------|
| `cafeId: number`                     | `cafeId: string`              | Normalized via `String()`            |
| `nilai: flat row`                    | `nilai: Record<criteriaId, n>`| Grouped per cafe                     |
| `cafe.nama` di waspasResult          | `cafe: { kode, nama }`        | Extra fields di-strip                |
| `linkMaps: string \| null`           | `linkMaps: string \| null`    | Sama                                 |

Pages menerima data dalam format internal — tidak perlu tahu apakah data dari local atau API.

## 6. ID Handling

Backend pakai `number` ID; frontend internal pakai `string` ID. Konversi di AppContext:
- List operations: `String(backend.id)` saat simpan
- Mutation operations: `Number(internalId)` saat panggil API
- Perbandingan di pages: `String(c.id) === String(result.cafeId)` (defensive)

## 7. Error Handling

Backend errors:
```json
{ "success": false, "message": "...", "errors": [...], "missing": [...] }
```

Frontend `ApiError` class extraction:
- `err.message` — user-friendly message (toast)
- `err.status` — HTTP status
- `err.missing` — untuk batch value validation (cafe × criteria belum dinilai)

Pages handle error dengan `try/catch` di handler. `AppContext` propagate error dari API call.

## 8. Loading & Refresh

AppContext:
- `loading: boolean` — true saat initial fetch atau refresh
- `apiError: string | null` — error message dari fetch terakhir
- `refreshData(): Promise<void>` — panggil ulang semua fetch (untuk pull-to-refresh atau setelah mutation)

Halaman admin dengan operations panjang (calculate, batch) bisa expose loading state lokal juga.

## 9. Testing

### Local mode (default)
```bash
cd frontend-spk && npm run dev
# Login via /login akan fallback ke local seed jika API unreachable
```

### API mode
```bash
# Terminal 1
cd backend-spk && npm run dev

# Terminal 2
echo "VITE_USE_LOCAL=false" > frontend-spk/.env.local
echo "VITE_API_URL=http://localhost:3001/api" >> frontend-spk/.env.local
cd frontend-spk && npm run dev
```

Login: `admin@spk.local` / `admin123`

## 10. Edge Cases & Tradeoffs

1. **Bobot sum validation**: Update bobot per-criteria (PUT /criterias/:id dengan `bobot`) menggunakan validator `excludeId` (exclude current criteria). Untuk update simultan (DataBobot), gunakan batch endpoint `PUT /criterias/bobot` agar atomic dan efisien.

2. **WASPAS calculate harus di-trigger manual**: Frontend tidak auto-calculate saat page load. User harus klik "Hitung" di halaman HitungWaspas. Ini sesuai PRD: perhitungan adalah explicit admin action.

3. **Initial empty state**: Saat AppContext mount di API mode, data fetched async — pages render dengan empty array dulu, lalu populate. Loading state di context untuk handle ini.

4. **Token expiry**: Backend token expired 12 jam. Frontend belum handle auto-refresh — jika API return 401, user harus login ulang.
