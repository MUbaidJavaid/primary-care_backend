const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    resource: { type: String, required: true },
    resourceId: mongoose.Schema.Types.ObjectId,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    status: { type: String, enum: ["success", "failure"], default: "success" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
