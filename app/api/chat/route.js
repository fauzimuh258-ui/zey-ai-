const GROQ_API_KEY = process.env.GROQ_API_KEY;
const SECRET_KEY = "vvbam988";
const DEFAULT_MODEL = "llama3-70b-8192";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(req) {
  // Auth check
  const key = req.headers.get("x-api-key");
  if (key !== SECRET_KEY) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  try {
    const body = await req.json();
    const { messages, system, model, max_tokens, temperature } = body;

    const groqMessages = system
      ? [{ role: "system", content: system }, ...messages]
      : messages;

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

    const data = await res.json();
    return Response.json(data, { status: res.status, headers: CORS });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
