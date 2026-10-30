import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : true,
  }),
);

app.get("/hello", (req, res) => {
  res.json({ message: "hello world" });
});

const PORT = process.env.SERVER_PORT || 8000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en puerto ${PORT}`);
});
