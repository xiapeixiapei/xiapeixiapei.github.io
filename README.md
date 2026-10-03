# Academic Homepage Template

[English](#english) · [中文](#中文)

A bilingual (English / 中文) academic homepage that runs on free GitHub Pages and is edited in the browser via its own **Site Manager** (`admin.html`). You don't need a server, a build step or any coding.

What you get:

- **Homepage** (`index.html`): profile, research interests, education timeline, featured papers, papers by year, awards, a co-author network, a CV download, photo strips, dark mode and an EN / 中 switch.
- **Publications** (`publications.html`): every paper with badges, a journal cover and citation counts.
- **Conferences** (`academic.html`): a public map of conferences and academic visits.
- **Travel** (`travel.html`): a private, password-encrypted travel map with photos, landmarks and heritage tags.
- **Site Manager** (`admin.html`) lets you edit all of the above:
  - DOI import and one-click citation refresh
  - fonts, colour palettes and text size
  - visitor stats (GoatCounter)
  - password sign-in that works on any device

---

## English

### 1. Put the site on GitHub (about 10 minutes)

1. Create a GitHub account if you don't have one. Your site address will be `https://<username>.github.io`.
2. Create a **public** repository named exactly `<username>.github.io`. Use the **+** at the top right, then **New repository**.
3. Unzip this package. In the new repository, click **uploading an existing file** (or **Add file → Upload files**). Drag **everything** from the unzipped folder into the browser, then click **Commit changes**.
   - The package contains two hidden items: the folder `.github` (journal covers) and the file `.nojekyll`. macOS Finder hides them. Press `Cmd + Shift + .` to show them before you drag. On Windows, enable *View → Hidden items*.
4. Go to **Settings → Pages**. Under *Build and deployment*, set *Source* to **Deploy from a branch**, the branch to **main** and the folder to **/ (root)**, then **Save**.
5. After a minute or two the site is live at `https://<username>.github.io`.

### 2. Sign in to the Site Manager

1. Open `https://<username>.github.io/admin.html`, or click the lock icon on the homepage.
2. Create a GitHub token. This happens only once.
   1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   2. Under *Repository access*, choose **Only select repositories** and pick `<username>.github.io`.
   3. Under *Permissions*, click **+ Add permissions**, choose **Contents** and set it to **Read and write**.
   4. Generate the token and copy it.
3. Paste the token, choose a password (at least 10 characters) and click **Create sign-in**.
   - The token is encrypted with your password and saved in the repository.
   - From then on, the password alone signs you in on any device.
4. Edit any tab, then click **Publish changes**. GitHub Pages updates within about a minute. If a page looks old, press Ctrl+F5 (Windows) or Cmd+Shift+R (Mac) to reload it.

### 3. Make it yours

| What | Where in Site Manager |
| --- | --- |
| Name, photo, affiliation, bio, email, Scholar / ORCID / ResearchGate links | Profile |
| Research interests, education (with school logos and supervisors) | Research interests, Education |
| Papers: add from DOI, mark first / corresponding author, feature on the homepage | Publications |
| Citation counts, missing DOIs, abstracts and journal covers | Publications → **↻ Refresh citations, abstracts & covers** |
| Awards, photo strips | Awards, Photos |
| CV PDF, footer year, analytics, fonts, colours, text size | CV & site settings |
| Conference map, private travel map | Footprints |
| Visitor numbers and map | Visitors (needs a free GoatCounter account) |

Notes:

- **Hidden sections.** Awards and CV stay hidden until they have content. The co-author network needs at least two papers.
- **Your author name.** Write it in *CV & site settings → Your author short name* (e.g. `Doe J.`). It is shown in bold in author lists and sits at the centre of the network.
- **Journal covers.** Covers are fetched by a GitHub Action (`.github/workflows/fetch-covers.yml`) after each publish, for papers that have a DOI.
  - Check the *Actions* tab once and enable workflows if GitHub asks.
  - A few publishers block bots. For those, paste a cover image into the paper's editor.
- **Analytics.** These are optional. Enter a GoatCounter site code and/or a Google Analytics ID (`G-…`) in *CV & site settings*. Leave both empty to collect nothing.
- **Custom domain or another repository name.** If the Site Manager is not on `<username>.github.io`, it asks once which repository to use. The answer is remembered in that browser.

### 4. Footprint maps (optional)

1. In *Footprints*, choose a **travel password**. This password is separate from the admin password, so you can share it with family and friends.
2. Add a place with the city search, and tick **Academic visit** for conferences and research stays.
   - Academic visits appear on the public `academic.html`.
   - Everything appears on the private `travel.html`, encrypted in your browser before upload.
3. **Find landmarks nearby** suggests sights from Wikidata, Wikipedia and the UNESCO list.
   - For places in China, add a free Amap (高德) Web-service key under *Map services*. It gives better results.
   - 5A tags are checked against the official list (358 sites, May 2025).
   - **✓ Check all tags** re-checks every saved sight.

### 5. Files

| File | Purpose |
| --- | --- |
| `content.json` | All homepage text and data. The Site Manager writes this file; you can also edit it by hand. |
| `index.html`, `publications.html`, `academic.html`, `travel.html` | The public pages |
| `admin.html` | Site Manager |
| `site-theme.js`, `site-fonts.js` | Fonts, colour palette, dark mode (`site-fonts.js` is written on publish) |
| `city-icons.js` | Icons for the footprint maps (chosen automatically per city, editable per place) |
| `pinyin-lite.json` | Pinyin table used to give Chinese place names an English form |
| `photo.jpg`, `logo-*.png` | Profile photo and school logos. The included ones are placeholders. |
| `wh-sites.json`, `wh-components.json`, `cn-5a-official.json`, `cn-5a-areas.json`, `national-parks.json`, `cn-provinces.json` | Offline data for the footprint maps |
| `.github/workflows/fetch-covers.yml` | Fetches journal covers |

The Site Manager creates `admin-auth.json`, `travel/` and `academic/` itself. Never upload these from someone else's site.

### 6. Privacy and security

- The repository is public; sign-in works by decrypting the token in your browser. Use a strong password you don't use elsewhere.
- The token can only touch this one repository.
- Private travel data and photos are stored encrypted (AES-256-GCM). Only the conference map is public.
- The email address is assembled on click, so it never appears in the page source.

---

## 中文

### 一、把网站放到 GitHub 上（约 10 分钟）

1. 注册 GitHub 账号。网站地址将是 `https://<用户名>.github.io`。
2. 右上角 **+ → New repository**，新建一个**公开（Public）**仓库，名字必须是 `<用户名>.github.io`。
3. 解压本压缩包。在新仓库页面点 **uploading an existing file**（或 **Add file → Upload files**），把解压后文件夹里的**全部内容**拖进浏览器，然后点 **Commit changes**。
   - 压缩包里有两个隐藏项：文件夹 `.github`（用于抓取期刊封面）和文件 `.nojekyll`。
   - Mac 的访达默认不显示它们，拖之前按 `Cmd + Shift + .` 显示隐藏文件。
   - Windows 在资源管理器里勾选「查看 → 隐藏的项目」。
4. 进入 **Settings → Pages**，在 *Build and deployment* 中设置：
   - *Source* 选 **Deploy from a branch**；
   - 分支选 **main**，目录选 **/ (root)**；
   - 点 **Save**。
5. 一两分钟后，网站会在 `https://<用户名>.github.io` 上线。

### 二、登录管理后台（Site Manager）

1. 打开 `https://<用户名>.github.io/admin.html`，或点主页上的小锁图标。
2. 创建 GitHub token（只需一次）：
   1. **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**；
   2. *Repository access* 选 **Only select repositories**，然后选 `<用户名>.github.io`；
   3. *Permissions* 点 **+ Add permissions**，选 **Contents**，设为 **Read and write**；
   4. 生成并复制 token。
3. 粘贴 token，设一个密码（至少 10 位），点 **Create sign-in**。token 会用这个密码加密后存进仓库，以后在任何设备上只输密码就能登录。
4. 在各个标签页修改内容，点 **Publish changes**，大约一分钟后网站更新。如果看到的还是旧页面，按 Ctrl+F5（Mac 按 Cmd+Shift+R）强制刷新。

### 三、改成你自己的内容

| 内容 | 后台位置 |
| --- | --- |
| 姓名、照片、单位、简介、邮箱、Google Scholar / ORCID / ResearchGate 链接 | Profile |
| 研究方向、教育经历（学校 logo、导师） | Research interests、Education |
| 论文：用 DOI 导入，标注第一 / 通讯作者，设为主页代表作 | Publications |
| 引用数、补全 DOI、摘要、期刊封面 | Publications → **↻ Refresh citations, abstracts & covers** |
| 获奖、照片轮播 | Awards、Photos |
| 简历 PDF、页脚年份、访问统计、字体、配色、字号 | CV & site settings |
| 学术足迹地图、私密旅行地图 | Footprints |
| 访客数量和来源地图 | Visitors（需要免费的 GoatCounter 账号） |

补充说明：

- **隐藏的栏目：**「获奖」和「简历」在填写内容之前不会显示；合作网络至少需要两篇论文。
- **作者简写：**在 *CV & site settings → Your author short name* 里填写（例如 `Xia P.`）。作者列表里会加粗显示这个名字，合作网络也以它为中心。
- **期刊封面：**每次发布后，GitHub Action 会为带 DOI 的论文自动抓取封面。
  - 第一次使用时请到仓库的 *Actions* 页确认已启用。
  - 少数出版社会拦截自动抓取，可以在该论文的编辑框里直接粘贴封面图片。
- **访问统计：**可选。在 *CV & site settings* 里填 GoatCounter 站点代码和 / 或 Google Analytics ID（`G-…`）；都不填就不统计。
- **自定义域名或其他仓库名：**如果后台不在 `<用户名>.github.io` 上，第一次打开时会问一次仓库名，之后在这个浏览器里会记住。

### 四、足迹地图（可选）

1. 在 *Footprints* 里设置**旅行密码**。它和后台密码是分开的，可以分享给家人朋友。
2. 用城市搜索添加地点，会议、访学等勾选 **Academic visit**。
   - 学术行程显示在公开的 `academic.html`；
   - 全部行程显示在私密的 `travel.html`，数据在浏览器里加密后才上传。
3. **Find landmarks nearby** 会从 Wikidata、维基百科和世界遗产名录推荐景点。
   - 中国境内的地点可以在 *Map services* 里填一个免费的高德 Web 服务 key，效果更好。
   - 5A 标签按官方名单（358 家，2025 年 5 月）校验。
   - **✓ Check all tags** 可以一键重新校验所有已保存的景点。

### 五、文件说明

| 文件 | 作用 |
| --- | --- |
| `content.json` | 主页的全部文字和数据，后台会写入这个文件，也可以手动编辑 |
| `index.html`、`publications.html`、`academic.html`、`travel.html` | 公开页面 |
| `admin.html` | 管理后台 |
| `site-theme.js`、`site-fonts.js` | 字体、配色、深色模式（`site-fonts.js` 在发布时由后台写入） |
| `city-icons.js` | 足迹地图的城市图标（按城市自动选择，每个地点可在后台改） |
| `pinyin-lite.json` | 给中文地名生成英文名用的拼音表 |
| `photo.jpg`、`logo-*.png` | 头像和学校 logo，目前是占位图，请替换 |
| `wh-sites.json`、`wh-components.json`、`cn-5a-official.json`、`cn-5a-areas.json`、`national-parks.json`、`cn-provinces.json` | 足迹地图用到的离线数据 |
| `.github/workflows/fetch-covers.yml` | 自动抓取期刊封面 |

`admin-auth.json`、`travel/`、`academic/` 由后台自动创建。不要从别人的网站拷贝这些文件。

### 六、隐私与安全

- 仓库是公开的，登录靠在浏览器里解密 token 完成，所以请用一个别处没用过的强密码。
- token 只能访问这一个仓库。
- 私密旅行数据和照片都是加密存储（AES-256-GCM），只有学术足迹是公开的。
- 邮箱地址在点击时才拼出来，网页源码里看不到完整邮箱。
