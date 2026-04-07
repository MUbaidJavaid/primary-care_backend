const mongoose = require('mongoose');

const queryLogSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  patientInfo: {
    age: Number,
    gender: String,
    symptoms: [String],
    vitals: {
      bloodPressure: String,
      temperature: Number,
      heartRate: Number,
      respiratoryRate: Number,
      oxygenSaturation: Number,
    },
  },
  queryText: String,
  retrievedChunks: [{
    chunkId: mongoose.Schema.Types.ObjectId,
    score: Number,
    content: String,
  }],
  triageResponse: {
    possibleCondition: String,
    urgencyLevel: { type: String, enum: ['Routine', 'Urgent', 'Emergency'] },
    recommendedAction: String,
    guidelineExcerpt: String,
    disclaimer: String,
    sourceReferences: [String],
    redFlagTriggered: { type: Boolean, default: false },
  },
  tokensUsed: { type: Number, default: 0 },
  responseTimeMs: { type: Number, default: 0 },
}, { timestamps: true });

queryLogSchema.index({ userId: 1, createdAt: -1 });
queryLogSchema.index({ 'triageResponse.urgencyLevel': 1 });

module.exports = mongoose.model('QueryLog', queryLogSchema);
