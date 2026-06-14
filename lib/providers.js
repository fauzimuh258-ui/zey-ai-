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
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'gemma-7b-it'
    ],
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

  gemini: {
    id: 'gemini',
    name: 'Gemini',
    icon: '🔵',
    description: 'Google — Stabil',
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    key: process.env.GEMINI_API_KEY,
    models: ['gemini-pro'],
    headers: (apiKey) => ({
      'Content-Type': 'application/json'
    }),
    formatRequest: (model, messages) => {
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      return {
        contents: [{ parts: [{ text: prompt }] }]
      };
    },
    formatResponse: (data) => data.candidates[0].content.parts[0].text,
    parseError: (error) => `Gemini error: ${error.message}`
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

export const PROVIDER_ORDER = ['groq', 'gemini', 'deepseek'];

export const DEFAULT_PROVIDER = 'groq';
