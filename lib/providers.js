// /lib/providers.js
// Konfigurasi Multi-Provider untuk Zey AI
// Update terakhir: 14 Juni 2026

export const PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq',
    icon: '⚡',
    description: 'Llama 3.3 — Tercepat',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: process.env.GROQ_API_KEY,
    models: [
  'llama-3.3-70b-versatile',  // Utama (terbukti stabil)
  'qwen-3-32b',               // 🆕 Qwen 3 32B (reasoning)
  'qwen-3.6-27b',             // 🆕 Qwen 3.6 27B (multilingual)
  'gpt-oss-20b',              // Cadangan (kalau udah stabil)
]
    ,
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
