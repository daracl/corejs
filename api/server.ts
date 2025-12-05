import express, { Request, Response, Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { items } from "./data/items";
import cors from "cors";

const app: Express = express();

// Ensure upload directory exists
const uploadDir = "c:/zzz/uploads";
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
    if (value) {
      res.setHeader(key, Array.isArray(value) ? value.join(", ") : value as string);
    }
  }
}

// Routes
app.get("/api/list", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  res.json(items);
});

// Accept both JSON and multipart/form-data with optional file upload.
// If a file is uploaded (field name "file"), echo file info and form fields back.
app.post("/api/item", upload.single("file"), (req: Request, res: Response) => {
  mirrorHeaders(req, res);

  // If multipart FormData, fields are in req.body and file in req.file
  const formFields = req.body || {};

  if (req.file) {
    const fileInfo = {
      originalName: req.file.originalname,
      fileName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: `/uploads/${req.file.filename}`,
    };

    const newItem = {
      ...formFields,
      file: fileInfo,
    };

    items.push(newItem);
    return res.status(201).json(newItem);
  }

  // Fallback: JSON body
  const newItem = req.body;
  items.push(newItem);
  res.status(201).json(newItem);
});

app.put("/api/item/:index", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  const index = parseInt(req.params.index);
  if (items[index]) res.json((items[index] = req.body));
  else res.status(404).send("Item not found");
});

app.delete("/api/item/:index", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  const index = parseInt(req.params.index);
  if (items[index]) res.json(items.splice(index, 1));
  else res.status(404).send("Item not found");
});

// Separate upload endpoint: return uploaded file info and any fields
app.post("/api/upload", upload.single("file"), (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  if (!req.file) return res.status(400).send("No file uploaded");

  const fileInfo = {
    originalName: req.file.originalname,
    fileName: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: `/uploads/${req.file.filename}`,
  };

  const responsePayload = {
    ...req.body,
    file: fileInfo,
    filePath: fileInfo.path,
  };

  res.status(201).json(responsePayload);
});

export default app;
