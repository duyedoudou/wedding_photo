# Render 部署操作清单

## 我已经完成的项目改动

- 服务已支持 Render 提供的线上端口。
- 服务已改为监听 `0.0.0.0`，可被公网访问。
- 数据目录已支持环境变量 `DATA_DIR`。
- 数据库和生成图片可以写入 Render 持久磁盘。
- 已新增 `render.yaml`，方便 Render 自动识别部署配置。

## 需要你准备

- 一个 GitHub 仓库，用来放这个项目代码。
- 一个 Render 账号。
- 后台管理密码，建议不要继续使用默认的 `admin123`。
- 一串随机安全字符串，作为 `SERVER_SECRET`。

可以用下面这种格式自己准备：

```text
ADMIN_PASSWORD=你的后台密码
SERVER_SECRET=一串至少 32 位的随机字符串
```

## 第一步：把代码上传到 GitHub

1. 打开 GitHub。
2. 新建一个仓库，例如 `merryphoto`。
3. 把当前项目代码推送到这个仓库。
4. 确认仓库里包含这些文件：
   - `server.js`
   - `db.js`
   - `app.js`
   - `index.html`
   - `styles.css`
   - `package.json`
   - `package-lock.json`
   - `schema.sql`
   - `tools.config.json`
   - `render.yaml`

不要上传这些目录：

```text
node_modules
data
```

## 第二步：在 Render 创建服务

1. 登录 Render。
2. 点击右上角 **New +**。
3. 选择 **Blueprint**。
4. 连接 GitHub 仓库。
5. 选择刚刚上传的项目仓库。
6. Render 会读取 `render.yaml`。
7. 确认服务名是 `merryphoto`。

如果你不使用 Blueprint，也可以选择 **Web Service** 手动配置：

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
```

## 第三步：配置环境变量

在 Render 服务的 **Environment** 页面添加：

```text
ADMIN_PASSWORD=你的后台密码
SERVER_SECRET=你的随机安全字符串
DATA_DIR=/var/data
NODE_ENV=production
```

说明：

- `ADMIN_PASSWORD` 是后台 `#/admin` 的登录密码。
- `SERVER_SECRET` 用来保护任务和公开作品相关数据。
- `DATA_DIR=/var/data` 必须和持久磁盘挂载路径一致。

## 第四步：确认持久磁盘

如果使用 `render.yaml` 创建，Render 会自动配置：

```text
Disk Name: merryphoto-data
Mount Path: /var/data
Size: 1 GB
```

如果手动创建服务，需要自己添加 Disk：

```text
Mount Path: /var/data
Size: 1 GB
```

这个磁盘用来保存：

- 后台工具配置
- 生成任务记录
- 生成出来的图片

## 第五步：部署并检查

部署完成后，Render 会给你一个公网地址，例如：

```text
https://merryphoto.onrender.com
```

依次打开检查：

```text
https://你的地址.onrender.com/
https://你的地址.onrender.com/#/explore
https://你的地址.onrender.com/#/my-generations
https://你的地址.onrender.com/#/admin
https://你的地址.onrender.com/api/health
```

如果 `/api/health` 返回类似下面内容，说明后台服务正常：

```json
{"ok":true}
```

## 第六步：上线后使用

1. 打开线上首页。
2. 点击右上角“设置”。
3. 填入第三方图片 API Key。
4. 确认 Base URL 正确。
5. 进入生成页。
6. 上传原始人像照片，可选填写婚纱照偏好。
7. 生成后到“我的任务”查看结果。
8. 需要展示到作品页时，点击“公开”。

## 注意事项

- Render 免费实例可能会休眠，首次访问会慢一些。
- 如果没有持久磁盘，生成记录和图片不适合长期保存。
- 图片生成时间很长时，未来建议升级成更稳的异步任务方案。
- 正式上线前建议把 `ADMIN_PASSWORD` 和 `SERVER_SECRET` 设置得足够复杂。
