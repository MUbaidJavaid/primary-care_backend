const mongoose = require("mongoose");

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["BHU", "RHC", "THQ", "DHQ", "Other"],
      default: "BHU",
    },
    district: String,
    province: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
    contactNumber: String,
    inchargeDoctor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isActive: { type: Boolean, default: true },
    stats: {
      totalQueries: { type: Number, default: 0 },
      emergencyCount: { type: Number, default: 0 },
      lastActivity: Date,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Facility", facilitySchema);
