import { checkRateLimit } from '../../lib/rateLimit.js';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const SECRET_KEY = "vvbam988";
const DEFAULT_MODEL = "llama-3.3-70b-versatile";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req) {
  const key = req.headers.get("x-api-key");
  if (key !== SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  // ✅ RATE LIMIT CHECK
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  const userId = req.headers.get('x-user-id') || null;
  const limitCheck = checkRateLimit(userId, ip);
  if (!limitCheck.allowed) {
    return Response.json(
      { error: limitCheck.message, retryAfter: limitCheck.retryAfter },
      { status: 429, headers: CORS }
    );
  }

  try {
    const body = await req.json();
    const { messages, system, model, max_tokens, temperature } = body;

    const groqMessages = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;

    // Coba Groq dulu
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: model || DEFAULT_MODEL,
          messages: groqMessages,
          max_tokens: max_tokens || 1024,
          temperature: temperature ?? 0.7,
        }),
      });

      if (res.status === 429) throw new Error('Groq rate limited');
      
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      return Response.json({ ...data, provider: 'groq' }, { status: res.status, headers: CORS });
      
    } catch (groqError) {
      console.log('Groq gagal, coba DeepSeek...');
      
      // Fallback ke DeepSeek
      if (DEEPSEEK_API_KEY) {
        try {
          const dsRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
            },
            body: JSON.stringify({
              model: "deepseek-chat",
              messages: groqMessages,
              max_tokens: max_tokens || 1024,
              temperature: temperature ?? 0.7,
            }),
          });

          if (dsRes.status === 429) {
            return Response.json(
              { error: "⚠️ Semua AI sedang sibuk. Coba lagi dalam 1 menit." },
              { status: 429, headers: CORS }
            );
          }

          const dsData = await dsRes.json();
          if (dsData.error) throw new Error(dsData.error.message);
          
          return Response.json({ ...dsData, provider: 'deepseek' }, { status: dsRes.status, headers: CORS });
          
        } catch (dsError) {
          return Response.json(
            { error: "⚠️ Semua AI sedang tidak tersedia. Coba lagi nanti." },
            { status: 503, headers: CORS }
          );
        }
      } else {
        return Response.json(
          { error: "⚠️ Groq sibuk dan DeepSeek belum dikonfigurasi." },
          { status: 503, headers: CORS }
        );
      }
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
