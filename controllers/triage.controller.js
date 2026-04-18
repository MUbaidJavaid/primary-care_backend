const { runTriagePipeline } = require("../services/rag.service");
const ChatSession = require("../models/ChatSession");
const QueryLog = require("../models/QueryLog");

exports.triageQuery = async (req, res, next) => {
  try {
    if (req.user.role === "viewer") {
      return res
        .status(403)
        .json({ message: "Viewer role cannot run new triage queries" });
    }

    const { patientInfo, queryText, sessionId } = req.body;

    if (
      !patientInfo ||
      !patientInfo.symptoms ||
      patientInfo.symptoms.length === 0
    ) {
      return res.status(400).json({ message: "Patient symptoms are required" });
    }

    if (req.emergencyResponse) {
      const emergencyResult = {
        triageResponse: req.emergencyResponse,
        retrievedChunks: [],
        responseTimeMs: 0,
        isEmergency: true,
      };

      if (sessionId) {
        await saveToSession(
          sessionId,
          queryText || patientInfo.symptoms.join(", "),
          emergencyResult.triageResponse,
        );
      }

      await QueryLog.create({
        sessionId,
        userId: req.user._id,
        facilityId: req.user.facility || null,
        patientInfo,
        queryText: queryText || patientInfo.symptoms.join(", "),
        retrievedChunks: [],
        triageResponse: req.emergencyResponse,
        performance: {
          tokensUsed: 0,
          responseTimeMs: 0,
          retrievalTimeMs: 0,
          embeddingTimeMs: 0,
        },
      });

      return res.json(emergencyResult);
    }

    const result = await runTriagePipeline({
      patientInfo,
      queryText,
      sessionId,
      userId: req.user._id,
      facilityId: req.user.facility || null,
      redFlags: req.redFlags || [],
    });

    if (sessionId) {
      await saveToSession(
        sessionId,
        queryText || patientInfo.symptoms.join(", "),
        result.triageResponse,
      );
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

exports.getQueryLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const logs = await QueryLog.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await QueryLog.countDocuments({ userId: req.user._id });

    res.json({ logs, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

exports.getQueryLogById = async (req, res, next) => {
  try {
    const log = await QueryLog.findById(req.params.id).lean();
    if (!log) return res.status(404).json({ message: "Log not found" });
    res.json(log);
  } catch (error) {
    next(error);
  }
};

async function saveToSession(sessionId, userMessage, triageResponse) {
  try {
    await ChatSession.findByIdAndUpdate(sessionId, {
      $push: {
        messages: [
          { role: "user", content: userMessage },
          {
            role: "assistant",
            content: triageResponse.recommendedAction,
            triageData: triageResponse,
          },
        ],
      },
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error("Failed to save to session:", err.message);
  }
}
