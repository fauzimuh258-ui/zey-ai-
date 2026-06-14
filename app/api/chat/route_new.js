import { PROVIDERS, PROVIDER_ORDER } from '@/lib/providers';

export async function POST(request) {
  try {
    const { messages, provider: userProvider, mode } = await request.json();

    // MODE MANUAL: User pilih provider spesifik
    if (mode === 'manual' && userProvider) {
      try {
        const result = await callProvider(userProvider, messages, 0);
        return Response.json(result);
      } catch (error) {
        return Response.json(
          { error: `Provider ${userProvider} tidak tersedia. Coba provider lain.` },
          { status: 503 }
        );
      }
    }

    // MODE AUTO: Coba semua provider sesuai urutan
    for (const providerId of PROVIDER_ORDER) {
      try {
        const result = await callProvider(providerId, messages, 0);
        return Response.json(result);
      } catch (error) {
        console.log(`${providerId} gagal, coba berikutnya...`);
        continue;
      }
    }

    // Semua provider gagal
    return Response.json(
      { error: 'Maaf, semua AI sedang sibuk. Silakan coba lagi dalam 1 menit.' },
      { status: 503 }
    );

  } catch (error) {
    return Response.json(
      { error: 'Terjadi kesalahan. Silakan coba lagi.' },
      { status: 500 }
    );
  }
}

// Fungsi panggil provider dengan fallback model
async function callProvider(providerId, messages, modelIndex) {
  const provider = PROVIDERS[providerId];

  if (!provider) {
    throw new Error(`Provider ${providerId} tidak dikenal`);
  }

  if (modelIndex >= provider.models.length) {
    throw new Error(`Semua model di ${provider.name} gagal`);
  }

  const model = provider.models[modelIndex];
  const apiKey = provider.key;

  try {
    // Gemini pakai URL beda (query param untuk API key)
    let url = provider.url;
    if (providerId === 'gemini') {
      url = `${provider.url}?key=${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: provider.headers(apiKey),
      body: JSON.stringify(provider.formatRequest(model, messages))
    });

    // Rate limit → coba model berikutnya
    if (response.status === 429) {
      console.log(`${provider.name} rate limited, coba model lain...`);
      return callProvider(providerId, messages, modelIndex + 1);
    }

    // Model deprecated → coba model berikutnya
    if (response.status === 404 || response.status === 400) {
      console.log(`${model} tidak tersedia, coba model lain...`);
      return callProvider(providerId, messages, modelIndex + 1);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    const data = await response.json();
    const content = provider.formatResponse(data);

    return {
      success: true,
      content: content,
      provider: provider.name,
      model: model
    };

  } catch (error) {
    console.error(`${provider.name} error:`, error.message);

    // Coba model berikutnya
    if (modelIndex < provider.models.length - 1) {
      return callProvider(providerId, messages, modelIndex + 1);
    }

    throw error;
  }
}
