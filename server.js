require("dotenv").config();
const mongoose = require("mongoose");
const app = require("./app");
const connectDB = require("./config/db");
const seedSuperAdmin = require("./scripts/seedSuperAdmin");

const PORT = process.env.PORT || 5000;
let server;

const start = async () => {
  console.log("Starting server...");
  await connectDB();
  console.log("DB connected");
  await seedSuperAdmin();
  console.log("SuperAdmin seeded");

  server = app.listen(PORT, "127.0.0.1", () => {
    console.log(
      `Server running on port ${PORT} in ${process.env.NODE_ENV || "development"} mode`,
    );
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err.message);
  process.exit(1);
});

const shutdown = async (signal) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  if (server) {
    server.close();
  }
  await mongoose.connection.close();
  process.exit(0);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
