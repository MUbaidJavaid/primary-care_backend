const mongoose = require("mongoose");

const guidelineSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    filename: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, enum: ["pdf", "docx"], required: true },
    source: { type: String, default: "Unknown" },
    category: {
      type: String,
      enum: [
        "maternal",
        "child",
        "emergency",
        "chronic",
        "infectious",
        "nutrition",
        "mental",
        "general",
      ],
      default: "general",
    },
    disease: { type: String, default: "" },
    version: { type: String, default: "1.0" },
    language: { type: String, default: "en" },
    totalChunks: { type: Number, default: 0 },
    isIngested: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Guideline", guidelineSchema);
