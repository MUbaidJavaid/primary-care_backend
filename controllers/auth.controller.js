const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const AuditLog = require("../models/AuditLog");

const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_DAYS = Number.parseInt(
  process.env.JWT_REFRESH_EXPIRES_DAYS || "7",
  10,
);

const signAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN },
  );
};

const signRefreshToken = (user, jti) => {
  return jwt.sign(
    { id: user._id, role: user.role, type: "refresh", jti },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: `${REFRESH_EXPIRES_DAYS}d` },
  );
};

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

const writeAuditLog = async ({
  req,
  userId,
  action,
  resource,
  resourceId,
  status,
  details,
}) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      resourceId,
      status,
      details,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  } catch (error) {
    console.error("Audit logging failed:", error.message);
  }
};

const issueSessionTokens = async (user, req, res) => {
  const jti = crypto.randomUUID();
  const refreshToken = signRefreshToken(user, jti);
  const refreshHash = hashToken(refreshToken);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshHash,
    expiresAt: new Date(
      Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
    ),
    createdByIp: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  return {
    accessToken: signAccessToken(user),
    refreshToken,
  };
};

exports.register = async (req, res, next) => {
  try {
    if (!req.user || !["admin", "superadmin"].includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Only admin or superadmin can register users" });
    }

    const {
      name,
      email,
      password,
      role = "doctor",
      facility = null,
      profile = {},
    } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }

    if (!["superadmin", "admin", "doctor", "viewer"].includes(role)) {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    if (role === "superadmin" && req.user.role !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only superadmin can create another superadmin" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      facility,
      profile,
      permissions: role === "superadmin" ? ["*"] : [],
      isActive: true,
    });

    await writeAuditLog({
      req,
      userId: req.user._id,
      action: "USER_CREATED",
      resource: "User",
      resourceId: user._id,
      status: "success",
      details: { email: user.email, role: user.role },
    });

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.publicRegister = async (req, res, next) => {
  try {
    const name = req.body?.name?.trim();
    const email = req.body?.email?.trim()?.toLowerCase();
    const password = req.body?.password;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "doctor",
      facility: null,
      profile: {},
      permissions: [],
      isActive: true,
      isEmailVerified: true,
    });

    const { accessToken } = await issueSessionTokens(user, req, res);

    await writeAuditLog({
      req,
      userId: user._id,
      action: "PUBLIC_REGISTER",
      resource: "User",
      resourceId: user._id,
      status: "success",
      details: { email: user.email, role: user.role },
    });

    return res.status(201).json({
      message: "Registration successful",
      accessToken,
      user,
    });
  } catch (error) {
    return next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = req.body?.email?.trim()?.toLowerCase();
    const password = req.body?.password;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "email and password are required" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      await writeAuditLog({
        req,
        action: "LOGIN",
        resource: "User",
        status: "failure",
        details: { email, reason: "User not found" },
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is disabled" });
    }

    if (user.isLocked) {
      return res.status(423).json({
        message: "Account temporarily locked due to failed login attempts",
      });
    }

    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      await user.incLoginAttempts();
      await writeAuditLog({
        req,
        userId: user._id,
        action: "LOGIN",
        resource: "User",
        resourceId: user._id,
        status: "failure",
        details: { reason: "Invalid password" },
      });
      return res.status(401).json({ message: "Invalid email or password" });
    }

    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    const { accessToken } = await issueSessionTokens(user, req, res);

    await writeAuditLog({
      req,
      userId: user._id,
      action: "LOGIN",
      resource: "User",
      resourceId: user._id,
      status: "success",
      details: { role: user.role },
    });

    res.json({
      accessToken,
      user,
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    if (!incomingToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    const decoded = jwt.verify(
      incomingToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    );
    if (decoded.type !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token type" });
    }

    const tokenHash = hashToken(incomingToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < new Date()
    ) {
      return res
        .status(401)
        .json({ message: "Refresh token is invalid or expired" });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    const jti = crypto.randomUUID();
    const rotatedRefreshToken = signRefreshToken(user, jti);
    const rotatedHash = hashToken(rotatedRefreshToken);

    storedToken.revokedAt = new Date();
    storedToken.replacedByTokenHash = rotatedHash;
    await storedToken.save();

    await RefreshToken.create({
      userId: user._id,
      tokenHash: rotatedHash,
      expiresAt: new Date(
        Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
      ),
      createdByIp: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.cookie("refreshToken", rotatedRefreshToken, refreshCookieOptions);
    res.json({ accessToken: signAccessToken(user) });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const incomingToken = req.cookies?.refreshToken;
    if (incomingToken) {
      const tokenHash = hashToken(incomingToken);
      await RefreshToken.updateOne(
        { tokenHash, revokedAt: { $exists: false } },
        { $set: { revokedAt: new Date() } },
      );
    }

    res.clearCookie("refreshToken", refreshCookieOptions);
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "email is required" });
    }

    const user = await User.findOne({ email }).select("+passwordResetToken");
    if (!user) {
      return res.json({
        message: "If this email exists, an OTP has been sent.",
      });
    }

    const otp = user.createPasswordResetOtp();
    await user.save({ validateBeforeSave: false });

    console.log(`Password reset OTP for ${email}: ${otp}`);
    res.json({ message: "If this email exists, an OTP has been sent." });
  } catch (error) {
    next(error);
  }
};

exports.verifyResetOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: "email and otp are required" });
    }

    const hashedOtp = hashToken(otp);
    const user = await User.findOne({
      email,
      passwordResetToken: hashedOtp,
      passwordResetExpires: { $gt: Date.now() },
    }).select("_id");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    res.json({ message: "OTP verified" });
  } catch (error) {
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "email, otp and newPassword are required" });
    }

    const hashedOtp = hashToken(otp);
    const user = await User.findOne({
      email,
      passwordResetToken: hashedOtp,
      passwordResetExpires: { $gt: Date.now() },
    }).select("+password +passwordResetToken");

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    await RefreshToken.deleteMany({ userId: user._id });
    res.json({ message: "Password reset successful. Please login again." });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res) => {
  res.json({ user: req.user });
};
