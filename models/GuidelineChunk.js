const mongoose = require("mongoose");

const guidelineChunkSchema = new mongoose.Schema(
  {
    guidelineId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guideline",
      required: true,
    },
    chunkIndex: { type: Number, required: true },
    content: { type: String, required: true },
    embedding: { type: [Number], required: true },
    metadata: {
      source: { type: String, default: "" },
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
      pageNumber: { type: Number, default: 0 },
      language: { type: String, default: "en" },
      keywords: [{ type: String }],
    },
    version: { type: String, default: "1.0" },
  },
  { timestamps: true },
);

guidelineChunkSchema.index({ guidelineId: 1 });
guidelineChunkSchema.index({ "metadata.category": 1 });

module.exports = mongoose.model("GuidelineChunk", guidelineChunkSchema);
