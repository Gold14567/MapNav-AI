export type AIProvider = 'ollama' | 'openai-compatible';

export interface AISettings {
  provider: AIProvider;
  baseUrl: string;
  model: string;
  apiKey: string;
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'ollama',
  baseUrl: 'http://localhost:11434',
  model: '',
  apiKey: '',
};

const STORAGE_KEY = 'mapnav-ai-provider';

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function openAIBaseUrl(value: string): string {
  const cleaned = cleanBaseUrl(value);
  return cleaned.endsWith('/v1') ? cleaned : `${cleaned}/v1`;
}

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AI_SETTINGS };
    return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_AI_SETTINGS };
  }
}

export function saveAISettings(settings: AISettings): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...settings, baseUrl: cleanBaseUrl(settings.baseUrl) })
  );
}

export async function listAIModels(settings: AISettings): Promise<string[]> {
  const baseUrl = cleanBaseUrl(settings.baseUrl);
  if (!baseUrl) throw new Error('Enter an AI URL first.');

  if (settings.provider === 'ollama') {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}.`);
    const data = await response.json();
    return Array.isArray(data.models)
      ? data.models
          .map((model: { name?: string }) => model.name)
          .filter((name: string | undefined): name is string => Boolean(name))
      : [];
  }

  const response = await fetch(`${openAIBaseUrl(baseUrl)}/models`, {
    headers: settings.apiKey
      ? { Authorization: `Bearer ${settings.apiKey}` }
      : undefined,
  });
  if (!response.ok) throw new Error(`AI server returned HTTP ${response.status}.`);
  const data = await response.json();
  return Array.isArray(data.data)
    ? data.data
        .map((model: { id?: string }) => model.id)
        .filter((id: string | undefined): id is string => Boolean(id))
    : [];
}

async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the map image.'));
    reader.readAsDataURL(blob);
  });
}

export async function analyzeMapWithAI(
  settings: AISettings,
  imageUrl: string
): Promise<string> {
  const baseUrl = cleanBaseUrl(settings.baseUrl);
  if (!baseUrl) throw new Error('Enter an AI URL first.');
  if (!settings.model.trim()) throw new Error('Choose or enter a model first.');

  const dataUrl = await imageUrlToDataUrl(imageUrl);
  const prompt =
    'Analyze this uploaded map image for map navigation. find the visible road layout, major intersections, bridges, coastlines or water boundaries, and any navigation-relevant visual landmarks. Be concise and do not invent coordinates that are not visible. And turn this into a navigation file for leaflet';

  if (settings.provider === 'ollama') {
    const base64 = dataUrl.split(',')[1] || '';
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: settings.model.trim(),
        stream: false,
        messages: [
          {
            role: 'user',
            content: prompt,
            images: [base64],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned HTTP ${response.status}.`);
    }
    const data = await response.json();
    return data.message?.content || data.response || 'AI returned no text.';
  }

  const response = await fetch(`${openAIBaseUrl(baseUrl)}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(settings.apiKey
        ? { Authorization: `Bearer ${settings.apiKey}` }
        : {}),
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI server returned HTTP ${response.status}.`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'AI returned no text.';
}
