import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const candidates = [join(root, 'index.html')];

async function listImages(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listImages(join(directory, entry.name), name));
    else if (entry.isFile() && /\.(?:jpe?g|png|webp|avif|gif|bmp)$/i.test(entry.name)) files.push(name);
  }
  return files;
}

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

const data = JSON.parse(await readFile(join(root, 'src', 'data.json'), 'utf8'));
const photoIds = new Set(await listImages(join(root, 'public', 'photo')));
const dataIds = new Set(data.items.map(item => item.id));
const missingPhotos = [...dataIds].filter(id => !photoIds.has(id));
const missingData = [...photoIds].filter(id => !dataIds.has(id));
if (dataIds.size !== data.items.length || missingPhotos.length || missingData.length) {
  console.error('网站图片数据与 public/photo 不一致。请在本机运行 npm run sync:data，然后重新构建。');
  if (missingPhotos.length) console.error(`数据中已不存在的图片：${missingPhotos.join(', ')}`);
  if (missingData.length) console.error(`尚未同步的图片：${missingData.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log(`Image data matches ${photoIds.size} originals.`);
}
