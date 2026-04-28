import { useCanvasStore, type ModelId } from './store';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  images?: string[]; // base64 for Ollama native
}

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

function getBase64Data(dataUrl: string): string {
  // strip "data:image/...;base64,"
  return dataUrl.split(',')[1] ?? dataUrl;
}

export async function ollamaChat(
  messages: OllamaMessage[],
  model?: ModelId,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const { ollamaUrl, selectedModel } = useCanvasStore.getState();
  const usedModel = model ?? selectedModel;

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: usedModel,
      messages,
      stream: !!onChunk,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  if (!onChunk) {
    const data = await response.json();
    return data.message?.content ?? '';
  }

  // Streaming
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const chunk = parsed.message?.content ?? '';
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
}

export async function ollamaGenerate(
  prompt: string,
  model?: ModelId,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const { ollamaUrl, selectedModel } = useCanvasStore.getState();
  const usedModel = model ?? selectedModel;

  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: usedModel, prompt, stream: !!onChunk }),
  });

  if (!response.ok) throw new Error(`Ollama error: ${response.status}`);

  if (!onChunk) {
    const data: OllamaGenerateResponse = await response.json();
    return data.response;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed: OllamaGenerateResponse = JSON.parse(line);
        if (parsed.response) {
          full += parsed.response;
          onChunk(full);
        }
      } catch { /* skip */ }
    }
  }

  return full;
}

export async function ollamaVision(
  prompt: string,
  imageDataUrl: string,
  model?: ModelId,
  onChunk?: (chunk: string) => void,
  systemPrompt?: string
): Promise<string> {
  const { ollamaUrl, selectedModel } = useCanvasStore.getState();
  const usedModel = model ?? selectedModel;
  const base64 = getBase64Data(imageDataUrl);

  const response = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: usedModel,
      stream: !!onChunk,
      messages: [
        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
        {
          role: 'user',
          content: prompt,
          images: [base64],
        },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Ollama vision error: ${response.status}`);

  if (!onChunk) {
    const data = await response.json();
    return data.message?.content ?? '';
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const lines = decoder.decode(value).split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const chunk = parsed.message?.content ?? '';
        if (chunk) { full += chunk; onChunk(full); }
      } catch { /* skip */ }
    }
  }

  return full;
}

export async function checkOllamaConnection(): Promise<string[]> {
  const { ollamaUrl } = useCanvasStore.getState();
  const response = await fetch(`${ollamaUrl}/api/tags`);
  if (!response.ok) throw new Error('Not reachable');
  const data = await response.json();
  return (data.models ?? []).map((m: { name: string }) => m.name);
}
