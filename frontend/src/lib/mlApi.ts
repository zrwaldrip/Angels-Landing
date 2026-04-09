const mlApiBaseUrl = (import.meta.env.VITE_ML_API_BASE_URL ?? '').replace(/\/+$/, '');
const mlApiKey = (import.meta.env.VITE_ML_API_KEY ?? '').trim();

export interface SocialEngagementWhatIfRequest {
  platform: string;
  day_of_week: string;
  post_type: string;
  media_type: string;
  call_to_action_type: string;
  content_topic: string;
  post_hour: number;
  num_hashtags: number;
  mentions_count: number;
  caption_length: number;
  has_call_to_action: boolean;
  is_boosted: boolean;
}

export interface SocialEngagementWhatIfResponse {
  predictedEngagementRate: number;
}

async function mlFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!mlApiBaseUrl) throw new Error('ML API base URL is not configured (VITE_ML_API_BASE_URL).');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (mlApiKey) headers['X-API-Key'] = mlApiKey;

  const response = await fetch(`${mlApiBaseUrl}${path}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || `ML request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export function predictSocialEngagementWhatIf(payload: SocialEngagementWhatIfRequest) {
  return mlFetch<SocialEngagementWhatIfResponse>('/predict/social-engagement', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

