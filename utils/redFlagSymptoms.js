const RED_FLAG_SYMPTOMS = [
  'chest pain', 'chest tightness', 'crushing chest pain',
  'difficulty breathing', 'severe dyspnea', "can't breathe", 'cannot breathe', 'shortness of breath at rest',
  'unconscious', 'unresponsive', 'loss of consciousness', 'passed out', 'fainted',
  'seizure', 'convulsions', 'fits', 'fitting',
  'face drooping', 'arm weakness', 'speech difficulty', 'stroke', 'slurred speech',
  'severe bleeding', 'hemorrhage', 'uncontrolled bleeding', 'bleeding heavily',
  'signs of shock', 'pale and sweating', 'cold and clammy', 'rapid weak pulse',
  'severe headache with neck stiffness', 'neck stiffness with fever', 'meningitis',
  'high fever with altered consciousness', 'fever with confusion',
  'severe abdominal pain in pregnancy', 'vaginal bleeding in pregnancy',
  'eclampsia', 'severe pre-eclampsia', 'pre-eclampsia',
  'anaphylaxis', 'severe allergic reaction', 'throat swelling',
  'suicide ideation', 'self-harm', 'suicidal', 'wants to die',
  'sepsis', 'fever with rapid breathing and confusion',
];

const CRITICAL_VITAL_THRESHOLDS = {
  oxygenSaturation: { min: 90 },
  temperature: { max: 40.5, min: 35.0 },
  heartRate: { max: 150, min: 40 },
  respiratoryRate: { max: 40 },
  systolicBP: { min: 80 },
};

function checkRedFlags(symptoms, vitals = {}) {
  const flags = [];
  const symptomsLower = (Array.isArray(symptoms) ? symptoms : [symptoms])
    .map(s => s.toLowerCase().trim());

  for (const symptom of symptomsLower) {
    for (const redFlag of RED_FLAG_SYMPTOMS) {
      if (symptom.includes(redFlag) || redFlag.includes(symptom)) {
        flags.push({ type: 'symptom', value: redFlag, matched: symptom });
        break;
      }
    }
  }

  if (vitals.oxygenSaturation && vitals.oxygenSaturation < CRITICAL_VITAL_THRESHOLDS.oxygenSaturation.min) {
    flags.push({ type: 'vital', value: `SpO2 ${vitals.oxygenSaturation}% (critical < 90%)` });
  }
  if (vitals.temperature && vitals.temperature > CRITICAL_VITAL_THRESHOLDS.temperature.max) {
    flags.push({ type: 'vital', value: `Temperature ${vitals.temperature}°C (critical > 40.5°C)` });
  }
  if (vitals.temperature && vitals.temperature < CRITICAL_VITAL_THRESHOLDS.temperature.min) {
    flags.push({ type: 'vital', value: `Temperature ${vitals.temperature}°C (hypothermia < 35°C)` });
  }
  if (vitals.heartRate && vitals.heartRate > CRITICAL_VITAL_THRESHOLDS.heartRate.max) {
    flags.push({ type: 'vital', value: `Heart Rate ${vitals.heartRate} bpm (critical > 150)` });
  }
  if (vitals.heartRate && vitals.heartRate < CRITICAL_VITAL_THRESHOLDS.heartRate.min) {
    flags.push({ type: 'vital', value: `Heart Rate ${vitals.heartRate} bpm (bradycardia < 40)` });
  }
  if (vitals.respiratoryRate && vitals.respiratoryRate > CRITICAL_VITAL_THRESHOLDS.respiratoryRate.max) {
    flags.push({ type: 'vital', value: `RR ${vitals.respiratoryRate}/min (critical > 40)` });
  }

  if (vitals.bloodPressure) {
    const match = vitals.bloodPressure.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      const systolic = parseInt(match[1], 10);
      if (systolic < CRITICAL_VITAL_THRESHOLDS.systolicBP.min) {
        flags.push({ type: 'vital', value: `BP ${vitals.bloodPressure} (hypotension, systolic < 80)` });
      }
    }
  }

  return flags;
}

module.exports = { RED_FLAG_SYMPTOMS, CRITICAL_VITAL_THRESHOLDS, checkRedFlags };
