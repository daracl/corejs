import express, { Request, Response, Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { items } from "./data/items";
import cors from "cors";

const app: Express = express();

// Ensure upload directory exists
const uploadDir = process.env.DARACL_UPLOAD_DIR || path.resolve(process.cwd(), "test-results", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

// Set up multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, randomUUID() + path.extname(file.originalname));
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
  
 const unsafeHeaders = ["content-length", "transfer-encoding", "connection"];

  for (const [key, value] of Object.entries(req.headers)) {
    if (!unsafeHeaders.includes(key.toLowerCase())) {
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

// Multiple file upload endpoint
app.post("/api/upload-multiple", upload.array("files", 10), (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      error: "No files uploaded",
      message: "Please provide at least one file",
    });
  }

  const filesInfo = (req.files as Express.Multer.File[]).map((file) => ({
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: `/uploads/${file.filename}`,
  }));

  const responsePayload = {
    ...req.body,
    files: filesInfo,
    filesCount: filesInfo.length,
    totalSize: filesInfo.reduce((sum, f) => sum + f.size, 0),
  };

  res.status(201).json(responsePayload);
});

// Multiple file upload to /api/item endpoint (alternative)
app.post("/api/item-multiple", upload.array("files", 10), (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  
  const formFields = req.body || {};

  if (!req.files || req.files.length === 0) {
    // No files, just save form fields
    const newItem = formFields;
    items.push(newItem);
    return res.status(201).json(newItem);
  }

  const filesInfo = (req.files as Express.Multer.File[]).map((file) => ({
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: `/uploads/${file.filename}`,
  }));

  const newItem = {
    ...formFields,
    files: filesInfo,
    filesCount: filesInfo.length,
  };

  items.push(newItem);
  res.status(201).json(newItem);
});

app.get("/api/longtime", async (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  // 5초 대기
  await new Promise((resolve) => setTimeout(resolve, 5000));
  res.json({ message: "completed", delayMs: 5000 });
});

app.get("/api/err500", async (req: Request, res: Response) => {
  mirrorHeaders(req, res);

  await new Promise((resolve) => setTimeout(resolve, 3000));
  res.status(500).json({
    error: "Internal Server Error",
    message: "Simulated 500 error for testing purposes"
  });
});

// 파라미터 값을 response에 담아 반환하는 엔드포인트
app.get("/api/header-value", (req: Request, res: Response) => {
  mirrorHeaders(req, res);

  // Query parameters 모두 추출
  const queryParams = req.query;

  // Request headers 모두 추출
  const requestHeaders = req.headers;

  res.json({
    message: "Header and query parameters received",
    queryParams: queryParams,
    requestHeaders: requestHeaders,
  });
});

app.options("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot OPTIONS ${req.originalUrl}`
  });
});

// 404 핸들러: 등록되지 않은 URL은 모두 404 반환
app.use((req: Request, res: Response) => {
  mirrorHeaders(req, res);
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path,
    method: req.method,
  });
});

export default app;
