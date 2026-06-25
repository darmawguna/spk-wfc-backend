import "dotenv/config";

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return val;
}

export const DATABASE_URL = requireEnv("DATABASE_URL");
export const PORT = parseInt(process.env["PORT"] ?? "3001", 10);
export const CORS_ORIGIN = process.env["CORS_ORIGIN"] ?? "http://localhost:5173";
export const JWT_SECRET = process.env["JWT_SECRET"] ?? "change-me-in-production-min-32-chars";
export const JWT_EXPIRES_IN = process.env["JWT_EXPIRES_IN"] ?? "8h";

if (JWT_SECRET.length < 32) {
  throw new Error(
    `JWT_SECRET must be at least 32 characters (got ${JWT_SECRET.length}). ` +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
  );
}
