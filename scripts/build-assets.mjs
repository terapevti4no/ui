import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('../assets/terapevti4no.svg', import.meta.url), 'utf8');
const artwork = source.match(/<symbol[^>]*>([\s\S]*?)<\/symbol>/)?.[1];
if (!artwork) throw new Error('The brand SVG must contain the mark symbol.');
const favicon = '<!-- Generated from terapevti4no.svg; do not edit. -->\n' +
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none"><rect width="48" height="48" rx="13" fill="#eff3eb"/>' +
  artwork.trim().replaceAll('currentColor', '#557661') + '</svg>\n';
const destination = new URL('../assets/terapevti4no-favicon.svg', import.meta.url);
if (process.argv.includes('--check')) {
  if (await readFile(destination, 'utf8') !== favicon) throw new Error('Favicon differs from its source; run npm run build:assets.');
} else {
  await writeFile(destination, favicon);
}
