import { useCanvasStore, type ModelId } from './store';

interface MimoMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

interface MimoChoice {
  message: { content: string };
  delta?: { content?: string };
}

interface MimoResponse {
  choices: MimoChoice[];
}

function getBaseUrl(): string {
  const { mimoBaseUrl } = useCanvasStore.getState();
  const url = mimoBaseUrl.replace(/\/+$/, '');
  // Use Vite proxy in dev to avoid CORS
  if (window.location.port === '3005') {
    return '/api/mimo';
  }
  return url;
}

function getApiKey(): string {
  const { mimoApiKey } = useCanvasStore.getState();
  if (!mimoApiKey) throw new Error('Mimo API key not set. Click "⚙ API Settings" in the toolbar to configure.');
  return mimoApiKey;
}

function resolveModel(model?: ModelId): string {
  const { mimoModel, selectedModel } = useCanvasStore.getState();
  if (model && model !== selectedModel) return model;
  const resolved = mimoModel || 'mimo-v2-omni';
  // Sanitize legacy values
  const bad = ['mimo/mimo-v2.5-pro', 'MiMo-V2.5-Pro', 'mimo/mimo-v2.5', 'mimo-v2.5-pro'];
  if (bad.includes(resolved)) return 'mimo-v2-omni';
  return resolved;
}

export async function mimoChat(
  messages: MimoMessage[],
  model?: ModelId,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const usedModel = resolveModel(model);

  const body: Record<string, unknown> = {
    model: usedModel,
    messages,
    stream: !!onChunk,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Mimo API error: ${response.status} ${response.statusText} ${errText}`);
    }

    if (!onChunk) {
      const data: MimoResponse = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    }

    // Streaming (SSE)
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed: MimoResponse = JSON.parse(payload);
          const chunk = parsed.choices?.[0]?.delta?.content ?? '';
          if (chunk) {
            full += chunk;
            onChunk(full);
          }
        } catch {
          // skip malformed
        }
      }
    }

    return full;
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Mimo API request timed out (2 min). The prompt may be too complex.');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function mimoVision(
  prompt: string,
  imageDataUrl: string,
  model?: ModelId,
  onChunk?: (chunk: string) => void,
  systemPrompt?: string
): Promise<string> {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const usedModel = resolveModel(model);

  // Use OpenAI-compatible vision format (same /chat/completions endpoint)
  const messages: MimoMessage[] = [
    ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: imageDataUrl } },
        { type: 'text', text: prompt },
      ],
    },
  ];

  const body: Record<string, unknown> = {
    model: usedModel,
    messages,
    stream: !!onChunk,
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`Mimo vision error: ${response.status} ${response.statusText} ${errText}`);
    }

    if (!onChunk) {
      const data: MimoResponse = await response.json();
      return data.choices?.[0]?.message?.content ?? '';
    }

    // Streaming (SSE)
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let full = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value);
      const lines = text.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed: MimoResponse = JSON.parse(payload);
          const chunk = parsed.choices?.[0]?.delta?.content ?? '';
          if (chunk) {
            full += chunk;
            onChunk(full);
          }
        } catch {
          // skip malformed
        }
      }
    }

    return full;
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('Mimo vision request timed out (2 min). The image may be too large.');
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkMimoConnection(): Promise<boolean> {
  try {
    const apiKey = getApiKey();
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}/models`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}
