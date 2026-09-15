import { useState } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Save,
  Sparkles,
  Wifi,
} from 'lucide-react';
import {
  analyzeMapWithAI,
  listAIModels,
  loadAISettings,
  saveAISettings,
  type AIProvider,
  type AISettings,
} from '@/lib/aiProvider';

interface AIProviderPanelProps {
  imageUrl: string | null;
}

type Status =
  | { kind: 'idle'; text: string }
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string };

export function AIProviderPanel({ imageUrl }: AIProviderPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [settings, setSettings] = useState<AISettings>(() => loadAISettings());
  const [models, setModels] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>({ kind: 'idle', text: 'Not tested' });
  const [isTesting, setIsTesting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState('');

  const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setStatus({ kind: 'idle', text: 'Unsaved changes' });
  };

  const switchProvider = (provider: AIProvider) => {
    setSettings((current) => ({
      ...current,
      provider,
      baseUrl:
        provider === 'ollama'
          ? current.provider === 'ollama'
            ? current.baseUrl
            : 'http://localhost:11434'
          : current.provider === 'openai-compatible'
            ? current.baseUrl
            : 'http://localhost:1234',
      model: '',
    }));
    setModels([]);
    setStatus({ kind: 'idle', text: 'Provider changed' });
  };

  const testConnection = async () => {
    setIsTesting(true);
    setStatus({ kind: 'idle', text: 'Connecting...' });
    try {
      const foundModels = await listAIModels(settings);
      setModels(foundModels);
      if (!settings.model && foundModels[0]) {
        setSettings((current) => ({ ...current, model: foundModels[0] }));
      }
      setStatus({
        kind: 'success',
        text: foundModels.length
          ? `Connected · ${foundModels.length} model${foundModels.length === 1 ? '' : 's'} found`
          : 'Connected · no installed models found',
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Connection failed.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const save = () => {
    saveAISettings(settings);
    setStatus({ kind: 'success', text: 'Saved in this browser' });
  };

  const analyze = async () => {
    if (!imageUrl) return;
    setIsAnalyzing(true);
    setAnalysis('');
    try {
      saveAISettings(settings);
      const text = await analyzeMapWithAI(settings, imageUrl);
      setAnalysis(text);
      setStatus({ kind: 'success', text: 'AI analysis complete' });
    } catch (error) {
      setStatus({
        kind: 'error',
        text: error instanceof Error ? error.message : 'AI analysis failed.',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="border-b border-ink-800">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-all hover:bg-ink-800/30"
      >
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-accent-400" />
          <span className="text-sm font-semibold text-white">AI Provider</span>
          <span className="rounded-md bg-ink-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-road-400">
            {settings.provider === 'ollama' ? 'Ollama' : 'OpenAI-compatible'}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-ink-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-ink-400" />
        )}
      </button>

      {expanded && (
        <div className="animate-fade-in space-y-4 px-5 pb-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-200">Provider</label>
            <select
              value={settings.provider}
              onChange={(event) => switchProvider(event.target.value as AIProvider)}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-accent-500"
            >
              <option value="ollama">Ollama</option>
              <option value="openai-compatible">OpenAI-compatible server</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-200">AI URL</label>
            <input
              value={settings.baseUrl}
              onChange={(event) => update('baseUrl', event.target.value)}
              placeholder={settings.provider === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'}
              className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-ink-600 focus:border-accent-500"
            />
            <p className="mt-1 text-[10px] leading-tight text-ink-500">
              {settings.provider === 'ollama'
                ? 'For Ollama on this PC, the default is http://localhost:11434.'
                : 'Use the root URL of an OpenAI-compatible server; MapNav adds /v1 automatically.'}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink-200">Model</label>
            {models.length > 0 ? (
              <select
                value={settings.model}
                onChange={(event) => update('model', event.target.value)}
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-white outline-none focus:border-accent-500"
              >
                <option value="">Select a model</option>
                {models.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={settings.model}
                onChange={(event) => update('model', event.target.value)}
                placeholder="e.g. qwen2.5vl:7b"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-ink-600 focus:border-accent-500"
              />
            )}
          </div>

          {settings.provider === 'openai-compatible' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-200">API key (optional)</label>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(event) => update('apiKey', event.target.value)}
                placeholder="Only if your server requires it"
                className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-xs text-white outline-none placeholder:text-ink-600 focus:border-accent-500"
              />
              <p className="mt-1 text-[10px] leading-tight text-amber-400/80">
                This static GitHub Pages app stores the key only in your browser. Do not use a valuable cloud API key here.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={testConnection}
              disabled={isTesting}
              className="btn-ghost text-xs"
            >
              <Wifi className="h-3.5 w-3.5" />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button type="button" onClick={save} className="btn-ghost text-xs">
              <Save className="h-3.5 w-3.5" />
              Save
            </button>
          </div>

          <div
            className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[10px] leading-tight ${
              status.kind === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
                : status.kind === 'error'
                  ? 'border-red-500/30 bg-red-500/5 text-red-300'
                  : 'border-ink-800 bg-ink-900/50 text-ink-500'
            }`}
          >
            {status.kind === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : status.kind === 'error' ? (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span>{status.text}</span>
          </div>

          <button
            type="button"
            onClick={analyze}
            disabled={!imageUrl || isAnalyzing || !settings.model.trim()}
            className="btn-primary w-full text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isAnalyzing ? 'Analyzing with AI...' : 'Analyze Map with AI'}
          </button>

          {analysis && (
            <div className="max-h-44 overflow-y-auto rounded-lg border border-ink-800 bg-ink-950/60 p-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent-400">
                AI response
              </p>
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-ink-300">{analysis}</p>
            </div>
          )}

          <p className="text-[10px] leading-relaxed text-ink-500">
            If a localhost server refuses this GitHub Pages site, allow the site origin in that server's CORS/origin settings. For Ollama, you may need to allow https://gold14567.github.io.
          </p>
        </div>
      )}
    </div>
  );
}
