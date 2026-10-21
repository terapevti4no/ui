import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { resolveRelease, updateUI } from './update-ui.mjs';
const url = version => `https://github.com/terapevti4no/ui/releases/download/v${version}/terapevti4no-ui-${version}.tgz`;
function remote(version = '0.2.0', changes = {}) {
  return async () => Response.json({ tag_name: `v${version}`, draft: false, prerelease: false, assets: [{ name: `terapevti4no-ui-${version}.tgz`, browser_download_url: url(version) }], ...changes });
}
async function fixture(t, version = '0.1.0') {
  const root = await mkdtemp(path.join(tmpdir(), 'ui-package-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'package.json'), JSON.stringify({ name: 'consumer', dependencies: { '@terapevti4no/ui': url(version) } }));
  return root;
}

test('accepts only a stable release and the package asset from our repository', async () => {
  assert.deepEqual(await resolveRelease({ version: '0.2.0', fetcher: remote() }), { version: '0.2.0', url: url('0.2.0') });
  await assert.rejects(resolveRelease({ version: 'main', fetcher: remote() }), /exact/);
  await assert.rejects(resolveRelease({ version: '0.2.0', fetcher: remote('0.3.0') }), /mismatched/);
  await assert.rejects(resolveRelease({ latest: true, fetcher: remote('0.2.0', { prerelease: true }) }), /stable/);
  await assert.rejects(resolveRelease({ latest: true, fetcher: remote('0.2.0', { assets: [] }) }), /asset/);
});

test('updates dependencies using npm arguments without a shell and skips an installed release', async t => {
  const root = await fixture(t);
  const calls = [];
  const result = await updateUI({ root, latest: true, fetcher: remote(), install: (...args) => calls.push(args) });
  assert.equal(result.changed, true);
  assert.deepEqual(calls, [[`@terapevti4no/ui@${url('0.2.0')}`, root]]);
  assert.equal((await updateUI({ root, latest: true, fetcher: remote('0.1.0'), install() { throw Error('should skip'); } })).changed, false);
});

test('scheduled updates never downgrade; explicit versions allow a rollback', async t => {
  const root = await fixture(t, '0.3.0');
  assert.equal((await updateUI({ root, latest: true, fetcher: remote(), install() { throw Error('downgrade'); } })).changed, false);
  const calls = [];
  await updateUI({ root, version: '0.2.0', fetcher: remote(), install: (...args) => calls.push(args) });
  assert.equal(calls.length, 1);
});

test('check mode and unavailable releases do not invoke installation', async t => {
  const root = await fixture(t);
  const install = () => { throw Error('must not install'); };
  const result = await updateUI({ root, latest: true, check: true, fetcher: remote(), install });
  assert.equal(result.available, true);
  assert.equal(result.changed, false);
  await assert.rejects(updateUI({ root, latest: true, fetcher: async () => new Response('', { status: 404 }), install }), /404/);
});


test('npm bin symlink executes the CLI instead of silently returning', async t => {
  const root = await fixture(t);
  const link = path.join(root, 'terapevti4no-ui');
  await symlink(fileURLToPath(new URL('./update-ui.mjs', import.meta.url)), link);
  assert.throws(() => execFileSync(process.execPath, [link, '--unknown-option'], { encoding: 'utf8', stdio: 'pipe' }), error => {
    assert.equal(error.status, 1);
    assert.match(error.stderr, /Usage:/);
    return true;
  });
});
