const { generateEmbedding } = require('./embedding.service');
const { vectorSearch } = require('./vectorSearch.service');
const { callGroq } = require('./grok.service');
const { buildTriagePrompt } = require('../prompts/triagePrompt');
const { formatTriageResponse } = require('../utils/responseFormatter');
const QueryLog = require('../models/QueryLog');

async function runTriagePipeline({ patientInfo, queryText, sessionId, userId, redFlags = [] }) {
  const startTime = Date.now();

  const semanticQuery = buildSemanticQuery(patientInfo, queryText);

  const queryEmbedding = await generateEmbedding(semanticQuery);

  const topK = parseInt(process.env.TOP_K_RETRIEVAL, 10) || 5;
  const retrievedChunks = await vectorSearch(queryEmbedding, topK);

  const systemPrompt = buildTriagePrompt(patientInfo, retrievedChunks);
  const userMessage = `Patient presents with: ${semanticQuery}. Please provide a triage assessment.`;

  const { content, tokensUsed } = await callGroq(systemPrompt, userMessage);

  const triageResponse = formatTriageResponse(content, redFlags);

  const responseTimeMs = Date.now() - startTime;

  const queryLog = await QueryLog.create({
    sessionId,
    userId,
    patientInfo,
    queryText: queryText || semanticQuery,
    retrievedChunks: retrievedChunks.map(c => ({
      chunkId: c._id,
      score: c.score,
      content: c.content?.substring(0, 500),
    })),
    triageResponse,
    tokensUsed,
    responseTimeMs,
  });

  return {
    triageResponse,
    retrievedChunks: retrievedChunks.map(c => ({
      id: c._id,
      content: c.content,
      score: c.score,
      metadata: c.metadata,
    })),
    queryLogId: queryLog._id,
    responseTimeMs,
  };
}

function buildSemanticQuery(patientInfo, queryText) {
  const parts = [];
  if (queryText) parts.push(queryText);
  if (patientInfo.symptoms?.length > 0) {
    parts.push(`Symptoms: ${patientInfo.symptoms.join(', ')}`);
  }
  if (patientInfo.age) parts.push(`Age: ${patientInfo.age}`);
  if (patientInfo.gender) parts.push(`Gender: ${patientInfo.gender}`);
  if (patientInfo.vitals?.temperature) parts.push(`Temperature: ${patientInfo.vitals.temperature}°C`);
  return parts.join('. ');
}

module.exports = { runTriagePipeline };
