const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean = require("xss-clean");
const hpp = require("hpp");
const compression = require("compression");
const path = require("path");

const authRoutes = require("./routes/auth.routes");
const triageRoutes = require("./routes/triage.routes");
const chatRoutes = require("./routes/chat.routes");
const guidelineRoutes = require("./routes/guideline.routes");
const adminRoutes = require("./routes/admin.routes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      const allowed = [
        "*",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        process.env.CLIENT_URL,
      ].filter(Boolean);
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(xssClean());
app.use(hpp());
app.use(compression());

if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/triage", triageRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/guidelines", guidelineRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

module.exports = app;
