const mongoose = require("mongoose");

const queryLogSchema = new mongoose.Schema(
  {
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    facilityId: { type: mongoose.Schema.Types.ObjectId, ref: "Facility" },
    patientInfo: {
      age: Number,
      gender: { type: String, enum: ["Male", "Female", "Other"] },
      symptoms: [String],
      vitals: {
        bloodPressure: String,
        temperature: Number,
        heartRate: Number,
        respiratoryRate: Number,
        oxygenSaturation: Number,
        weight: Number,
        height: Number,
      },
      additionalNotes: String,
    },
    queryText: String,
    retrievedChunks: [
      {
        chunkId: mongoose.Schema.Types.ObjectId,
        score: Number,
        content: String,
        source: String,
      },
    ],
    triageResponse: {
      possibleCondition: String,
      urgencyLevel: {
        type: String,
        enum: ["Routine", "Urgent", "Emergency", "Insufficient"],
      },
      recommendedAction: String,
      guidelineExcerpt: String,
      disclaimer: String,
      sourceReferences: [String],
      redFlagTriggered: { type: Boolean, default: false },
      redFlagsDetected: [String],
    },
    performance: {
      tokensUsed: { type: Number, default: 0 },
      responseTimeMs: { type: Number, default: 0 },
      retrievalTimeMs: { type: Number, default: 0 },
      embeddingTimeMs: { type: Number, default: 0 },
    },
    isExported: { type: Boolean, default: false },
    exportedAt: Date,
  },
  { timestamps: true },
);

queryLogSchema.index({ userId: 1, createdAt: -1 });
queryLogSchema.index({ "triageResponse.urgencyLevel": 1 });
queryLogSchema.index({ sessionId: 1, createdAt: -1 });
queryLogSchema.index({ facilityId: 1, createdAt: -1 });

module.exports = mongoose.model("QueryLog", queryLogSchema);
