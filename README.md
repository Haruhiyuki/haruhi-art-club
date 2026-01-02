/（根目录）就是前端工程（Vue + Vite）

src/views：每个页面一个文件（“页面层”）

src/components：可复用组件（“积木层”）

src/router：路由表（决定 URL 对应哪个页面）

src/services：访问后端 API 的代码（把网络请求集中管理）

src/styles：全局样式（不用 Tailwind，全手写）

/server 是后端工程（Express + SQLite）

server/index.js：后端入口（启动服务器）

server/db.js：数据库初始化与连接（SQLite）

server/routes：API 路由（比如 /api/artworks）

server/data：SQLite 数据库文件放这里

npm run start：用同一个命令同时跑前后端，且只 npm install 一次