import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import { connectDB } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import transactionRoutes from "./routes/transactionRoutes.js";
import { errorHandler, notFound } from "./middleware/errorMiddleware.js";

dotenv.config();

const app = express();

// Whitelist origins (handles production client, local dev ports, and trims trailing slashes)
const allowedOrigins = [
  process.env.CLIENT_URL ? process.env.CLIENT_URL.replace(/\/$/, "") : null,
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, Postman)
      if (!origin) return callback(null, true);

      // Allow exact matches from the whitelist
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow any Vercel preview deployment URL for this project
      if (origin.endsWith(".vercel.app")) return callback(null, true);

      console.error(
        `CORS blocked origin: ${origin} | Allowed: ${allowedOrigins.join(", ")}`,
      );
      callback(new Error(`CORS block: Origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

app.use(express.json());
app.use(cookieParser());

// Serverless DB Connection Middleware: Ensures DB is connected before processing requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

// Health check endpoint (useful for verifying Vercel deployment)
app.get("/api/health", (req, res) => {
  res
    .status(200)
    .json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Route Handlers
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

// Local development server listener
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;
