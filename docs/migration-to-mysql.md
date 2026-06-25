# Migrasi ke MySQL

## Prasyarat

1. MySQL 8.0+ terinstal dan running
2. Database `spk_waspas` sudah dibuat
3. User MySQL dengan akses penuh ke database tersebut

## Langkah-langkah

### 1. Install Driver MySQL

```bash
cd backend-spk
npm install @prisma/client mysql2
npm install -D prisma
npx prisma generate
```

### 2. Update `.env`

```env
# Ganti DATABASE_URL
DATABASE_URL="mysql://user:password@localhost:3306/spk_waspas"
```

### 3. Update `prisma/schema.prisma`

Ganti provider dari `sqlite` ke `mysql`:

```diff
 datasource db {
-  provider = "sqlite"
+  provider = "mysql"
   url      = env("DATABASE_URL")
 }
```

### 4. Perubahan Model

MySQL membutuhkan `@db.Text` untuk kolom `linkMaps` dan `photo` yang nullable.

Opsi A — gunakan `String?` biasa (varchar(191) default):

```prisma
model Cafe {
  id       Int     @id @default(autoincrement())
  kode     String  @unique @db.VarChar(10)
  nama     String  @db.VarChar(200)
  alamat   String  @db.Text
  linkMaps String? @db.VarChar(500)
  photo    String? @db.VarChar(500)
  ...
}

model Admin {
  ...
  email        String @unique @db.VarChar(255)
  passwordHash String @db.VarChar(255)
  nama         String @db.VarChar(200)
}
```

Opsi B — gunakan `@db.Text` untuk fleksibilitas:

```prisma
model Cafe {
  ...
  linkMaps String?
  photo    String?
}
```

### 5. Generate Migration

```bash
npx prisma migrate dev --name init-mysql
```

### 6. Seed

```bash
npm run db:seed
```

## Perbedaan dengan SQLite

| Aspek          | SQLite                          | MySQL                         |
|----------------|---------------------------------|-------------------------------|
| Provider       | `sqlite`                        | `mysql`                      |
| URL            | `file:./dev.db`                 | `mysql://user:pass@host/db`  |
| @db.*          | Tidak perlu                     | Perlu untuk tipe spesifik     |
| Case-sensitive | Case-insensitive (by default)   | Case-sensitive (Linux)        |
| Auto-increment | `@default(autoincrement())`     | Sama                         |
| Unique         | `@unique`                       | Sama                         |

## Rollback

Untuk kembali ke SQLite:

```bash
# Kembalikan provider ke sqlite
git checkout prisma/schema.prisma

# Kembalikan .env
git checkout .env

# Hapus migration MySQL
rm -rf prisma/migrations

# Generate ulang + migrate
npx prisma migrate dev --name init
npm run db:seed
```
