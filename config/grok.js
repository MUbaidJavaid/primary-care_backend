const Groq = require("groq-sdk");

let groqClient = null;

if (process.env.GROQ_API_KEY) {
  groqClient = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
}

module.exports = groqClient;
