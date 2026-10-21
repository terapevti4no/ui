#!/usr/bin/env node
import { readFile, appendFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repository = 'terapevti4no/ui';
const packageName = '@terapevti4no/ui';
const exactVersion = /^\d+\.\d+\.\d+$/;
const compare = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };

export async function resolveRelease({ version, latest = false, fetcher = fetch }) {
  if ((!latest && !exactVersion.test(version ?? '')) || (latest && version)) throw new Error('Use --latest or one exact --version X.Y.Z.');
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  const response = await fetcher(`https://api.github.com/repos/${repository}/releases/${latest ? 'latest' : `tags/v${version}`}`, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Cannot read UI release (${response.status}). No dependencies were changed.`);
  const release = await response.json();
  const publishedVersion = release.tag_name?.replace(/^v/, '');
  if (!exactVersion.test(publishedVersion ?? '') || release.draft || release.prerelease || (!latest && version !== publishedVersion)) throw new Error('Invalid or mismatched stable UI release.');
  const filename = `terapevti4no-ui-${publishedVersion}.tgz`;
  const expectedUrl = `https://github.com/${repository}/releases/download/v${publishedVersion}/${filename}`;
  const asset = release.assets?.find(asset => asset.name === filename);
  if (!asset || asset.browser_download_url !== expectedUrl) throw new Error('The UI release has no valid npm package asset.');
  return { version: publishedVersion, url: expectedUrl };
}

export async function updateUI({ root = process.cwd(), version, latest = false, check = false, fetcher = fetch, install = (spec, cwd) => execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--save-exact', spec], { cwd, stdio: 'inherit' }) } = {}) {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (pkg.name === packageName) throw new Error('Run the updater in a consumer project, not in the UI repository.');
  const release = await resolveRelease({ version, latest, fetcher });
  const current = pkg.dependencies?.[packageName];
  const currentVersion = current?.match(/\/releases\/download\/v(\d+\.\d+\.\d+)\//)?.[1];
  if (current === release.url || (latest && currentVersion && compare(currentVersion, release.version) > 0)) {
    console.log(`UI is up to date (${currentVersion ?? release.version}).`);
    return { changed: false, version: currentVersion ?? release.version };
  }
  if (check) {
    console.log(`UI ${release.version} is available. Run npm run ui:update to install it.`);
    return { changed: false, available: true, version: release.version };
  }
  install(`${packageName}@${release.url}`, root);
  console.log(`Installed UI ${release.version}. Review package.json and package-lock.json before committing.`);
  return { changed: true, version: release.version };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const latest = args.includes('--latest') || !args.includes('--version'), check = args.includes('--check');
    if (args.includes('--latest')) args.splice(args.indexOf('--latest'), 1);
    if (check) args.splice(args.indexOf('--check'), 1);
    let version;
    const flag = args.indexOf('--version');
    if (flag >= 0) { version = args[flag + 1]; args.splice(flag, 2); }
    if (args.length) throw new Error('Usage: terapevti4no-ui (--latest | --version X.Y.Z) [--check]');
    const result = await updateUI({ latest, version, check });
    if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `changed=${result.changed}\nversion=${result.version}\n`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
