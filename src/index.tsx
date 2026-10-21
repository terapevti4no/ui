import { useEffect, useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { applyDocumentPreferences, readPreferences, savePreferences, type PreferenceOptions, type Lang, type Theme } from './preferences.js';
export * from './preferences.js';

const brandLogoUrl = new URL('../assets/terapevti4no.svg?no-inline', import.meta.url).href;
export const faviconUrl = new URL('../assets/terapevti4no-favicon.svg?no-inline', import.meta.url).href;
const labels = {
  ru: { brand: 'терапевтично', allTools: 'Все инструменты', language: 'Язык', dark: 'Тёмная тема', light: 'Светлая тема' },
  en: { brand: 'terapevti4no', allTools: 'All tools', language: 'Language', dark: 'Dark theme', light: 'Light theme' },
};
const classes = (...values: (string | undefined | false)[]) => values.filter(Boolean).join(' ');

export function Icon({ name, ...props }: ComponentPropsWithoutRef<'svg'> & { name: 'sun' | 'moon' | 'info' | 'expand' | 'arrow' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    {name === 'sun' ? <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/></> :
      name === 'moon' ? <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z"/> :
      name === 'info' ? <><circle cx="12" cy="12" r="9"/><path d="M12 10v7m0-11v2"/></> :
      name === 'expand' ? <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/> : <path d="M4 12h16m-6-6 6 6-6 6"/>}
  </svg>;
}

export function BrandLogo({ lang, href, className, ...props }: ComponentPropsWithoutRef<'a'> & { lang: Lang }) {
  return <a {...props} className={classes('brand terapevti4no-brand', className)} href={href} aria-label={labels[lang].brand}>
    <svg className="brand-mark" width="34" height="34" viewBox="0 0 48 48" fill="none" aria-hidden="true"><use href={`${brandLogoUrl}#mark`}/></svg>
    <span>{labels[lang].brand}</span>
  </a>;
}

export type ToolName = 'emdrdot' | 'breaze' | 'underground';

export function ToolLogo({ name, className }: { name: ToolName; className?: string }) {
  return <span className={classes('brand tool-logo', className)} role="img" aria-label={name === 'emdrdot' ? 'EMDR Dot' : name === 'underground' ? 'Underground' : 'Breaze'}>
    {name === 'underground' ? <><svg className="brand-mark underground-mark" width="28" height="30" viewBox="0 0 56 62" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" aria-hidden="true"><path d="M6 25Q28 41 50 25"/><path d="M11 38Q28 50 45 38" opacity=".6"/><path d="M17 51Q28 58 39 51" opacity=".32"/><path d="M28 4v20m-7-7 7 7 7-7"/></svg><span aria-hidden="true"><span className="underground-prefix">under</span>ground</span></> : name === 'emdrdot' ? <><span className="brand-mark" aria-hidden="true"><i/><i/><i/></span><span aria-hidden="true">emdr<span className="brand-dot">dot</span></span></> : <><svg className="brand-mark breaze-mark" width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M3 11h17c6 0 6-8 1-8-3 0-4 2-4 3"/><path d="M3 16h23c5 0 5 7 1 7" opacity=".65"/><path d="M3 21h10c6 0 6 8 1 8-2 0-3-1-3-2" opacity=".4"/></svg><span aria-hidden="true">breaze</span></>}
  </span>;
}

export function ThemeToggle({ theme, lang, onChange }: { theme: Theme; lang: Lang; onChange: (theme: Theme) => void }) {
  const label = theme === 'light' ? labels[lang].dark : labels[lang].light;
  return <button className="theme-button" type="button" aria-label={label} title={label} onClick={() => onChange(theme === 'light' ? 'dark' : 'light')}><Icon name={theme === 'light' ? 'moon' : 'sun'}/></button>;
}

export function LanguageSwitch({ lang, onChange }: { lang: Lang; onChange: (lang: Lang) => void }) {
  return <div className="languages" role="group" aria-label={labels[lang].language}>
    {(['ru', 'en'] as const).map(value => <button key={value} type="button" lang={value} aria-pressed={lang === value} onClick={() => onChange(value)}>{value.toUpperCase()}</button>)}
  </div>;
}

type HeaderProps = { lang: Lang; theme: Theme; onLanguageChange: (lang: Lang) => void; onThemeChange: (theme: Theme) => void; homeHref?: string; tool?: ToolName; toolHref?: string };
export function Header({ lang, theme, onLanguageChange, onThemeChange, homeHref = '/', tool, toolHref = './' }: HeaderProps) {
  return <header className={classes('header', !!tool && 'header-with-tool')}>
    <div className="brand-pair"><BrandLogo lang={lang} href={homeHref}/>{tool && <><span className="brand-separator" aria-hidden="true"/><a href={toolHref}><ToolLogo name={tool}/></a></>}</div>
    <div className="preferences">{tool && <a className="all-tools-link" href={homeHref} aria-label={labels[lang].allTools} title={labels[lang].allTools}><Icon name="arrow"/><span>{labels[lang].allTools}</span></a>}<LanguageSwitch lang={lang} onChange={onLanguageChange}/><span className="divider" aria-hidden="true"/><ThemeToggle lang={lang} theme={theme} onChange={onThemeChange}/></div>
  </header>;
}

export function Container({ children, className, width = 'responsive' }: { children: ReactNode; className?: string; width?: 'responsive' | 'narrow' | 'wide' }) {
  return <div className={classes('ui-container', `ui-container-${width}`, className)}>{children}</div>;
}

export function PageIntro({ eyebrow, title, description, id = 'page-title' }: { eyebrow?: string; title: string; description?: string; id?: string }) {
  return <section className="intro" aria-labelledby={id}>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 id={id}>{title}</h1>{description && <p className="intro-copy">{description}</p>}</section>;
}

export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return <aside className={classes('ui-note', className)}><Icon name="info"/>{children}</aside>;
}

export function Footer({ brand, children }: { brand: string; children: ReactNode }) {
  return <footer className="page-footer">{brand}<span aria-hidden="true">·</span>{children}</footer>;
}

export function PageLayout({ children, footer, className, width, ...header }: HeaderProps & { children: ReactNode; footer?: ReactNode; className?: string; width?: 'responsive' | 'narrow' | 'wide' }) {
  return <div className="app-shell"><Header {...header}/><main id="main" className={classes('ui-main', className)}><Container width={width}>{children}</Container></main>{footer}</div>;
}

export function usePreferences({ storageKey, fallbackKeys = [] }: PreferenceOptions) {
  const [initial] = useState(() => readPreferences({ storageKey, fallbackKeys }));
  const [lang, setLang] = useState(initial.lang);
  const [theme, setTheme] = useState(initial.theme);
  useEffect(() => {
    applyDocumentPreferences({ lang, theme });
    savePreferences(storageKey, { lang, theme });
  }, [storageKey, lang, theme]);
  return { lang, setLang, theme, setTheme };
}
