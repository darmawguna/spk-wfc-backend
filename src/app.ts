import express from "express";
import cors from "cors";
import { CORS_ORIGIN } from "./lib/env.js";
import { errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import cafeRoutes from "./routes/cafes.js";
import criteriaRoutes from "./routes/criterias.js";
import valueRoutes from "./routes/values.js";
import waspasRoutes from "./routes/waspas.js";

const app = express();

app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Health
app.get("/health", (_req, res) => {
  res.json({ success: true, message: "OK", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/cafes", cafeRoutes);
app.use("/api/criterias", criteriaRoutes);
app.use("/api/values", valueRoutes);
app.use("/api/waspas", waspasRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
