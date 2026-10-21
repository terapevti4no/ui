import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup as render } from 'react-dom/server';
import { Header, PageIntro, InfoNote, PageLayout, Footer } from '../dist/index.js';
const preferences = { lang: 'ru', theme: 'light', onLanguageChange() {}, onThemeChange() {} };

test('one shared header supplies accessible theme/language controls and optional tool branding', () => {
  const home = render(h(Header, preferences));
  const tool = render(h(Header, { ...preferences, tool: 'emdrdot' }));
  assert.match(home, /терапевтично/);
  assert.match(home, /aria-label="Тёмная тема"/);
  assert.match(home, /aria-pressed="true"/);
  assert.doesNotMatch(home, /brand-separator/);
  assert.match(tool, /brand-separator/);
  assert.match(tool, /aria-label="EMDR Dot"/);
});

test('intro contains text only, without decorative EMDR dots', () => {
  const html = render(h(PageIntro, { eyebrow: 'НЕБОЛЬШИЕ ПОМОЩНИКИ', title: 'Больше внимания практике', description: 'Выберите инструмент' }));
  assert.match(html, /<h1 id="page-title">Больше внимания практике<\/h1>/);
  assert.doesNotMatch(html, /path-preview|<i|<svg/);
});

test('layout owns one main container and the common information icon/footer', () => {
  const html = render(h(PageLayout, { ...preferences, footer: h(Footer, { brand: 'ТЕРАПЕВТИЧНО' }, 'С вниманием к простому') }, h(InfoNote, {}, 'Информация')));
  assert.equal((html.match(/<main/g) ?? []).length, 1);
  assert.match(html, /ui-container-responsive/);
  assert.match(html, /class="ui-note"><svg/);
  assert.match(html, /<footer/);
});
