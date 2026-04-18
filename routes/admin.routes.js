const router = require("express").Router();
const {
  protect,
  adminOnly,
  requireRole,
} = require("../middleware/auth.middleware");
const QueryLog = require("../models/QueryLog");
const ChatSession = require("../models/ChatSession");
const User = require("../models/User");
const GuidelineChunk = require("../models/GuidelineChunk");
const Guideline = require("../models/Guideline");
const Facility = require("../models/Facility");
const AuditLog = require("../models/AuditLog");

router.get("/stats", protect, adminOnly, async (req, res, next) => {
  try {
    const [
      totalQueries,
      totalSessions,
      totalUsers,
      totalGuidelines,
      totalChunks,
      emergencyCount,
      urgentCount,
      routineCount,
      insufficientCount,
    ] = await Promise.all([
      QueryLog.countDocuments(),
      ChatSession.countDocuments(),
      User.countDocuments(),
      Guideline.countDocuments(),
      GuidelineChunk.countDocuments(),
      QueryLog.countDocuments({ "triageResponse.urgencyLevel": "Emergency" }),
      QueryLog.countDocuments({ "triageResponse.urgencyLevel": "Urgent" }),
      QueryLog.countDocuments({ "triageResponse.urgencyLevel": "Routine" }),
      QueryLog.countDocuments({
        "triageResponse.urgencyLevel": "Insufficient",
      }),
    ]);

    const recentLogs = await QueryLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name email role")
      .lean();

    res.json({
      totalQueries,
      totalSessions,
      totalUsers,
      totalGuidelines,
      totalChunks,
      urgencyBreakdown: {
        Emergency: emergencyCount,
        Urgent: urgentCount,
        Routine: routineCount,
        Insufficient: insufficientCount,
      },
      recentLogs,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/logs", protect, adminOnly, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const logs = await QueryLog.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "name email role")
      .lean();

    const total = await QueryLog.countDocuments();
    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

router.get("/users", protect, adminOnly, async (req, res, next) => {
  try {
    const users = await User.find()
      .select("name email role facility isActive lastLogin createdAt")
      .populate("facility", "name district province")
      .sort({ createdAt: -1 })
      .lean();

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.get("/facilities", protect, adminOnly, async (req, res, next) => {
  try {
    const facilities = await Facility.find()
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    res.json({ facilities });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-trail", protect, adminOnly, async (req, res, next) => {
  try {
    const rows = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(25)
      .populate("userId", "name email role")
      .lean();

    res.json({ rows });
  } catch (error) {
    next(error);
  }
});

router.patch(
  "/users/:id/status",
  protect,
  requireRole("superadmin"),
  async (req, res, next) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      if (String(req.user._id) === String(req.params.id) && !isActive) {
        return res
          .status(400)
          .json({ message: "Superadmin cannot disable own account" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { isActive } },
        { new: true },
      )
        .select("name email role facility isActive lastLogin createdAt")
        .populate("facility", "name district province")
        .lean();

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
);

router.patch(
  "/users/:id/role",
  protect,
  requireRole("superadmin"),
  async (req, res, next) => {
    try {
      const { role } = req.body;
      const allowedRoles = ["superadmin", "admin", "doctor", "viewer"];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role provided" });
      }

      const targetUser = await User.findById(req.params.id).lean();
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (
        String(req.user._id) === String(req.params.id) &&
        role !== "superadmin"
      ) {
        return res
          .status(400)
          .json({ message: "Superadmin cannot demote own account" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: { role } },
        { new: true },
      )
        .select("name email role facility isActive lastLogin createdAt")
        .populate("facility", "name district province")
        .lean();

      res.json({ user });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
