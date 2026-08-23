import { PROVIDERS } from '../../../lib/providers';

export async function POST(request) {
  try {
    const { messages } = await request.json();
    
    // Panggil Cloudflare langsung
    const provider = PROVIDERS.cloudflare;
    
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.models[0],
        input: {
          messages: messages
        },
        max_tokens: 2048,
      })
    });
    
    const data = await response.json();
    const content = data?.result?.response || 'No response';
    
    return Response.json({ 
      choices: [{ message: { content } }] 
    });
    
  } catch (error) {
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
