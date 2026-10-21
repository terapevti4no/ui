import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const repository = 'terapevti4no/ui';
const packageName = '@terapevti4no/ui';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

async function download(url, fetcher) {
  const response = await fetcher(url, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
  return response;
}

export async function updateUI({ version, projects = ['.'], check = false, fetcher = fetch }) {
  if (!/^\d+\.\d+\.\d+(?:-[\da-zA-Z.-]+)?$/.test(version ?? '')) throw new Error('Specify an exact version, e.g. --version 0.1.0.');
  if (!projects.length) throw new Error('Specify at least one project directory.');
  // Resolve the release tag once; all subsequent requests use its immutable commit.
  const ref = `v${version}`;
  const release = await (await download(`https://api.github.com/repos/${repository}/commits/${ref}`, fetcher)).json();
  if (!/^[a-f0-9]{40}$/.test(release.sha ?? '')) throw new Error('GitHub returned an invalid commit.');
  const base = `https://raw.githubusercontent.com/${repository}/${release.sha}`;
  const [packageResponse, cssResponse] = await Promise.all([
    download(`${base}/package.json`, fetcher),
    download(`${base}/styles/ui.css`, fetcher),
  ]);
  const pkg = await packageResponse.json();
  if (pkg.name !== packageName || pkg.version !== version) throw new Error('The tagged package does not match the requested UI version.');
  const css = Buffer.from(await cssResponse.arrayBuffer());
  if (!css.length) throw new Error('The downloaded stylesheet is empty.');
  const metadata = JSON.stringify({ package: packageName, repository, version, ref, commit: release.sha, sha256: hash(css) }, null, 2) + '\n';
  // Check every destination before modifying any of them.
  const destinations = [];
  for (const project of projects) {
    const root = path.resolve(project);
    await readFile(path.join(root, 'index.html'));
    destinations.push(path.join(root, 'vendor/terapevti4no-ui'));
  }
  if (check) {
    for (const dest of destinations) {
      const [actualCss, actualMetadata] = await Promise.all([
        readFile(path.join(dest, 'ui.css')),
        readFile(path.join(dest, 'version.json'), 'utf8'),
      ]);
      if (!actualCss.equals(css) || actualMetadata !== metadata) throw new Error(`UI files differ in ${dest}; run the updater without --check.`);
      console.log(`OK ${dest} (${ref}, ${release.sha.slice(0, 7)})`);
    }
  } else {
    for (const dest of destinations) {
      await mkdir(dest, { recursive: true });
      await writeFile(path.join(dest, 'ui.css'), css);
      await writeFile(path.join(dest, 'version.json'), metadata);
      console.log(`Updated ${dest} (${ref}, ${release.sha.slice(0, 7)})`);
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const check = args.includes('--check');
    if (check) args.splice(args.indexOf('--check'), 1);
    const flag = args.indexOf('--version');
    if (flag < 0 || !args[flag + 1]) throw new Error('Usage: node scripts/update-ui.mjs [--check] --version 0.1.0 [project ...]');
    const version = args[flag + 1];
    args.splice(flag, 2);
    if (args.some(arg => arg.startsWith('--'))) throw new Error('Unknown option.');
    await updateUI({ version, projects: args.length ? args : ['.'], check });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
