const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { chunkText } = require('./chunking.service');
const { generateEmbedding } = require('./embedding.service');
const Guideline = require('../models/Guideline');
const GuidelineChunk = require('../models/GuidelineChunk');

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === '.pdf') {
    const data = await pdfParse(buffer);
    return data.text;
  }
  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

async function ingestGuideline(guidelineId) {
  const guideline = await Guideline.findById(guidelineId);
  if (!guideline) throw new Error('Guideline not found');

  const text = await extractText(guideline.filePath);
  const chunks = chunkText(text);

  await GuidelineChunk.deleteMany({ guidelineId: guideline._id });

  const chunkDocs = [];
  for (let i = 0; i < chunks.length; i++) {
    const embedding = await generateEmbedding(chunks[i]);
    chunkDocs.push({
      guidelineId: guideline._id,
      chunkIndex: i,
      content: chunks[i],
      embedding,
      metadata: {
        source: guideline.source,
        category: guideline.category,
        disease: '',
        pageNumber: 0,
        language: guideline.language,
      },
    });

    if (i % 10 === 0 && i > 0) {
      console.log(`  Processed ${i}/${chunks.length} chunks...`);
    }
  }

  await GuidelineChunk.insertMany(chunkDocs);

  guideline.totalChunks = chunks.length;
  guideline.isIngested = true;
  await guideline.save();

  console.log(`Ingested ${chunks.length} chunks for: ${guideline.title}`);
  return { guidelineId: guideline._id, chunksCreated: chunks.length };
}

module.exports = { extractText, ingestGuideline };
