import { readFile, readdir, mkdir } from 'node:fs/promises';
import { resolve, join, extname, basename } from 'node:path';
import vm from 'node:vm';

const site = resolve(import.meta.dirname, '..');
const source = resolve(site, '..');
const dataText = await readFile(join(source, 'data.js'), 'utf8');
const context = { window: {} };
vm.runInNewContext(dataText, context, { timeout: 5000 });
const original = context.window.INSPIRATION_DATA;
if (!original || !Array.isArray(original.items)) throw new Error('无法读取原目录的 data.js');

function stripSensitiveUrlParams(value) {
  if (typeof value === 'string') {
    if (!/^https?:\/\//i.test(value)) return value;
    try {
      const url = new URL(value);
      if (url.hostname === 'xiaohongshu.com' || url.hostname.endsWith('.xiaohongshu.com')) {
        url.search = '';
        url.hash = '';
      } else {
        for (const key of [...url.searchParams.keys()]) {
          if (/(?:api[_-]?key|token|secret|auth|signature|credential|password)/i.test(key)) url.searchParams.delete(key);
        }
      }
      return url.href;
    } catch { return value; }
  }
  if (Array.isArray(value)) return value.map(stripSensitiveUrlParams);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, stripSensitiveUrlParams(entry)]));
  return value;
}

const photoSource = join(site, 'public', 'photo');
async function listImages(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) found.push(...await listImages(join(directory, entry.name), name));
    else if (entry.isFile() && /\.(jpe?g|png|webp|gif|bmp|avif)$/i.test(entry.name)) found.push(name);
  }
  return found;
}
const files = (await listImages(photoSource)).sort();
const byId = new Map(original.items.map(item => [item.id, item]));
const items = files.map(id => {
  const filename = basename(id);
  const existing = byId.get(id);
  const src = `/photo/${id.split('/').map(encodeURIComponent).join('/')}`;
  return existing
    ? { ...stripSensitiveUrlParams(existing), src }
    : { id, filename, src, title: filename.slice(0, -extname(filename).length), author: '未知作者', body: '', likes: '', likesValue: 0, saves: '', url: '', metadata: {}, modified: 0, ai_tags: null };
});
await mkdir(join(site, 'src'), { recursive: true });
const data = { updatedAt: original.updatedAt, items };
await import('node:fs/promises').then(({ writeFile }) => writeFile(join(site, 'src', 'data.json'), JSON.stringify(data), 'utf8'));
console.log(`已同步 ${items.length} 张图片，其中 ${items.filter(item => item.ai_tags).length} 张带 AI 标签。`);
