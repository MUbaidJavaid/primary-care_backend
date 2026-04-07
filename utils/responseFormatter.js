function formatTriageResponse(rawResponse, redFlags = []) {
  const defaults = {
    possibleCondition: 'Unable to determine',
    urgencyLevel: 'Routine',
    recommendedAction: 'Please consult a qualified healthcare provider.',
    guidelineExcerpt: '',
    disclaimer: 'This is not a confirmed diagnosis. Please consult a qualified physician for definitive diagnosis and treatment.',
    sourceReferences: [],
    redFlagTriggered: redFlags.length > 0,
  };

  if (!rawResponse) return defaults;

  let parsed = rawResponse;
  if (typeof rawResponse === 'string') {
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      return { ...defaults, recommendedAction: rawResponse };
    }
  }

  const validLevels = ['Routine', 'Urgent', 'Emergency'];
  let urgencyLevel = parsed.urgencyLevel || defaults.urgencyLevel;
  if (!validLevels.includes(urgencyLevel)) {
    urgencyLevel = 'Routine';
  }
  if (redFlags.length > 0) {
    urgencyLevel = 'Emergency';
  }

  return {
    possibleCondition: parsed.possibleCondition || defaults.possibleCondition,
    urgencyLevel,
    recommendedAction: parsed.recommendedAction || defaults.recommendedAction,
    guidelineExcerpt: parsed.guidelineExcerpt || defaults.guidelineExcerpt,
    disclaimer: defaults.disclaimer,
    sourceReferences: parsed.sourceReferences || defaults.sourceReferences,
    redFlagTriggered: redFlags.length > 0,
    redFlags: redFlags.length > 0 ? redFlags : undefined,
  };
}

function buildEmergencyResponse(redFlags) {
  return {
    possibleCondition: 'EMERGENCY — Red Flag Symptoms Detected',
    urgencyLevel: 'Emergency',
    recommendedAction: `IMMEDIATE REFERRAL REQUIRED. Red flags detected: ${redFlags.map(f => f.value).join('; ')}. Stabilize the patient and arrange emergency transport to the nearest hospital immediately. Do NOT delay.`,
    guidelineExcerpt: 'Per WHO/MoH emergency protocols: Any patient presenting with red-flag symptoms must be stabilized and referred immediately to secondary/tertiary care.',
    disclaimer: 'This is not a confirmed diagnosis. Please consult a qualified physician for definitive diagnosis and treatment.',
    sourceReferences: ['WHO Emergency Triage Assessment and Treatment (ETAT)', 'MoH Pakistan Emergency Protocols'],
    redFlagTriggered: true,
    redFlags,
  };
}

module.exports = { formatTriageResponse, buildEmergencyResponse };
