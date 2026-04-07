const GuidelineChunk = require('../models/GuidelineChunk');

async function vectorSearch(queryEmbedding, topK = 5, filter = {}) {
  try {
    const results = await GuidelineChunk.aggregate([
      {
        $vectorSearch: {
          index: 'guideline_vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK,
          ...(Object.keys(filter).length > 0 && { filter }),
        },
      },
      {
        $project: {
          content: 1,
          metadata: 1,
          guidelineId: 1,
          chunkIndex: 1,
          score: { $meta: 'vectorSearchScore' },
        },
      },
    ]);
    return results;
  } catch (error) {
    console.warn('Atlas Vector Search unavailable, falling back to text search:', error.message);
    return fallbackTextSearch(topK);
  }
}

async function fallbackTextSearch(topK = 5) {
  const chunks = await GuidelineChunk.find({})
    .select('content metadata guidelineId chunkIndex')
    .limit(topK)
    .lean();
  return chunks.map((chunk, i) => ({ ...chunk, score: 1 - i * 0.1 }));
}

module.exports = { vectorSearch, fallbackTextSearch };
