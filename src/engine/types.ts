/** Raw input from the database */
export interface EngineInput {
  /** Lambda weighting factor (typically 0.5) */
  lambda: number;
  /** Cafes with their ids and kode */
  cafes: { id: number; kode: string }[];
  /** Criteria definitions */
  criterias: {
    id: number;
    nama: string;
    jenis: "benefit" | "cost";
    satuan: string | null;
    bobot: number;
    urutan: number;
  }[];
  /** Alternative values: [cafeId][criteriaId] = raw value */
  values: Record<number, Record<number, number>>;
}

export interface AlternativeResult {
  cafeId: number;
  kode: string;
  wsm: number;
  wpm: number;
  qi: number;
  ranking: number;
}

export interface NormalizedRow {
  cafeId: number;
  kode: string;
  normalized: Record<number, number>;
}

export interface EngineOutput {
  results: AlternativeResult[];
  normalized: NormalizedRow[];
  /** Keunggulan recommendations */
  keunggulan: string[];
}
