const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

// 调试：打印环境变量
console.log('Server启动 - SUPABASE_URL:', process.env.SUPABASE_URL);
console.log('Server启动 - SUPABASE_KEY:', process.env.SUPABASE_KEY ? '已设置' : '未设置');

const { db, initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// 密码配置
const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || 'xibo888';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'xiboadmin';
const TOKEN_SECRET = process.env.TOKEN_SECRET || crypto.randomBytes(32).toString('hex');

// token 存储
const tokens = new Map();

app.use(cors());
app.use(express.json());

// 验证 token 中间件
function authMiddleware(req, res, next) {
  if (req.path === '/login' || req.path === '/check' || req.path === '/logout') {
    return next();
  }
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ success: false, error: '请先登录' });
  }
  
  req.user = tokens.get(token);
  next();
}

// 管理员权限中间件
function adminMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token || !tokens.has(token)) {
    return res.status(401).json({ success: false, error: '请先登录' });
  }
  
  const user = tokens.get(token);
  if (!user.isAdmin) {
    return res.status(403).json({ success: false, error: '需要管理员权限' });
  }
  
  req.user = user;
  next();
}

// 静态文件
app.use(express.static(path.join(__dirname, 'public')));

// 登录接口
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password === ADMIN_PASSWORD) {
    const token = crypto.createHash('sha256').update(password + TOKEN_SECRET + Date.now()).digest('hex');
    tokens.set(token, { isAdmin: true });
    cleanupTokens();
    return res.json({ success: true, data: { token, isAdmin: true } });
  }
  
  if (password === ACCESS_PASSWORD) {
    const token = crypto.createHash('sha256').update(password + TOKEN_SECRET + Date.now()).digest('hex');
    tokens.set(token, { isAdmin: false });
    cleanupTokens();
    return res.json({ success: true, data: { token, isAdmin: false } });
  }
  
  res.status(401).json({ success: false, error: '密码错误' });
});

function cleanupTokens() {
  if (tokens.size > 1000) {
    const arr = Array.from(tokens.keys());
    arr.slice(0, 500).forEach(t => tokens.delete(t));
  }
}

app.get('/api/check', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token && tokens.has(token)) {
    const user = tokens.get(token);
    return res.json({ success: true, data: { loggedIn: true, isAdmin: user.isAdmin } });
  }
  res.json({ success: true, data: { loggedIn: false, isAdmin: false } });
});

app.post('/api/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    tokens.delete(token);
  }
  res.json({ success: true });
});

app.use('/api', authMiddleware);

// 获取所有兑换码类型
app.get('/api/types', async (req, res) => {
  try {
    const types = await db.getTypes();
    const result = await Promise.all(types.map(async (type) => {
      const codes = await db.getCodes({ typeId: type.id });
      const available = codes.filter(c => c.status === 'available').length;
      const used = codes.filter(c => c.status === 'used').length;
      return {
        id: type.id,
        name: type.name,
        available_count: available,
        used_count: used
      };
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 添加兑换码类型
app.post('/api/types', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: '类型名称不能为空' });
    }
    
    const types = await db.getTypes();
    if (types.find(t => t.name === name)) {
      return res.status(400).json({ success: false, error: '该类型已存在' });
    }
    
    const id = Date.now();
    await db.insertType({ id, name, createdAt: new Date().toISOString() });
    
    res.json({ success: true, data: { id, name } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除兑换码类型
app.delete('/api/types/:id', adminMiddleware, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.deleteType(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 批量导入兑换码
app.post('/api/codes/import', adminMiddleware, async (req, res) => {
  try {
    const { type_id, codes } = req.body;
    
    if (!type_id || !codes || !Array.isArray(codes)) {
      return res.status(400).json({ success: false, error: '参数错误' });
    }

    const types = await db.getTypes();
    const type = types.find(t => t.id === parseInt(type_id));
    if (!type) {
      return res.status(400).json({ success: false, error: '兑换码类型不存在' });
    }

    let imported = 0;
    let duplicated = 0;
    const codesToInsert = [];

    for (const code of codes) {
      const trimmed = code.trim();
      if (trimmed) {
        const exists = await db.checkCodeExists(parseInt(type_id), trimmed);
        if (exists) {
          duplicated++;
        } else {
          codesToInsert.push({
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

    if (codesToInsert.length > 0) {
      await db.insertCodes(codesToInsert);
    }

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

// 一键领取所有类型
app.post('/api/claim', async (req, res) => {
  try {
    const { claimer = '管理员' } = req.body;
    
    const types = await db.getTypes();
    if (types.length === 0) {
      return res.status(400).json({ success: false, error: '没有兑换码类型' });
    }

    const results = [];

    for (const type of types) {
      const code = await db.getAvailableCode(type.id);

      if (code) {
        await db.updateCodeStatus(code.id, 'used');
        
        await db.insertRecord({
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

    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 单独领取某种类型
app.post('/api/claim/:typeId', async (req, res) => {
  try {
    const typeId = parseInt(req.params.typeId);
    const { claimer = '管理员' } = req.body;
    
    const types = await db.getTypes();
    const type = types.find(t => t.id === typeId);
    if (!type) {
      return res.status(400).json({ success: false, error: '兑换码类型不存在' });
    }

    const code = await db.getAvailableCode(typeId);
    if (!code) {
      return res.status(400).json({ success: false, error: '该类型已无可用兑换码' });
    }

    await db.updateCodeStatus(code.id, 'used');
    
    await db.insertRecord({
      id: Date.now() + Math.random(),
      codeId: code.id,
      code: code.code,
      typeName: type.name,
      claimer,
      claimedAt: new Date().toISOString()
    });

    res.json({ 
      success: true, 
      data: {
        type_name: type.name,
        code: code.code
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取领取记录
app.get('/api/records', async (req, res) => {
  try {
    const records = await db.getRecords();
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
    const stats = await db.getStats();
    res.json({ success: true, data: stats });
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
    console.log(`  普通密码: ${ACCESS_PASSWORD}`);
    console.log(`  管理员密码: ${ADMIN_PASSWORD}`);
    console.log(`========================================\n`);
  });
}

start();
