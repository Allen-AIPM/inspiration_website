import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const candidates = [join(root, 'index.html')];

async function addTextFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) await addTextFiles(file);
    else if (/\.(?:js|jsx|mjs|json|html|css|txt)$/i.test(entry.name)) candidates.push(file);
  }
}

await addTextFiles(join(root, 'src'));
const patterns = [
  /(?:sk-[A-Za-z0-9_-]{16,}|AIza[0-9A-Za-z_-]{20,}|ghp_[A-Za-z0-9]{20,})/,
  /[?&](?:api[_-]?key|[a-z0-9_-]*token|secret|auth|signature|credential|password)=/i,
];
const exposed = [];
for (const file of candidates) {
  const text = await readFile(file, 'utf8');
  if (patterns.some(pattern => pattern.test(text))) exposed.push(file.slice(root.length + 1));
}
if (exposed.length) {
  console.error(`Potential credential or signed URL found in public source: ${exposed.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Public source credential scan passed.');
}
