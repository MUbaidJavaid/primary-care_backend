const { checkRedFlags } = require('../utils/redFlagSymptoms');
const { buildEmergencyResponse } = require('../utils/responseFormatter');

const redFlagMiddleware = (req, res, next) => {
  const { patientInfo } = req.body;
  if (!patientInfo) return next();

  const symptoms = patientInfo.symptoms || [];
  const vitals = patientInfo.vitals || {};

  const redFlags = checkRedFlags(symptoms, vitals);

  if (redFlags.length > 0) {
    req.redFlags = redFlags;
    req.emergencyResponse = buildEmergencyResponse(redFlags);
  }

  next();
};

module.exports = redFlagMiddleware;
