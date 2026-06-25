import "dotenv/config";
import { PORT } from "./lib/env.js";
import app from "./app.js";

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
