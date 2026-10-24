import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import data from './data.json';
import imageManifest from './image-manifest.json';
import FoldText from './components/FoldText';
import TargetCursor from './components/TargetCursor';
import SpecularButton from './components/SpecularButton';
import PillNav from './components/PillNav';
import './style.css';

const Stack = React.lazy(() => import('./components/Stack'));

const dimensions = [
  ['space_type', '空间类型'],
  ['design_style', '设计风格'],
  ['materials', '材料元素'],
  ['color_tone', '色调氛围'],
  ['scene_usage', '适用场景'],
];
const emptyFilters = Object.fromEntries(dimensions.map(([key]) => [key, '']));
const items = data.items;
const heroImage = '/hero.webp';
const thumbnailFor = item => `/thumb/${encodeURIComponent(item.filename.replace(/\.[^.]+$/, '.webp'))}`;
const navItems = [{ label: '首页', href: '#top' }, { label: '灵感图库', href: '#gallery' }, { label: '关于', href: '#about' }];
const cursorTargets = '.cursor-target, .pill-nav__item, .stack-card[data-top], .image-button, .filter-field select, .sort select, .large img, .ai-chip';
const stackItems = [
  '20261021183200669137.jpg',
  '20261021183043462063.jpg',
  '20261021183054902324.jpg',
  '20261021183103449564.jpg',
  '20261021183151896668.jpg',
].map(filename => items.find(item => item.filename === filename)).filter(Boolean);

function readLocal(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch { return fallback; }
}
function useStoredState(key, initial) {
  const [value, setValue] = useState(() => readLocal(key, initial));
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue];
}
function validUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
function prettyDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? '' : date.toLocaleString('zh-CN', { hour12: false });
}

function App() {
  const [filters, setFilters] = useState(emptyFilters);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('new');
  const [tab, setTab] = useState('all');
  const [saved, setSaved] = useStoredState('allen-inspiration-saved', []);
  const [liked, setLiked] = useStoredState('allen-inspiration-liked', []);
  const [comments, setComments] = useStoredState('allen-inspiration-comments', {});
  const [active, setActive] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [compactNav, setCompactNav] = useState(() => window.matchMedia('(max-width: 700px)').matches);
  const [navActive, setNavActive] = useState('#top');
  const dialogRef = useRef(null);
  const openerRef = useRef(null);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)');
    const update = () => setCompactNav(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const update = () => {
      const position = window.scrollY + 180;
      const gallery = document.getElementById('gallery')?.offsetTop ?? Infinity;
      const about = document.getElementById('about')?.offsetTop ?? Infinity;
      setNavActive(position >= about ? '#about' : position >= gallery ? '#gallery' : '#top');
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  const options = useMemo(() => Object.fromEntries(dimensions.map(([key]) => [key,
    [...new Set(items.flatMap(item => item.ai_tags?.[key] || []))].sort((a, b) => a.localeCompare(b, 'zh-CN'))
  ])), []);
  const hasFilters = Object.values(filters).some(Boolean) || query.trim();
  const isLightHeader = navActive !== '#top';
  const shown = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    return items.filter(item => {
      if (tab === 'saved' && !saved.includes(item.id)) return false;
      if (dimensions.some(([key]) => filters[key] && !(item.ai_tags?.[key] || []).includes(filters[key]))) return false;
      if (!term) return true;
      return [item.title, item.author, item.body, item.filename, JSON.stringify(item.ai_tags || {})]
        .join(' ').toLocaleLowerCase().includes(term);
    }).sort(sort === 'likes'
      ? (a, b) => (b.likesValue || 0) - (a.likesValue || 0)
      : sort === 'title'
        ? (a, b) => a.title.localeCompare(b.title, 'zh-CN')
        : (a, b) => (b.modified || 0) - (a.modified || 0) || a.filename.localeCompare(b.filename));
  }, [filters, query, sort, tab, saved]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (active && !dialog.open) dialog.showModal();
    if (!active && dialog.open) dialog.close();
  }, [active]);
  useEffect(() => {
    document.body.style.overflow = active ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [active]);

  function openDetail(item, event) { openerRef.current = event.currentTarget; setCommentText(''); setActive(item); }
  function closeDetail() { setActive(null); window.setTimeout(() => openerRef.current?.focus(), 0); }
  function toggleSaved(id) { setSaved(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  function toggleLiked(id) { setLiked(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]); }
  function chooseTag(key, tag) { setFilters(current => ({ ...current, [key]: tag })); closeDetail(); document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }); }
  function submitComment(event) {
    event.preventDefault();
    const text = commentText.trim();
    if (!text || !active) return;
    const comment = { id: crypto.randomUUID(), text, at: new Date().toISOString() };
    setComments(current => ({ ...current, [active.id]: [...(current[active.id] || []), comment] }));
    setCommentText('');
  }
  function scrollToGallery() { document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth' }); }

  return <>
    {!active && <TargetCursor targetSelector={cursorTargets} cursorColor="#ffffff" cursorColorOnTarget="#f1b494" spinDuration={2.4} size={32} cornerSize={10} thickness={2} padding={7} showLabel={false} />}
    <section className="hero" id="top" style={{ '--hero-image': `url("${heroImage}")` }}>
      <header className={`site-header container${isLightHeader ? ' is-light' : ''}`}>
        <a className="brand cursor-target" href="#top" aria-label="建筑灵感库首页"><span className="brand-mark">✳</span><span>建筑灵感库<small>ALLEN'S INSPIRATION ARCHIVE</small></span></a>
        <PillNav className="header-pill-nav" items={navItems} activeHref={navActive} layout="joined" theme={isLightHeader ? 'light' : 'dark'} surface="glass" size="md" itemStyle="pill" hoverEffect="fill" indicator="dot" highlightColor="#c57755" barColor={isLightHeader ? 'rgba(255,255,255,.7)' : undefined} collapse={compactNav ? 'always' : 'never'} ariaLabel="主导航" />
        <SpecularButton className="header-specular cursor-target" size="sm" radius={10} tint="#ffffff" tintOpacity={isLightHeader ? 0.72 : 0.1} textColor={isLightHeader ? '#473c33' : '#ffffff'} lineColor={isLightHeader ? '#b96f51' : '#ffffff'} baseColor={isLightHeader ? '#d9cec2' : '#ffffff'} idleIntensity={0.36} glow={0.65} onClick={scrollToGallery}>探索灵感 ↗</SpecularButton>
      </header>
      <div className="hero-content container">
        <div className="hero-copy"><div className="hero-kicker"><span className="kicker-line" /> ARCHITECTURE · SPACE · IDEAS</div><h1 className="hero-title"><FoldText text="让建筑灵感" foldStyle="paper" splitBy="char" hinge="top" trigger="mount" duration={0.82} stagger={0.07} fontSize="inherit" fontWeight={500} color="#ffffff" /><span className="hero-title-second"><FoldText text="时刻被看见" foldStyle="paper" splitBy="char" hinge="top" trigger="mount" duration={0.82} stagger={0.07} fontSize="inherit" fontWeight={500} color="#f0b89d" /><span className="period">.</span></span></h1><p>为每一次设计思考，留下一处可以回望的空间。<br />从建筑、材料到场景，收集那些值得反复观看的瞬间。</p><SpecularButton className="hero-specular cursor-target" size="lg" radius={12} tint="#c57755" tintOpacity={0.93} textColor="#ffffff" lineColor="#ffe0ce" baseColor="#c57755" intensity={1.2} idleIntensity={0.45} glow={0.8} onClick={scrollToGallery}>开始探索 <span aria-hidden="true">↗</span></SpecularButton></div>
        <div className="hero-stack-wrap"><div className="hero-stack"><React.Suspense fallback={<img className="hero-stack-poster" src={thumbnailFor(stackItems[0])} alt={stackItems[0]?.title || '建筑灵感图片'} fetchPriority="high" />}><Stack className="hero-stack-cards" layout="fan" spread={0.62} depth={0.28} radius={20} frame={6} frameColor="#f9f5ec" tilt={14} speed={0.9} sendToBackOnClick autoplay autoplayDelay={5200} pauseOnHover cards={stackItems.map(item => <img key={item.id} src={thumbnailFor(item)} alt={item.title} width={imageManifest[item.filename]?.width} height={imageManifest[item.filename]?.height} decoding="async" />)} /></React.Suspense></div><div className="hero-stack-caption"><span>SELECTED INSPIRATIONS</span><span>点击或拖动图片 <span aria-hidden="true">↗</span></span></div></div>
      </div>
      <div className="hero-bottom container"><span>SCROLL TO EXPLORE <span aria-hidden="true">↓</span></span><span>{String(items.length).padStart(2, '0')} 个灵感片段持续生长中</span></div>
    </section>

    <main id="gallery" className="gallery-section"><div className="container">
      <div className="section-head"><div><div className="eyebrow">THE COLLECTION / 灵感档案</div><h2>探索灵感图库<span className="accent-dot">.</span></h2><p>以图像为线索，寻找空间与设计的更多可能。</p></div><div className="section-count"><strong>{String(shown.length).padStart(2, '0')}</strong><span>张灵感图片</span></div></div>
      <div className="filter-panel"><div className="filter-heading"><div><span className="filter-symbol">✳</span><strong>按灵感标签筛选</strong><span className="filter-hint">五个维度，找到更贴近想法的参考</span></div>{hasFilters && <button className="reset" type="button" onClick={() => { setFilters(emptyFilters); setQuery(''); }}>清除筛选 ×</button>}</div>
        <div className="filter-grid">{dimensions.map(([key, label]) => <label className="filter-field" key={key}><span>{label}</span><select value={filters[key]} onChange={event => setFilters(current => ({ ...current, [key]: event.target.value }))}><option value="">全部{label}</option>{options[key].map(option => <option key={option} value={option}>{option}</option>)}</select></label>)}</div>
      </div>
      <div className="toolbar"><div className="tabs" role="group" aria-label="图库范围"><button className={tab === 'all' ? 'active' : ''} onClick={() => setTab('all')} type="button">全部灵感</button><button className={tab === 'saved' ? 'active' : ''} onClick={() => setTab('saved')} type="button">我的收藏 <span>{saved.length}</span></button></div><div className="toolbar-right"><label className="search"><span className="sr-only">搜索灵感</span><span aria-hidden="true">⌕</span><input type="search" placeholder="搜索标题、作者或标签" value={query} onChange={event => setQuery(event.target.value)} /></label><label className="sort"><span className="sr-only">排序</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="new">最新采集</option><option value="likes">最多点赞</option><option value="title">标题排序</option></select></label></div></div>
      {shown.length ? <div className="grid">{shown.map(item => <article className="card" key={item.id}><button className="image-button" type="button" onClick={event => openDetail(item, event)} aria-label={`查看 ${item.title}`}><img src={thumbnailFor(item)} alt={item.title} width={imageManifest[item.filename]?.width} height={imageManifest[item.filename]?.height} loading="lazy" decoding="async" /><span className="image-overlay"><span>查看灵感 ↗</span></span></button></article>)}</div> : <div className="empty"><span>✳</span><h3>还没有找到相关灵感</h3><p>{tab === 'saved' && !saved.length ? '打开图片详情，点击收藏按钮即可保存喜欢的灵感。' : '试试更换标签或搜索关键词。'}</p></div>}
      <footer id="about" className="footer"><div><span className="footer-mark">✳</span><strong>建筑灵感库</strong><p>让每一份好设计，都成为下一次灵感的起点。</p></div><div className="footer-meta"><span>ALLEN'S INSPIRATION ARCHIVE</span><span>{data.updatedAt ? `数据更新于 ${prettyDate(data.updatedAt)}` : `${items.length} 张灵感图片`}</span></div></footer>
    </div></main>

    <dialog ref={dialogRef} className="detail-dialog" onClose={() => { setActive(null); document.body.style.overflow = ''; }} onClick={event => { if (event.target === dialogRef.current) closeDetail(); }} aria-labelledby="detail-title">
      {active && <div className="detail"><div className="large"><img src={active.src} alt={active.title} /></div><div className="info"><button className="close" type="button" onClick={closeDetail} aria-label="关闭详情">×</button><div className="eyebrow">INSPIRATION DETAILS</div><div className="creator">{active.author}</div><h2 id="detail-title">{active.title}</h2><div className="metrics"><div><strong>{active.likes || '—'}</strong>点赞</div><div><strong>{active.saves || '—'}</strong>原文收藏</div></div><div className="detail-actions">
  <SpecularButton className="detail-specular cursor-target" size="sm" radius={9} tint={liked.includes(active.id) ? '#f3dfd3' : '#fffdf9'} tintOpacity={1} textColor={liked.includes(active.id) ? '#a55636' : '#473c33'} lineColor="#c77655" baseColor="#ded4c9" idleIntensity={0.3} glow={0.55} onClick={() => toggleLiked(active.id)} aria-pressed={liked.includes(active.id)}>{liked.includes(active.id) ? '♥ 已点赞' : '♡ 点赞'}</SpecularButton>
  <SpecularButton className="detail-specular cursor-target" size="sm" radius={9} tint={saved.includes(active.id) ? '#f3dfd3' : '#fffdf9'} tintOpacity={1} textColor={saved.includes(active.id) ? '#a55636' : '#473c33'} lineColor="#c77655" baseColor="#ded4c9" idleIntensity={0.3} glow={0.55} onClick={() => toggleSaved(active.id)} aria-pressed={saved.includes(active.id)}>{saved.includes(active.id) ? '♥ 已收藏' : '♡ 收藏'}</SpecularButton>
</div><section className="ai-panel" aria-label="AI 图片标签"><h3>AI 标签</h3>{active.ai_tags ? <>{dimensions.map(([key, label]) => <div key={key}><h4>{label}</h4><div className="chips">{(active.ai_tags[key] || []).map(tag => <button className="ai-chip" type="button" key={tag} onClick={() => chooseTag(key, tag)}>{tag}</button>)}</div></div>)}<h4>图片介绍</h4><p className="ai-description">{active.ai_tags.image_description || '暂无介绍'}</p><small>{active.ai_model} · {prettyDate(active.ai_tagged_at)}</small></> : <p className="comment-note">这张图片暂未添加 AI 标签。</p>}</section><div className="body-text">{active.body || '这张图片暂未记录正文。'}</div>{validUrl(active.url) ? <a className="source" href={validUrl(active.url)} target="_blank" rel="noopener noreferrer">查看原始网页 ↗</a> : <span className="source disabled">暂无原始网页链接</span>}<section className="comments" aria-labelledby="comments-heading"><h3 id="comments-heading">评论 <span>{(comments[active.id] || []).length}</span></h3><form onSubmit={submitComment}><textarea aria-label="评论内容" placeholder="写下你的灵感或想法…" maxLength={2000} required value={commentText} onChange={event => setCommentText(event.target.value)} /><button className="comment-submit" type="submit">发布评论</button></form><p className="comment-note">评论保存在当前浏览器，仅自己可见。</p><div aria-live="polite">{(comments[active.id] || []).length ? comments[active.id].map(comment => <article className="comment-item" key={comment.id}><strong>Allen</strong><button type="button" onClick={() => setComments(current => ({ ...current, [active.id]: current[active.id].filter(value => value.id !== comment.id) }))}>删除</button><p>{comment.text}</p><time>{prettyDate(comment.at)}</time></article>) : <p className="comment-note">暂无评论，记录第一个想法吧。</p>}</div></section><details className="meta"><summary>图片与来源信息</summary><dl>{Object.entries(active.metadata || {}).map(([key, value]) => <React.Fragment key={key}><dt>{key}</dt><dd>{value || '—'}</dd></React.Fragment>)}<dt>本地文件名</dt><dd>{active.filename}</dd></dl></details></div></div>}
      {active && <TargetCursor container={dialogRef} targetSelector={cursorTargets} cursorColor="#ffffff" cursorColorOnTarget="#f1b494" spinDuration={2.4} size={32} cornerSize={10} thickness={2} padding={7} showLabel={false} />}
    </dialog>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
