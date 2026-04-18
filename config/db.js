const mongoose = require("mongoose");

const connectDB = async () => {
  const uri =
    process.env.MONGODB_URI || "mongodb://localhost:27017/primary-care-triage";
  const maxAttempts = Number.parseInt(
    process.env.MONGODB_CONNECT_RETRIES || "5",
    10,
  );

  mongoose.set("strictQuery", true);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
      });
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;
      console.error(
        `MongoDB connection attempt ${attempt}/${maxAttempts} failed: ${error.message}`,
      );
      if (isLastAttempt) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
};

module.exports = connectDB;
