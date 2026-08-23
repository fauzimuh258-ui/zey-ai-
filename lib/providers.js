export const PROVIDERS = {
  cloudflare: {
    id: 'cloudflare',
    name: 'Cloudflare',
    icon: '☁️',
    description: 'Cloudflare — Gratis 10K/hari',
    url: 'https://api.cloudflare.com/client/v4/accounts/8c9cbf3dc700e1e7b731b52e94bf6c9d/ai/run',
    key: process.env.CF_API_TOKEN,
    models: ['@cf/meta/llama-3-8b-instruct'],
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }),
    formatRequest: (model, messages) => ({
      model: model,
      input: { messages: messages },
      max_tokens: 2048,
    }),
    formatResponse: (data) => data?.result?.response || 'No response',
    parseError: (error) => `Cloudflare error: ${error.message}`
  }
};

export const PROVIDER_ORDER = ['cloudflare'];
export const DEFAULT_PROVIDER = 'cloudflare';
