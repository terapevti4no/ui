export type Lang = 'ru' | 'en';
export type Theme = 'light' | 'dark';
export type Preferences = { lang: Lang; theme: Theme };
export type PreferenceOptions = { storageKey: string; fallbackKeys?: string[] };

// Keep this function self-contained: its compiled source also powers the blocking
// head script so saved themes are applied before the first paint.
export function readPreferences({ storageKey, fallbackKeys = [] }: PreferenceOptions): Preferences {
  const read = (key: string): Record<string, unknown> => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch { return {}; }
  };
  const records = [storageKey, ...fallbackKeys].map(read);
  const lang = records.map(record => record.lang).find(value => value === 'ru' || value === 'en');
  const theme = records.map(record => record.theme).find(value => value === 'light' || value === 'dark');
  const locale = typeof navigator === 'undefined' ? 'en' : navigator.languages?.[0] || navigator.language || 'en';
  return {
    lang: lang === 'ru' || lang === 'en' ? lang : locale.toLowerCase().split('-')[0] === 'ru' ? 'ru' : 'en',
    theme: theme === 'light' || theme === 'dark' ? theme : typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  };
}

export function savePreferences(storageKey: string, preferences: Preferences): void {
  try {
    let value: unknown;
    try { value = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { value = {}; }
    const previous = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    localStorage.setItem(storageKey, JSON.stringify({ ...previous, ...preferences }));
  } catch { /* Storage is optional; theme and language still work in memory. */ }
}

export function applyDocumentPreferences({ lang, theme }: Preferences): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = lang;
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#171d1a' : '#f6f5f0');
}

export function preferenceBootstrap(options: PreferenceOptions): string {
  const config = JSON.stringify(options).replaceAll('<', '\\u003c');
  return `(()=>{const p=(${readPreferences.toString()})(${config});document.documentElement.lang=p.lang;document.documentElement.dataset.theme=p.theme;document.querySelector('meta[name="theme-color"]')?.setAttribute('content',p.theme==='dark'?'#171d1a':'#f6f5f0');})();`;
}
