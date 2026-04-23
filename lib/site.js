export const ADMIN_CODE = process.env.NEXT_PUBLIC_ADMIN_CODE || '1040';
export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'aura-design-assets';
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
export const DEFAULT_PROJECT_DESCRIPTION = 'Shared via Aura Design.';

export const categoryOptions = [
  { value: 'branding', label: 'Branding' },
  { value: 'flyer', label: 'Flyer' },
  { value: 'social', label: 'Social Media' },
  { value: 'print', label: 'Print' },
  { value: 'ui', label: 'UI / UX' },
  { value: 'menu', label: 'Menu' }
];

export function getCategoryLabel(value) {
  return categoryOptions.find((item) => item.value === value)?.label || 'Design';
}

export function formatDate(value) {
  if (!value) return 'Just now';
  return new Date(value).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFileName(name) {
  return String(name || 'upload')
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeDescription(value) {
  const trimmed = String(value || '').trim();
  return trimmed || DEFAULT_PROJECT_DESCRIPTION;
}

export function createProjectId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  throw new Error('Secure UUID generation is not available in this browser.');
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return Boolean(url && key && !url.includes('YOUR_PROJECT_ID') && !key.includes('YOUR_SUPABASE_ANON_KEY'));
}

export function trimTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

export function getPublicSiteUrl() {
  const configured = trimTrailingSlash(process.env.NEXT_PUBLIC_SITE_URL);
  if (configured) return configured;
  // Fallback to the current origin so local development still generates working links.
  if (typeof window !== 'undefined') return `${trimTrailingSlash(window.location.origin)}${BASE_PATH}`;
  return '';
}

export function buildReviewUrl(projectId) {
  return `${getPublicSiteUrl()}/review?project=${encodeURIComponent(projectId)}`;
}

export function getStatusLabel(status) {
  return (
    {
      pending: 'Awaiting Review',
      approved: 'Approved',
      needs_changes: 'Needs Changes'
    }[status] || 'Awaiting Review'
  );
}

export function getStatusTone(status) {
  return (
    {
      pending: 'info',
      approved: 'success',
      needs_changes: 'warning'
    }[status] || 'info'
  );
}
