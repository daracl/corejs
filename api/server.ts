import express, { Request, Response, Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { items } from "./data/items";
import cors from 'cors';

const app: Express = express();

// Ensure upload directory exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// Set up multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// 모든 도메인 허용
app.use(cors());

// Middleware
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

/**
 * 요청 헤더를 그대로 응답 헤더로 설정
 */
function mirrorHeaders(req: Request, res: Response) {
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) res.setHeader(key, Array.isArray(value) ? value.join(", ") : value);
  }
}

// Routes
app.get("/api/items", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  res.json(items);
});

app.post("/api/items", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  const newItem = req.body;
  items.push(newItem);
  res.status(201).json(newItem);
});

app.put("/api/items/:index", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  const index = parseInt(req.params.index);
  if (items[index]) res.json((items[index] = req.body));
  else res.status(404).send("Item not found");
});

app.delete("/api/items/:index", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  const index = parseInt(req.params.index);
  if (items[index]) res.json(items.splice(index, 1));
  else res.status(404).send("Item not found");
});

app.post("/api/upload", upload.single("file"), (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  if (!req.file) return res.status(400).send("No file uploaded");
  res.status(201).json({ filePath: `/uploads/${req.file.filename}` });
});

export default app;
