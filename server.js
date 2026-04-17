const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { db, initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 密码配置（从环境变量读取，默认密码：xibo2024）
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'xibo2024';
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

// 简单的 token 存储
const tokens = new Set();

app.use(cors());
app.use(express.json());

// 验证 token 中间件
function authMiddleware(req, res, next) {
  // 登录和检查接口不需要验证
  if (req.path === '/login' || req.path === '/check' || req.path === '/logout') {
    return next();
  }
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ success: false, error: '请先登录' });
  }
  
  next();
}

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 登录接口
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ACCESS_PASSWORD) {
    const token = crypto.createHash('sha256').update(password + TOKEN_SECRET + Date.now()).digest('hex');
    tokens.add(token);
    
    // 限制 token 数量，防止内存泄漏
    if (tokens.size > 1000) {
      const arr = Array.from(tokens);
      arr.slice(0, 500).forEach(t => tokens.delete(t));
    }
    
    res.json({ success: true, data: { token } });
  } else {
    res.status(401).json({ success: false, error: '密码错误' });
  }
});

// 检查登录状态
app.get('/api/check', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  res.json({ success: true, data: { loggedIn: tokens.has(token) } });
});

// 退出登录
app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    tokens.delete(token);
  }
  res.json({ success: true });
});

// 以下接口需要登录
app.use('/api', authMiddleware);

// 获取所有兑换码类型及剩余数量
app.get('/api/types', async (req, res) => {
  try {
    await db.read();
    const types = db.data.types.map(type => {
      const codes = db.data.codes.filter(c => c.typeId === type.id);
      const available = codes.filter(c => c.status === 'available').length;
      const used = codes.filter(c => c.status === 'used').length;
      return {
        id: type.id,
        name: type.name,
        available_count: available,
        used_count: used
      };
    });
    res.json({ success: true, data: types });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加兑换码类型
app.post('/api/types', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: '类型名称不能为空' });
    }
    
    await db.read();
    
    if (db.data.types.find(t => t.name === name)) {
      return res.status(400).json({ success: false, error: '该类型已存在' });
    }
    
    const id = Date.now();
    db.data.types.push({ id, name, createdAt: new Date().toISOString() });
    await db.write();
    
    res.json({ success: true, data: { id, name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除兑换码类型
app.delete('/api/types/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    await db.read();
    
    db.data.codes = db.data.codes.filter(c => c.typeId !== id);
    db.data.types = db.data.types.filter(t => t.id !== id);
    
    await db.write();
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量导入兑换码
app.post('/api/codes/import', async (req, res) => {
  try {
    const { type_id, codes } = req.body;
    
    if (!type_id || !codes || !Array.isArray(codes)) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }

    await db.read();

    const type = db.data.types.find(t => t.id === parseInt(type_id));
    if (!type) {
      return res.status(400).json({ success: false, error: '兑换码类型不存在' });
    }

    let imported = 0;
    let duplicated = 0;

    for (const code of codes) {
      const trimmed = code.trim();
      if (trimmed) {
        const exists = db.data.codes.find(c => c.typeId === parseInt(type_id) && c.code === trimmed);
        if (exists) {
          duplicated++;
        } else {
          db.data.codes.push({
            id: Date.now() + Math.random(),
            typeId: parseInt(type_id),
            code: trimmed,
            status: 'available',
            createdAt: new Date().toISOString()
          });
          imported++;
        }
      }
    }

    await db.write();

    res.json({ 
      success: true, 
      data: { 
        imported, 
        duplicated,
        message: `成功导入 ${imported} 个兑换码${duplicated > 0 ? `，跳过 ${duplicated} 个重复` : ''}` 
      } 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 一键领取所有类型的兑换码
app.post('/api/claim', async (req, res) => {
  try {
    const { claimer = '管理员' } = req.body;
    
    await db.read();
    
    if (db.data.types.length === 0) {
      return res.status(400).json({ success: false, error: '没有兑换码类型' });
    }

    const results = [];

    for (const type of db.data.types) {
      const codeIndex = db.data.codes.findIndex(c => c.typeId === type.id && c.status === 'available');

      if (codeIndex !== -1) {
        const code = db.data.codes[codeIndex];
        
        db.data.codes[codeIndex].status = 'used';
        
        db.data.records.push({
          id: Date.now() + Math.random(),
          codeId: code.id,
          code: code.code,
          typeName: type.name,
          claimer,
          claimedAt: new Date().toISOString()
        });
        
        results.push({
          type_name: type.name,
          code: code.code
        });
      } else {
        results.push({
          type_name: type.name,
          code: null,
          message: '该类型已无可用兑换码'
        });
      }
    }

    await db.write();

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取领取记录
app.get('/api/records', async (req, res) => {
  try {
    await db.read();
    
    const records = [...db.data.records].reverse();
    
    res.json({ 
      success: true, 
      data: {
        records,
        total: records.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取统计数据
app.get('/api/stats', async (req, res) => {
  try {
    await db.read();
    
    const totalCodes = db.data.codes.length;
    const availableCodes = db.data.codes.filter(c => c.status === 'available').length;
    const usedCodes = db.data.codes.filter(c => c.status === 'used').length;
    const totalClaims = db.data.records.length;
    
    res.json({ 
      success: true, 
      data: {
        totalCodes,
        availableCodes,
        usedCodes,
        totalClaims
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 启动服务
async function start() {
  await initDB();
  
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n========================================`);
    console.log(`  兑换码领取工具已启动`);
    console.log(`  访问地址: http://localhost:${PORT}`);
    console.log(`  默认密码: ${ACCESS_PASSWORD}`);
    console.log(`========================================\n`);
  });
}

start();
