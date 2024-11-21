// src/server.ts
import express, { Request, Response, Express } from "express";
import multer from "multer";
import path from "path";
import { items } from "./data/items";

// Initialize express app
const app: Express = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Save to 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Add timestamp to filename
  },
});

const upload = multer({ storage: storage });

// Middleware
app.use(express.json());
app.use("/uploads", express.static("uploads")); // Serve uploaded files

// Sample data
let allItems: any[] = items;

// GET API endpoint
app.get("/api/items", (req: Request, res: Response) => {
  res.json(items);
});

// POST API endpoint
app.post("/api/items", (req: Request, res: Response) => {
  const newItem = req.body;
  items.push(newItem);
  res.status(201).json(newItem);
});

// PUT API endpoint
app.put("/api/items/:index", (req: Request, res: Response) => {
  const index = parseInt(req.params.index);
  if (items[index]) {
    items[index] = req.body;
    res.json(items[index]);
  } else {
    res.status(404).send("Item not found");
  }
});

// DELETE API endpoint
app.delete("/api/items/:index", (req: Request, res: Response) => {
  const index = parseInt(req.params.index);
  if (items[index]) {
    const deletedItem = items.splice(index, 1);
    res.json(deletedItem);
  } else {
    res.status(404).send("Item not found");
  }
});

// File upload endpoint
app.post("/api/upload", upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }
  res.status(201).json({ filePath: `/uploads/${req.file.filename}` });
});

export default app;
