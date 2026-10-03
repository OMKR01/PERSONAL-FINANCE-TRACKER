import mongoose from "mongoose";

let cached = global._mongooseConnection;

export const connectDB = async () => {
  // Reuse existing connection in serverless warm starts
  if (cached && cached.readyState === 1) {
    return cached;
  }

  if (mongoose.connection.readyState === 1) {
    cached = mongoose.connection;
    global._mongooseConnection = cached;
    return cached;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    cached = conn.connection;
    global._mongooseConnection = cached;
    return conn;
  } catch (error) {
    console.error(`Database connection failed: ${error.message}`);
    // Throw instead of process.exit(1) — serverless functions must not call exit
    throw new Error(`Database connection failed: ${error.message}`);
  }
};
