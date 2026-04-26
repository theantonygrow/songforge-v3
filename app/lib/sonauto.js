const API_BASE = 'https://api.sonauto.ai/v1';

export function getApiKey() {
  return process.env.SONAUTO_API_KEY || '';
}

export function requireApiKey() {
  const key = getApiKey();
  if (!key) {
    const err = new Error('Server API key is not configured. Add SONAUTO_API_KEY to deployment secrets to enable real generation.');
    err.status = 500;
    throw err;
  }
  return key;
}

export async function callSonauto(path, options = {}) {
  const key = requireApiKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    cache: 'no-store',
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { rawText: text };
  }

  if (!res.ok) {
    const err = new Error(data?.detail || data?.error || `Sonauto API error: ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function normalizeStatus(raw) {
  const s = String(raw?.status || raw?.state || raw?.task_status || '').toUpperCase();
  if (['SUCCESS', 'SUCCEEDED', 'COMPLETE', 'COMPLETED', 'READY', 'DONE'].includes(s)) return 'SUCCESS';
  if (['FAILURE', 'FAILED', 'ERROR', 'CANCELED', 'CANCELLED'].includes(s)) return 'FAILURE';
  if (['RUNNING', 'PROCESSING', 'GENERATING', 'IN_PROGRESS', 'STARTED'].includes(s)) return 'RUNNING';
  if (['PENDING', 'QUEUED', 'SUBMITTED'].includes(s)) return 'QUEUED';
  return s || 'UNKNOWN';
}

export function extractTaskId(raw) {
  return raw?.task_id || raw?.taskId || raw?.id || raw?.generation_id || raw?.generationId || null;
}

export function extractSongPaths(raw) {
  const candidates = [
    raw?.song_paths,
    raw?.songPaths,
    raw?.songs,
    raw?.audio_urls,
    raw?.audioUrls,
    raw?.result?.song_paths,
    raw?.result?.songs,
  ].filter(Boolean);

  for (const item of candidates) {
    if (Array.isArray(item)) {
      return item.map((v) => typeof v === 'string' ? v : (v?.url || v?.audio_url || v?.song_path)).filter(Boolean);
    }
  }

  const single = raw?.audioUrl || raw?.audio_url || raw?.song_path || raw?.url || raw?.result?.audioUrl || raw?.result?.audio_url;
  return single ? [single] : [];
}
