let pipeline = null;
let modelLoading = null;

async function loadModel() {
  if (pipeline) return pipeline;
  if (modelLoading) return modelLoading;

  modelLoading = (async () => {
    const { pipeline: transformersPipeline } = await import('@xenova/transformers');
    pipeline = await transformersPipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    console.log('Embedding model loaded: all-MiniLM-L6-v2');
    return pipeline;
  })();

  return modelLoading;
}

async function generateEmbedding(text) {
  try {
    const model = await loadModel();
    const output = await model(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    return new Array(384).fill(0);
  }
}

async function generateEmbeddings(texts) {
  const results = [];
  for (const text of texts) {
    results.push(await generateEmbedding(text));
  }
  return results;
}

module.exports = { generateEmbedding, generateEmbeddings, loadModel };
