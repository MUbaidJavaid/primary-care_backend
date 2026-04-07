const groqClient = require('../config/grok');

async function callGroq(systemPrompt, userMessage) {
  const temperature = parseFloat(process.env.TEMPERATURE) || 0.1;
  const maxTokens = parseInt(process.env.MAX_TOKENS, 10) || 800;

  const response = await groqClient.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature,
    max_tokens: maxTokens,
    response_format: { type: 'json_object' },
  });

  return {
    content: response.choices[0].message.content,
    tokensUsed: response.usage?.total_tokens || 0,
  };
}

module.exports = { callGroq };
