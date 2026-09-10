import type { ModelRecord } from '../types/model';

const API_URL = import.meta.env.VITE_MODELS_API_URL || '/api/models';

const fallbackModels: ModelRecord[] = [
  { id: 'meta-llama/Llama-3.1-8B', author: 'meta-llama', name: 'Llama 3.1 8B (Instruct)', family: 'Llama (Meta)', pipelineTag: 'text-generation', architecture: 'Dense', useCase: 'Text Generation', weightFormat: 'BF16', tags: ['text-generation', 'llama', 'safetensors'], downloads: 0, likes: 0, safetensorFiles: 201, parameterLabel: '8B', lastModified: '2025-01-15' },
  { id: 'Qwen/Qwen3-14B', author: 'Qwen', name: 'Qwen3 14B Dense', family: 'Qwen (Alibaba)', pipelineTag: 'text-generation', architecture: 'Dense', useCase: 'Text Generation', weightFormat: 'BF16', tags: ['text-generation', 'qwen', 'safetensors'], downloads: 0, likes: 0, safetensorFiles: 5, parameterLabel: '14B', lastModified: '2025-01-15' },
  { id: 'deepseek-ai/DeepSeek-R1', author: 'deepseek-ai', name: 'DeepSeek R1 671B MoE (Reasoning)', family: 'DeepSeek', pipelineTag: 'reasoning', architecture: 'MoE', useCase: 'Reasoning', weightFormat: 'BF16', tags: ['reasoning', 'deepseek', 'safetensors'], downloads: 0, likes: 0, safetensorFiles: 163, parameterLabel: '671B', lastModified: '2025-01-15' },
];

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  return fallback;
}

function readSafetensorCount(value: unknown, fallback: number): number | null {
  if (typeof value === 'string' && value.trim().toUpperCase() === 'TBD') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return Number(value);
  return fallback > 0 ? fallback : null;
}

function normalizeModel(raw: Record<string, unknown>): ModelRecord {
  const id = String(raw.id || 'unknown/model');
  const hfTags = raw.hf_tags as Record<string, unknown> | undefined;
  const tags = Array.isArray(raw.tags) ? raw.tags.map(String) : Array.isArray(hfTags?.all_tags) ? hfTags.all_tags.map(String) : [];
  const pipelineTag = String(raw.pipeline_tag || hfTags?.pipeline_tag || tags.find((tag) => tag.includes('-')) || 'other');
  const config = raw.config as { architectures?: unknown } | undefined;
  const architecture = String(raw.architecture_category || (Array.isArray(config?.architectures) ? config.architectures[0] : '') || 'Unspecified');
  const name = String(raw.display_name || id.split('/').pop()?.replace(/[-_]/g, ' ') || id);
  const family = String(raw.family || name.split(' ')[0] || 'Other');
  const siblings = Array.isArray(raw.siblings) ? raw.siblings : [];
  const siblingCount = siblings.filter((file) => typeof file === 'object' && String((file as Record<string, unknown>).rfilename || '').endsWith('.safetensors')).length;
  const safetensorFiles = readSafetensorCount(raw.safetensor_file_count, siblingCount);
  const parameterLabel = name.match(/\b\d+(?:\.\d+)?(?:x\d+)?[BM]\b/i)?.[0].toUpperCase() || '—';
  return { id, author: String(raw.author_namespace || raw.author || id.split('/')[0] || 'community'), name, family, pipelineTag, architecture, useCase: String(raw.use_case || pipelineTag), weightFormat: String(raw.weight_format || tags.find((tag) => /^(bf16|fp16|int8|int4)/i.test(tag)) || 'Unspecified'), repoUrl: typeof raw.repo_url === 'string' ? raw.repo_url : `https://huggingface.co/${id}`, tags, downloads: readNumber(raw.downloads), likes: readNumber(raw.likes), safetensorFiles, parameterLabel, lastModified: String(raw.lastModified || new Date().toISOString()) };
}

function extractModels(payload: unknown): Record<string, unknown>[] {
  const records = Array.isArray(payload) ? payload : typeof payload === 'object' && payload !== null && Array.isArray((payload as { models?: unknown }).models) ? (payload as { models: unknown[] }).models : [];
  return records.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null);
}

export class ModelRepository {
  private requestController: AbortController | null = null;

  private cacheModels(models: ModelRecord[]): void {
    const serialized = JSON.stringify(models);
    const temporaryKey = 'atlas-model-cache.pending';
    localStorage.setItem(temporaryKey, serialized);
    localStorage.setItem('atlas-model-cache', serialized);
    localStorage.removeItem(temporaryKey);
  }

  private readCache(): ModelRecord[] {
    try {
      const cached = localStorage.getItem('atlas-model-cache');
      if (!cached) return fallbackModels;
      const models = JSON.parse(cached) as unknown;
      return Array.isArray(models) ? models as ModelRecord[] : fallbackModels;
    } catch {
      return fallbackModels;
    }
  }

  fetchModels(query: string): Promise<{ models: ModelRecord[]; fromCache: boolean }> {
    if (!navigator.onLine) return Promise.resolve({ models: this.readCache(), fromCache: true });
    if (this.requestController) this.requestController.abort();
    this.requestController = new AbortController();
    const url = new URL(API_URL, window.location.origin);
    if (API_URL.includes('huggingface.co')) {
      url.searchParams.set('limit', '100');
      url.searchParams.set('full', 'true');
      if (query.trim()) url.searchParams.set('search', query.trim());
    }
    return fetch(url, { signal: this.requestController.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Model API responded with ${response.status}`);
        return response.json() as Promise<unknown>;
      })
      .then((payload) => {
        const models = extractModels(payload).map(normalizeModel);
        this.cacheModels(models);
        return { models, fromCache: false };
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return Promise.reject(error);
        return { models: this.readCache(), fromCache: true };
      });
  }
}

export { fallbackModels };