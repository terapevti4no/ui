import { readFile, writeFile } from 'node:fs/promises';
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const file = new URL('../styles/ui.css', import.meta.url);
const before = await readFile(file, 'utf8');
const after = before.replace(/@terapevti4no\/ui v\d+\.\d+\.\d+/, `@terapevti4no/ui v${pkg.version}`);
if (process.argv.includes('--check')) {
  if (before !== after) throw new Error('Stylesheet version differs; run npm run version.');
} else if (before !== after) await writeFile(file, after);
