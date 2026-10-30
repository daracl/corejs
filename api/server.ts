import express, { Request, Response, Express, ErrorRequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { items } from "./data/items";
import cors from "cors";

const app: Express = express();

// Ensure upload directory exists
const defaultUploadDir = path.resolve(process.cwd(), "test-results", "uploads");
export const uploadDir = process.env.DARACL_UPLOAD_DIR || defaultUploadDir;
/** 기본 업로드 폴더를 쓸 때만 오래된 업로드를 자동 정리합니다. 직접 지정한 폴더는 건드리지 않습니다. */
export const usesDefaultUploadDir = uploadDir === defaultUploadDir;
fs.mkdirSync(uploadDir, { recursive: true });

/** 메모리에 쌓는 항목 수 상한입니다. */
const MAX_ITEMS = 1000;
const MAX_UPLOAD_AGE_MS = 24 * 60 * 60 * 1000;
// multer 설정(randomUUID + 확장자)이 만든 파일만 정리 대상으로 삼는다
const UPLOAD_FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[^/\\]{0,32})?$/;

/**
 * 지정 시간이 지난 업로드 파일을 삭제하고 삭제한 개수를 반환합니다.
 * 서버가 만든 UUID 이름의 파일만 대상으로 하므로 같은 폴더의 다른 파일은 유지합니다.
 */
export function pruneUploads(dir: string = uploadDir, maxAgeMs: number = MAX_UPLOAD_AGE_MS): number {
  let removed = 0;
  const limit = Date.now() - maxAgeMs;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !UPLOAD_FILE_NAME.test(entry.name)) continue;
    const file = path.join(dir, entry.name);
    try {
      if (fs.statSync(file).mtimeMs < limit) {
        fs.rmSync(file);
        removed++;
      }
    } catch { /* 다른 프로세스가 먼저 지운 파일은 무시합니다. */ }
  }
  return removed;
}

function isPlainBody(body: unknown): boolean {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

/** 문자열 경로 값이 0 이상의 정수 인덱스일 때만 숫자로 변환합니다. */
function toIndex(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

// Set up multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, randomUUID() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 10, fields: 50, fieldSize: 64 * 1024, parts: 60 },
});

// 개발 UI와 테스트 페이지에서 사용하는 출처만 허용합니다.
const allowedOrigins = new Set([
  "http://localhost:4171", "http://127.0.0.1:4171",
  "http://localhost:5173", "http://127.0.0.1:5173",
  "http://localhost:3000", "http://127.0.0.1:3000",
  "http://localhost", "http://127.0.0.1",
]);
app.use((req, res, next) => {
  if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) {
    res.status(403).json({ error: "Origin not allowed" });
    return;
  }
  next();
});
app.use(cors({ origin: [...allowedOrigins] }));

// Middleware
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

/**
 * 테스트용 사용자 정의 헤더만 응답에 반영합니다.
 */
function mirrorHeaders(req: Request, res: Response) {
  
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase().startsWith("x-")) {
      res.setHeader(key, Array.isArray(value) ? value.join(", ") : value as string);
    }
  }
  
}

// 항목을 저장하는 요청은 상한을 넘으면 거부합니다.
app.post(["/api/item", "/api/item-multiple"], (req: Request, res: Response, next) => {
  if (items.length >= MAX_ITEMS) {
    res.status(507).json({ error: "Item limit reached", message: `최대 ${MAX_ITEMS}개까지 저장할 수 있습니다.` });
    return;
  }
  next();
});

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
  if (!isPlainBody(req.body)) return res.status(400).json({ error: "Invalid request", message: "본문은 JSON 객체여야 합니다." });
  const newItem = req.body;
  items.push(newItem);
  res.status(201).json(newItem);
});

app.put("/api/item/:index", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  const index = toIndex(req.params.index);
  if (index === null || !items[index]) return res.status(404).send("Item not found");
  if (!isPlainBody(req.body)) return res.status(400).json({ error: "Invalid request", message: "본문은 JSON 객체여야 합니다." });
  res.json((items[index] = req.body));
});

app.delete("/api/item/:index", (req: Request, res: Response) => {
  mirrorHeaders(req, res);
  const index = toIndex(req.params.index);
  if (index === null || !items[index]) return res.status(404).send("Item not found");
  res.json(items.splice(index, 1));
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

// 업로드 제한과 잘못된 JSON 오류를 HTML 스택 대신 JSON으로 반환합니다.
const handleError: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const status = error.code === "LIMIT_UNEXPECTED_FILE" ? 400 : 413;
    res.status(status).json({ error: error.code, message: "Upload rejected" });
    return;
  }
  const status = error.status === 400 || error.status === 413 ? error.status : 500;
  res.status(status).json({ error: status === 500 ? "Internal Server Error" : "Invalid request" });
};
app.use(handleError);

export default app;
