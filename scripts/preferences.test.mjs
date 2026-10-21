import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readPreferences, savePreferences, preferenceBootstrap } from '../dist/preferences.js';

function environment(t, records = {}) {
  const keys = ['localStorage', 'matchMedia', 'navigator'];
  const original = new Map(keys.map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const data = new Map(Object.entries(records));
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } });
  Object.defineProperty(globalThis, 'matchMedia', { configurable: true, value: () => ({ matches: true }) });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { languages: ['en-US'], language: 'en-US' } });
  t.after(() => { for (const key of keys) { const descriptor = original.get(key); if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; } });
  return data;
}

test('keeps own preferences and uses fallback fields without changing timer settings', t => {
  const data = environment(t, { 'emdrdot:v1': JSON.stringify({ settings: { cycles: 42 }, lang: 'ru' }), 'terapevti4no:v1': JSON.stringify({ lang: 'en', theme: 'dark' }) });
  assert.deepEqual(readPreferences({ storageKey: 'emdrdot:v1', fallbackKeys: ['terapevti4no:v1'] }), { lang: 'ru', theme: 'dark' });
  savePreferences('emdrdot:v1', { lang: 'en', theme: 'light' });
  assert.deepEqual(JSON.parse(data.get('emdrdot:v1')), { settings: { cycles: 42 }, lang: 'en', theme: 'light' });
});

test('invalid records and unavailable storage fall back to browser preferences', t => {
  environment(t, { bad: 'null', fallback: '[]' });
  assert.deepEqual(readPreferences({ storageKey: 'bad', fallbackKeys: ['fallback'] }), { lang: 'en', theme: 'light' });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } } });
  assert.deepEqual(readPreferences({ storageKey: 'blocked' }), { lang: 'en', theme: 'light' });
  assert.doesNotThrow(() => savePreferences('blocked', { lang: 'ru', theme: 'dark' }));
});

test('blocking head script reads the same legacy settings before first paint', () => {
  const document = { documentElement: { dataset: {}, lang: '' }, querySelector: () => null };
  vm.runInNewContext(preferenceBootstrap({ storageKey: 'emdrdot:v1' }), {
    document, localStorage: { getItem: () => '{"lang":"ru","theme":"dark","settings":{"cycles":31}}' },
    navigator: { language: 'en' }, matchMedia: () => ({ matches: true }),
  });
  assert.equal(document.documentElement.lang, 'ru');
  assert.equal(document.documentElement.dataset.theme, 'dark');
});


test('saving preferences replaces a malformed legacy record with a valid record', t => {
  const data = environment(t, { broken: '{invalid' });
  savePreferences('broken', { lang: 'ru', theme: 'dark' });
  assert.deepEqual(JSON.parse(data.get('broken')), { lang: 'ru', theme: 'dark' });
});
