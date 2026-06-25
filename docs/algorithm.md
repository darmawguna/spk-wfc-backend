# Algoritma WASPAS

*Weighted Aggregated Sum Product Assessment* (WASPAS) adalah metode pengambilan keputusan multikriteria yang menggabungkan **Weighted Sum Model (WSM)** dan **Weighted Product Model (WPM)**.

## Langkah-langkah

### 1. Matriks Keputusan

Bentuk matriks `X` berukuran `m × n`, dimana:

- `m` = jumlah alternatif (cafe)
- `n` = jumlah kriteria

|     | K1 (Internet) | K2 (Stop Kontak) | K3 (Jarak) | K4 (Harga) | K5 (Jam) | K6 (Fasilitas) |
|-----|--------------|-----------------|-----------|-----------|---------|---------------|
| A1  | 104.21       | 13              | 0.55      | 12000     | 15      | 2             |
| A2  | 20.23        | 1               | 0.75      | 6000      | 13.5    | 3             |
| ... | ...          | ...             | ...       | ...       | ...     | ...           |
| A10 | 96.38        | 31              | 0.12      | 20000     | 15      | 2             |

### 2. Normalisasi Matriks

Setiap nilai dinormalisasi berdasarkan jenis kriteria:

**Benefit** (semakin besar semakin baik):
```
x̄ᵢⱼ = xᵢⱼ / max(xⱼ)
```

**Cost** (semakin kecil semakin baik):
```
x̄ᵢⱼ = min(xⱼ) / xᵢⱼ
```

#### Contoh: K1 (Internet, benefit)
- Max K1 = 104.21 (milik A1)
- A10: 96.38 / 104.21 = 0.9249
- A1: 104.21 / 104.21 = 1.0000

#### Contoh: K3 (Jarak, cost)
- Min K3 = 0.12 (milik A10)
- A1: 0.12 / 0.55 = 0.2182
- A10: 0.12 / 0.12 = 1.0000

### 3. Weighted Sum Model (WSM)

```
WSMᵢ = Σⱼ (x̄ᵢⱼ × wⱼ)
```

Dimana `wⱼ` adalah bobot kriteria (total = 1.0).

#### Contoh A10:
```
WSM = (0.9249 × 0.30) + (1.0000 × 0.20) + (1.0000 × 0.15)
    + (0.2500 × 0.15) + (0.8824 × 0.10) + (0.4000 × 0.10)
    = 0.7932
```

### 4. Weighted Product Model (WPM)

```
WPMᵢ = Πⱼ (x̄ᵢⱼ)^wⱼ
```

#### Contoh A10:
```
WPM = (0.9249)^0.30 × (1.0000)^0.20 × (1.0000)^0.15
    × (0.2500)^0.15 × (0.8824)^0.10 × (0.4000)^0.10
    = 0.7150
```

### 5. Nilai Qi (Agregasi)

```
Qᵢ = λ × WSMᵢ + (1 - λ) × WPMᵢ
```

Dimana `λ = 0.5` (default — sama penting antara WSM dan WPM).

#### Contoh A10:
```
Q = 0.5 × 0.7932 + 0.5 × 0.7150
  = 0.7541
```

### 6. Perangkingan

Alternatif diurutkan berdasarkan `Qᵢ` descending. Jika ada nilai Qi yang sama, digunakan tiebreak berdasarkan kode ascending.

## Hasil Referensi (PRD Section 4)

| Ranking | Kode | Qi      | WSM     | WPM     |
|---------|------|---------|---------|---------|
| 1       | A10  | 0.7541  | 0.7932  | 0.7150  |
| 2       | A1   | 0.5679  | 0.6132  | 0.5226  |
| 3       | A6   | 0.5453  | 0.5993  | 0.4913  |
| 4       | A4   | 0.4950  | 0.5387  | 0.4512  |
| 5       | A3   | 0.4409  | 0.5096  | 0.3722  |
| 6       | A9   | 0.4054  | 0.4553  | 0.3555  |
| 7       | A8   | 0.3311  | 0.3585  | 0.3038  |
| 8       | A7   | 0.2980  | 0.3018  | 0.2942  |
| 9       | A2   | 0.2822  | 0.3309  | 0.2334  |
| 10      | A5   | 0.2301  | 0.2319  | 0.2282  |

## Implementasi

File: `src/engine/waspas.ts`

```typescript
function calculate(input: EngineInput): EngineOutput
```

Pure function tanpa I/O — input data alternatif, kriteria, nilai, dan lambda; output hasil perhitungan + ranking + keunggulan.

## Toleransi

Semua perbandingan numerik menggunakan toleransi `±0.0001` untuk mengakomodasi floating point.

## Catatan Deviasi (D13)

Backend menggunakan presisi penuh (`float64`) untuk normalisasi (per BR-03). Hasil ini menghasilkan **deviasi ≤ 0.0004** dari tabel referensi PRD untuk beberapa alternatif, namun **perangkingan identik** dengan PRD untuk seluruh 10 cafe. Deviasi ini terjadi karena PRD membulatkan nilai normalisasi ke 4 desimal di tiap langkah, sedangkan engine mempertahankan presisi penuh. Top-1 tetap A10 dengan Qi = 0.7541 (deviasi 0.000021).
