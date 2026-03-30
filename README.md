# Haruhi Art Club

[凉宫春日应援团 绘画部画廊](https://haruyuki.cn/art/)

以凉宫春日同人作品为主的绘画上传平台。支持投稿、浏览、点赞、评论、标签、积分等功能。

## 功能特性

- **作品画廊** — 瀑布流/卡片式展示，支持按标签、作者、类型筛选，支持按时间/热度/随机排序
- **作品投稿** — 支持多图上传，自动压缩并保留原图，支持应援团授权验证
- **互动系统** — 匿名点赞（每日限额）、评论
- **积分系统** — 投稿获取积分，积分排行榜，按 UID 查询积分历史
- **AI 内容审核** — 对投稿图片和文本进行自动安全审核
- **管理后台** — 作品审核/编辑、创作者管理（头像、QQ 号）、评论管理
- **移动端适配** — 响应式设计，兼顾桌面端与手机端体验

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + Vue Router + Pinia + Vite |
| 后端 | Node.js + Express |
| 数据库 | SQLite (via `sqlite3` / `sqlite`) |
| 文件上传 | Multer |

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 8

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/Haruhiyuki/haruhi-art-club.git
cd haruhi-art-club

# 安装依赖
npm install

# 一键启动前端 + 后端
npm start
```

启动后：
- 前端：http://127.0.0.1:5178
- 后端 API：http://127.0.0.1:15454/api/health

## 环境变量

在项目根目录创建 `.env` 文件进行配置：

```env
# 端口配置
PORT_WEB=5178
PORT_SERVER=15454

# 安全配置（生产环境必须设置）
COOKIE_SECRET=your-random-secret-string
ADMIN_PASSWORD=your-admin-password

# AI 审核（可选，不配置则跳过 AI 审核）
DASHSCOPE_API_KEY=your-dashscope-api-key

# 数据库路径（可选，默认 server/data.sqlite）
DB_PATH=/path/to/data.sqlite
```

> **注意：** `COOKIE_SECRET` 和 `ADMIN_PASSWORD` 在未配置时会使用占位默认值。部署到生产环境前请务必设置强随机值。

## 项目结构

```
haruhi-art-club/
├── src/                      # 前端源码
│   ├── views/                # 页面组件
│   │   ├── GalleryView.vue   #   画廊主页
│   │   ├── UploadView.vue    #   作品投稿页
│   │   ├── AdminView.vue     #   管理后台
│   │   ├── PointsView.vue    #   积分查询与排行榜
│   │   └── LicenseView.vue   #   应援团授权查询
│   ├── components/           # 可复用组件
│   │   ├── ArtworkGrid.vue   #   作品网格
│   │   ├── ArtworkModal.vue  #   作品详情弹窗
│   │   ├── FilterPanel.vue   #   筛选面板
│   │   ├── TagPill.vue       #   标签胶囊
│   │   └── TopBar.vue        #   顶部导航栏
│   ├── router/               # 路由配置
│   ├── services/             # API 请求封装
│   ├── stores/               # Pinia 状态管理
│   ├── utils/                # 工具函数
│   └── assets/               # 静态资源
├── server/                   # 后端源码
│   ├── index.js              #   Express 入口，全部 API 路由
│   ├── db.js                 #   SQLite 数据库初始化
│   ├── ai.js                 #   AI 审核模块（通义千问）
│   └── uploads/              #   用户上传文件存储目录
├── scripts/
│   └── start.mjs             # 一键启动脚本（前后端同时运行）
├── vite.config.js            # Vite 配置
└── package.json
```

## API 概览

所有接口以 `/api` 为前缀：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/artworks` | 获取作品列表（支持筛选、搜索、分页、排序） |
| GET | `/api/artworks/:id` | 获取单个作品详情 |
| POST | `/api/artworks` | 投稿作品（multipart/form-data） |
| POST | `/api/artworks/:id/like` | 点赞作品 |
| GET | `/api/points/leaderboard` | 积分排行榜 |
| GET | `/api/points/history` | 查询用户积分历史 |
| GET | `/api/creators/search` | 搜索创作者 |

管理接口需要在请求头中携带 `x-admin-password` 进行鉴权。

## 参与贡献

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m "feat: 描述你的更改"`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

### 开发注意事项

- 前后端在同一个仓库中，`npm install` 一次即可安装所有依赖
- 样式全部手写 CSS，不使用 Tailwind 等框架
- 数据库使用 SQLite，文件存储在本地，无需额外安装数据库服务
- AI 审核为可选功能，未配置 `DASHSCOPE_API_KEY` 时自动跳过

## License

MIT
