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
  'llama-3.3-70b-versatile',  // Utama (tetap)
  'gpt-oss-20b',              // 🆕 Baru! Cepat & pintar
  'gpt-oss-120b',             // 🆕 Baru! Jenius buat tugas berat
  'llama-4-scout',            // 🆕 Baru! Bisa lihat gambar
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
