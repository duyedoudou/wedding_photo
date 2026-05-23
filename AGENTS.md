# 项目接手说明

## 项目概览

这是一个名为 **MerryPhoto** 的本地网页应用。核心用途是：用户上传一张原始人像照片，网站使用内置婚纱照提示词，并结合用户的可选补充偏好，通过用户自己的图片生成服务 API Key 生成新的婚纱照。

项目是一个轻量级 Node.js 应用，没有使用前端构建工具。浏览器页面、样式、前端逻辑和后端服务都在当前文件夹中。

## 运行方式

```bash
npm install
npm start
```

默认访问地址：

```text
http://localhost:4173
```

默认端口是 `4173`，可以通过 `PORT` 环境变量修改。

## 主要文件

- `index.html`：网页入口，包含顶部导航、设置弹窗和页面挂载点。
- `styles.css`：整站样式。
- `app.js`：前端主要逻辑，包括页面切换、上传图片、提交生成任务、查看作品、个人任务、设置弹窗和后台管理界面。
- `server.js`：后端服务，负责静态文件、接口、图片生成请求、作品发布和后台管理接口。
- `db.js`：数据库读写层，使用 `sql.js` 操作本地 SQLite 文件。
- `schema.sql`：数据库表结构。
- `tools.config.json`：婚纱照生成工具配置和提示词模板。
- `data/public/`：公开图片和生成结果保存目录。
- `data/hairstyle.sqlite`：本地 SQLite 数据库文件。文件名暂时保留，用于兼容历史数据。

## 技术组成

- 后端：Node.js 原生 `http` 服务。
- 数据库：`sql.js`，数据库内容导出保存为 `data/hairstyle.sqlite`。
- 前端：原生 HTML、CSS、JavaScript。
- 图片生成服务：默认面向兼容 OpenAI 图片接口形式的 MoleAPI。
- 默认 Base URL：`https://api.moleapi.com/v1`。
- 默认模型：`gpt-image-2`。

## 页面功能

- 首页：聚焦 AI 婚纱照生成，直接引导用户上传原片。
- 生成页：上传图片、填写可选偏好、提交生成任务并查看结果。
- 公开作品页：展示用户主动发布的作品。
- 我的任务：根据当前浏览器里保存的 API Key，查看这个 Key 提交过的生成任务。
- 设置弹窗：保存 API Key、Base URL 和模型名到浏览器本地。
- 后台页：通过 `#/admin` 进入，可管理生成工具配置。

## 当前默认生成场景

- `wedding-photo`：AI 婚纱照生成，需要上传图片。

## 后端接口概要

- `GET /api/health`：健康检查。
- `GET /api/tools`：获取已启用的生成工具。
- `GET /api/tools/:slug`：获取单个生成工具。
- `POST /api/generation-jobs`：提交生成任务。
- `GET /api/generation-jobs/:jobId`：查询生成任务状态。
- `POST /api/my/generations`：根据 API Key 查询个人生成任务。
- `GET /api/works`：获取公开作品列表。
- `GET /api/works/:workId`：获取公开作品详情。
- `POST /api/works`：把成功的生成结果发布为公开作品。
- `DELETE /api/works/:workId`：使用管理令牌取消公开作品。
- `POST /api/settings/test-key`：只做 API Key 是否填写的基础检查。
- `POST /api/admin/login`：后台登录。
- `GET /api/admin/tools`：后台获取所有工具。
- `POST /api/admin/tools`：后台新增或保存工具。
- `PUT /api/admin/tools/:slug`：后台更新工具。

## 数据和安全注意事项

- 用户 API Key 默认保存在浏览器本地，不会直接写进数据库。
- 后端会用 `SERVER_SECRET` 对 API Key 做指纹，用于关联“我的任务”。
- 公开作品的删除依赖发布时生成的 `manageToken`，数据库只保存它的哈希。
- 默认 `SERVER_SECRET` 是开发值：`dev-secret-change-me`。
- 默认后台密码是：`admin123`。
- 正式部署前应设置 `SERVER_SECRET` 和 `ADMIN_PASSWORD`。

## 开发注意事项

- 修改提示词时优先改 `tools.config.json`，不要把业务提示词硬编码进前端或后端。
- 修改后端接口时，优先同步检查 `app.js` 中对应的前端调用。
- 修改数据库结构时，需要同步更新 `schema.sql` 和 `db.js` 的映射逻辑。
- 不要随意删除 `data/hairstyle.sqlite`，它保存了本地任务、作品和场景配置。
- 不要随意清空 `data/public/`，公开作品和历史生成结果依赖这里的图片文件。
- 如果图片生成失败，优先检查 API Key、Base URL、模型名、网络访问和生成服务返回内容。

## 快速检查

```text
http://localhost:4173/api/health
http://localhost:4173/api/tools
http://localhost:4173/api/tools/wedding-photo
```
