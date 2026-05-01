import { useCanvasStore, type ModelId } from './store';
import { ollamaChat, ollamaVision, ollamaGenerate } from './ollama';
import { mimoChat, mimoVision } from './mimo';

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

function getBackend(): 'ollama' | 'mimo' {
  return useCanvasStore.getState().backend;
}

export async function aiChat(
  messages: AIMessage[],
  model?: ModelId,
  onChunk?: (chunk: string) => void
): Promise<string> {
  if (getBackend() === 'mimo') {
    return mimoChat(messages, model, onChunk);
  }
  return ollamaChat(messages, model, onChunk);
}

export async function aiVision(
  prompt: string,
  imageDataUrl: string,
  model?: ModelId,
  onChunk?: (chunk: string) => void,
  systemPrompt?: string
): Promise<string> {
  if (getBackend() === 'mimo') {
    return mimoVision(prompt, imageDataUrl, model, onChunk, systemPrompt);
  }
  return ollamaVision(prompt, imageDataUrl, model, onChunk, systemPrompt);
}

export async function aiGenerate(
  prompt: string,
  model?: ModelId,
  onChunk?: (chunk: string) => void
): Promise<string> {
  if (getBackend() === 'mimo') {
    // mimo doesn't have a separate generate endpoint, use chat
    return mimoChat([{ role: 'user', content: prompt }], model, onChunk);
  }
  return ollamaGenerate(prompt, model, onChunk);
}

export async function checkConnection(): Promise<{ connected: boolean; models: string[] }> {
  const backend = getBackend();
  if (backend === 'mimo') {
    const { checkMimoConnection } = await import('./mimo');
    const ok = await checkMimoConnection();
    return { connected: ok, models: ok ? ['mimo-v2-omni', 'mimo-v2.5-pro', 'mimo-v2.5', 'mimo-v2-pro'] : [] };
  }
  try {
    const { checkOllamaConnection } = await import('./ollama');
    const models = await checkOllamaConnection();
    return { connected: true, models };
  } catch {
    return { connected: false, models: [] };
  }
}
