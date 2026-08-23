// /lib/providers.js
// Konfigurasi Multi-Provider untuk Zey AI
// Update terakhir: 14 Juni 2026


const CLOUDFLARE = {
  id: 'cloudflare',
  name: 'Cloudflare',
  url: 'https://api.cloudflare.com/client/v4/accounts/8c9cbf3dc700e1e7b731b52e94bf6c9d/ai/run',
  key: process.env.CF_API_TOKEN,
  models: ['@cf/meta/llama-3-8b-instruct'],
  headers: (apiKey) => ({
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  })
};
    formatRequest: (model, messages) => ({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048
    }),
    formatResponse: (data) => data.choices[0].message.content,
    parseError: (error) => `Groq error: ${error.message}`
  },  

  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    icon: '🟣',
    description: 'DeepSeek — Cadangan',
    url: 'https://api.deepseek.com/v1/chat/completions',
    key: process.env.DEEPSEEK_API_KEY,
    models: ['deepseek-chat'],
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    formatRequest: (model, messages) => ({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048
    }),
    formatResponse: (data) => data.choices[0].message.content,
    parseError: (error) => `DeepSeek error: ${error.message}`
  }
};

export const PROVIDER_ORDER = ['groq', 'deepseek']; // Hapus 'gemini'

export const DEFAULT_PROVIDER = 'groq';
