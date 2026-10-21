import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { updateUI } from './update-ui.mjs';

const commit = 'a'.repeat(40);
const css = ':root { --accent: #557661; }\n';
function remote({ version = '0.1.0', status = 200, assets = {}, assetPaths = Object.keys(assets), missingAsset = false } = {}) {
  const requests = [];
  const fetcher = async url => {
    requests.push(url);
    if (status !== 200) return new Response('', { status });
    if (url.includes('/commits/v')) return Response.json({ sha: commit });
    assert.ok(url.includes(`/${commit}/`), 'assets must be fetched from the resolved commit');
    if (url.endsWith('/package.json')) return Response.json({ name: '@terapevti4no/ui', version, uiAssets: assetPaths });
    if (url.endsWith('/styles/ui.css')) return new Response(css);
    for (const [asset, content] of Object.entries(assets)) if (url.endsWith('/' + asset)) return new Response(content, { status: missingAsset ? 404 : 200 });
    throw new Error(`Unexpected URL: ${url}`);
  };
  return { requests, fetcher };
}
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'ui-update-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'site');
  await mkdir(project);
  await writeFile(path.join(project, 'index.html'), '<!doctype html>');
  return { root, project, vendor: path.join(project, 'vendor/terapevti4no-ui') };
}

test('downloads the tagged commit and detects vendor drift', async t => {
  const { project, vendor } = await fixture(t);
  const { fetcher } = remote();
  await updateUI({ version: '0.1.0', projects: [project], fetcher });
  assert.equal(await readFile(path.join(vendor, 'ui.css'), 'utf8'), css);
  const manifest = JSON.parse(await readFile(path.join(vendor, 'version.json'), 'utf8'));
  assert.equal(manifest.commit, commit);
  assert.equal(manifest.ref, 'v0.1.0');
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/);
  await updateUI({ version: '0.1.0', projects: [project], fetcher, check: true });
  await writeFile(path.join(vendor, 'ui.css'), css + '/* local edit */');
  await assert.rejects(updateUI({ version: '0.1.0', projects: [project], fetcher, check: true }), /UI files differ/);
});

test('rejects invalid versions before making requests', async () => {
  const { requests, fetcher } = remote();
  for (const version of ['main', 'latest', '../main', '', undefined]) {
    await assert.rejects(updateUI({ version, fetcher }), /exact version/);
  }
  assert.equal(requests.length, 0);
});

test('rejects missing tags or mismatched package versions without changing files', async t => {
  const { project, vendor } = await fixture(t);
  await updateUI({ version: '0.1.0', projects: [project], fetcher: remote().fetcher });
  const before = await readFile(path.join(vendor, 'version.json'), 'utf8');
  await assert.rejects(updateUI({ version: '0.1.0', projects: [project], fetcher: remote({ status: 404 }).fetcher }), /404/);
  await assert.rejects(updateUI({ version: '0.1.0', projects: [project], fetcher: remote({ version: '0.2.0' }).fetcher }), /does not match/);
  assert.equal(await readFile(path.join(vendor, 'version.json'), 'utf8'), before);
});

test('validates all project directories before writing any vendor files', async t => {
  const { root, project, vendor } = await fixture(t);
  await assert.rejects(updateUI({ version: '0.1.0', projects: [project, path.join(root, 'missing')], fetcher: remote().fetcher }), /ENOENT/);
  await assert.rejects(readFile(path.join(vendor, 'ui.css')), /ENOENT/);
});


test('downloads logo assets and detects an edited SVG', async t => {
  const { project, vendor } = await fixture(t);
  const asset = 'assets/terapevti4no.svg';
  const svg = '<svg><symbol id="mark"/></svg>';
  const { fetcher } = remote({ version: '0.1.1', assets: { [asset]: svg } });
  await updateUI({ version: '0.1.1', projects: [project], fetcher });
  assert.equal(await readFile(path.join(vendor, asset), 'utf8'), svg);
  const manifest = JSON.parse(await readFile(path.join(vendor, 'version.json'), 'utf8'));
  assert.match(manifest.assets[asset], /^[a-f0-9]{64}$/);
  await updateUI({ version: '0.1.1', projects: [project], fetcher, check: true });
  await writeFile(path.join(vendor, asset), '<svg/>');
  await assert.rejects(updateUI({ version: '0.1.1', projects: [project], fetcher, check: true }), /UI asset differs/);
});

test('an unavailable logo leaves the installed release unchanged', async t => {
  const { project, vendor } = await fixture(t);
  await updateUI({ version: '0.1.0', projects: [project], fetcher: remote().fetcher });
  const before = await readFile(path.join(vendor, 'version.json'), 'utf8');
  const { fetcher } = remote({ version: '0.1.1', assets: { 'assets/terapevti4no.svg': '<svg/>' }, missingAsset: true });
  await assert.rejects(updateUI({ version: '0.1.1', projects: [project], fetcher }), /404/);
  assert.equal(await readFile(path.join(vendor, 'version.json'), 'utf8'), before);
});

test('rejects asset paths outside the vendor assets directory', async t => {
  const { project } = await fixture(t);
  const { fetcher } = remote({ assetPaths: ['../index.html'] });
  await assert.rejects(updateUI({ version: '0.1.0', projects: [project], fetcher }), /Invalid UI asset paths/);
  assert.equal(await readFile(path.join(project, 'index.html'), 'utf8'), '<!doctype html>');
});
