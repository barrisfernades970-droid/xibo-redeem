# 兑换码领取工具

喜播学堂专属工具，一键领取多种兑换码，避免重复领取。

## 功能特点

- 一键领取所有类型的兑换码
- 自动去重，避免重复领取
- 领取记录可追溯
- 一键复制所有兑换码
- 密码保护，安全可靠

---

## 本地使用

### 方式一：双击启动

1. 确保已安装 Node.js（https://nodejs.org/）
2. 双击 `start.bat` 文件
3. 浏览器打开 http://localhost:3000

### 方式二：命令行启动

```bash
cd code-tool
npm install
npm start
```

**默认密码：xibo2024**

---

## 部署到线上（Railway 免费托管）

### 第一步：注册 GitHub 账号

如果没有 GitHub 账号，先去 https://github.com 注册一个。

### 第二步：创建代码仓库

1. 打开 https://github.com/new
2. Repository name 填写：`code-tool`
3. 选择 Private（私有仓库）
4. 点击 Create repository

### 第三步：上传代码

在本地 `code-tool` 文件夹中执行：

```bash
git init
git add .
git commit -m "初始化兑换码领取工具"
git branch -M main
git remote add origin https://github.com/你的用户名/code-tool.git
git push -u origin main
```

### 第四步：部署到 Railway

1. 打开 https://railway.app/
2. 点击 "Start a New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权 GitHub，选择 `code-tool` 仓库
5. 点击 "Deploy Now"

### 第五步：设置密码

1. 在 Railway 项目页面，点击 "Variables"
2. 添加变量：
   - Name: `ACCESS_PASSWORD`
   - Value: 你想设置的密码（如：`myPassword123`）
3. 点击 "Add"
4. Railway 会自动重新部署

### 第六步：获取访问地址

1. 点击 "Settings"
2. 找到 "Domains"
3. 点击 "Generate Domain"
4. 获得一个类似 `code-tool-production-xxx.up.railway.app` 的地址

---

## 使用流程

### 第一步：添加兑换码类型

在「管理兑换码」页面，输入类型名称，例如：
- 课程A码
- 课程B码
- 会员码

### 第二步：导入兑换码

1. 选择兑换码类型
2. 在文本框中粘贴兑换码（每行一个）
3. 点击「导入兑换码」

### 第三步：一键领取

1. 切换到「领取兑换码」页面
2. 点击「一键领取全部」
3. 系统自动从每种类型中取出一个码
4. 点击「一键复制全部」，粘贴发送给学员

---

## 修改密码

### 本地使用

修改 `server.js` 文件中的默认密码：
```javascript
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'xibo2024';
```

### 线上部署

在 Railway 的 Variables 中修改 `ACCESS_PASSWORD` 的值。

---

## 技术栈

- 后端：Node.js + Express + LowDB
- 前端：原生 HTML/CSS/JavaScript
- 部署：Railway

---

## 常见问题

**Q: 忘记密码怎么办？**
A: 本地使用可查看 server.js 文件；线上部署可在 Railway Variables 中查看。

**Q: 数据会丢失吗？**
A: Railway 会持久化存储数据，但建议定期备份 db.json 文件。

**Q: 可以多人同时使用吗？**
A: 可以，但共享同一个密码。建议只给需要的人使用。
