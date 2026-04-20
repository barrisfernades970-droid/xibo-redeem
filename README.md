# 喜播兑换码领取工具

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
2. 双击 `启动服务.bat` 文件
3. 浏览器打开 http://localhost:3000

### 方式二：命令行启动

```bash
npm install
npm start
```

**默认密码：xibo888888**

---

## 部署到线上（Railway 免费托管）

### 第一步：部署到 Railway

1. 打开 https://railway.app/
2. 点击 "Start a New Project"
3. 选择 "Deploy from GitHub repo"
4. 授权 GitHub，选择此仓库
5. 点击 "Deploy Now"

### 第二步：设置密码

1. 在 Railway 项目页面，点击 "Variables"
2. 添加变量：
   - Name: `ACCESS_PASSWORD`
   - Value: 你想设置的密码
3. Railway 会自动重新部署

### 第三步：获取访问地址

1. 点击 "Settings"
2. 找到 "Domains"
3. 点击 "Generate Domain"
4. 获得永久访问地址

---

## 默认密码

- 普通用户密码：`xibo888888`
- 管理员密码：`xiboadmin`

---

## 技术栈

- 后端：Node.js + Express + LowDB
- 前端：原生 HTML/CSS/JavaScript
- 部署：Railway
