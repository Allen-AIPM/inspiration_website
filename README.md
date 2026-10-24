# 欢迎光临我的建筑灵感库网站~

基于 React + Vite 的静态网站。网页源码、数据和图片均在本文件夹内，可以独立提交到 GitHub 仓库。

首页动效使用项目内的 React Bits 组件源码（`src/components/`），依赖 `gsap` 和 `motion`，随 `npm install` 一并安装。

## 本地运行

在 `website` 文件夹打开终端：

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址。生产构建：

```bash
npm run build
npm run preview
```

## 更新图片与标签

原目录的 `photo/` 和 `data.js` 更新后，在 `website` 文件夹运行：

```bash
npm run sync:data
npm run build
```

同步脚本会复制全部原图到 `public/photo/`，生成较小的 WebP 图库缩略图到 `public/thumb/`，并生成首页背景图 `public/hero.webp`。详情页仍使用原图。图片尺寸记录在 `src/image-manifest.json`，避免图片加载时图库跳动。脚本需要本机 Python 和 Pillow（安装命令：`python -m pip install Pillow`）；Cloudflare 构建不需要 Python。

图片资料和 AI 标签写入 `src/data.json`。尚未进入 `data.js` 的图片也会显示，但没有标题资料和 AI 标签。标签筛选选项从数据自动生成，五个维度可组合筛选。同步时会清除来源链接中的访问令牌等敏感 URL 参数。

## Cloudflare Pages

把本文件夹作为 GitHub 仓库根目录。Cloudflare Pages 的构建命令填 `npm run build`，输出目录填 `dist`。Node.js 版本建议使用 20.19 或更高版本。`public/photo/`、`public/thumb/`、`public/hero.webp`、`src/data.json` 和 `src/image-manifest.json` 需要一并提交；`node_modules/` 和 `dist/` 已被忽略。不要将 `.env` 或密钥文件提交到仓库；浏览器代码和 `VITE_` 环境变量都会公开给访客。

`npm run build` 会先检查公开源码中常见的密钥格式和带令牌的 URL；发现疑似泄露时会停止构建。此检查不能替代发布前对仓库内容的人工核对。

收藏、点赞和评论沿用浏览器本地存储，只在当前浏览器可见，不会跨设备同步。
