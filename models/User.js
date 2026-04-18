const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ["superadmin", "admin", "doctor", "viewer"],
      default: "doctor",
    },
    facility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Facility",
      default: null,
    },
    permissions: [{ type: String }],
    profile: {
      designation: String,
      phone: String,
      organization: String,
      avatar: String,
    },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLogin: Date,
    passwordChangedAt: Date,
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  { timestamps: true },
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.virtual("isLocked").get(function isLocked() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = async function incLoginAttempts() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 15 * 60 * 1000 };
  }

  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = async function resetLoginAttempts() {
  if (this.loginAttempts || this.lockUntil) {
    this.loginAttempts = 0;
    this.lockUntil = undefined;
  }
};

userSchema.methods.createPasswordResetOtp = function createPasswordResetOtp() {
  const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  this.passwordResetToken = hashedOtp;
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return otp;
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordResetToken;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
