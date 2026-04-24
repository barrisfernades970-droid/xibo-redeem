const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Supabase REST API 封装
async function supabaseRequest(table, method = 'GET', data = null, query = '', preferCount = false) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query}`;
  
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : (preferCount ? 'count=exact' : 'return=minimal')
    }
  };
  
  if (data && (method === 'POST' || method === 'PATCH')) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${error}`);
  }
  
  if (method === 'GET') {
    if (preferCount) {
      // 从 content-range header 解析总数
      const contentRange = response.headers.get('content-range');
      if (contentRange) {
        const total = contentRange.split('/')[1];
        return parseInt(total) || 0;
      }
      // 如果没有 content-range，返回数组长度
      const data = await response.json();
      return data.length;
    }
    return await response.json();
  }
  
  return data;
}

// 初始化数据库
async function initDB() {
  console.log('Supabase 数据库已连接');
}

// 数据库操作封装
const dbOperations = {
  // 获取类型列表
  async getTypes() {
    return await supabaseRequest('types', 'GET', null, '?select=*');
  },
  
  // 插入类型
  async insertType(type) {
    await supabaseRequest('types', 'POST', type);
  },
  
  // 删除类型
  async deleteType(id) {
    await supabaseRequest('types', 'DELETE', null, `?id=eq.${id}`);
    await supabaseRequest('codes', 'DELETE', null, `?typeId=eq.${id}`);
  },
  
  // 获取兑换码列表
  async getCodes(filter = {}) {
    let query = '?select=*';
    if (filter.typeId) {
      query += `&typeId=eq.${filter.typeId}`;
    }
    if (filter.status) {
      query += `&status=eq.${filter.status}`;
    }
    return await supabaseRequest('codes', 'GET', null, query);
  },
  
  // 插入兑换码
  async insertCodes(codes) {
    for (const code of codes) {
      await supabaseRequest('codes', 'POST', code);
    }
  },
  
  // 获取可用兑换码
  async getAvailableCode(typeId) {
    const result = await supabaseRequest('codes', 'GET', null, 
      `?select=*&typeId=eq.${typeId}&status=eq.available&limit=1`);
    return result.length > 0 ? result[0] : null;
  },
  
  // 更新兑换码状态
  async updateCodeStatus(id, status) {
    await supabaseRequest('codes', 'PATCH', { status }, `?id=eq.${id}`);
  },
  
  // 检查兑换码是否存在
  async checkCodeExists(typeId, code) {
    const result = await supabaseRequest('codes', 'GET', null,
      `?select=id&typeId=eq.${typeId}&code=eq.${encodeURIComponent(code)}&limit=1`);
    return result.length > 0;
  },
  
  // 插入领取记录
  async insertRecord(record) {
    await supabaseRequest('records', 'POST', record);
  },
  
  // 获取领取记录
  async getRecords() {
    return await supabaseRequest('records', 'GET', null, '?select=*&order=claimedAt.desc');
  },
  
  // 获取统计
  async getStats() {
    // 使用 Prefer: count=exact 获取准确计数
    const totalCodes = await supabaseRequest('codes', 'GET', null, '?select=id', true);
    const availableCodes = await supabaseRequest('codes', 'GET', null, '?select=id&status=eq.available', true);
    const usedCodes = await supabaseRequest('codes', 'GET', null, '?select=id&status=eq.used', true);
    const totalClaims = await supabaseRequest('records', 'GET', null, '?select=id', true);
    
    return {
      totalCodes,
      availableCodes,
      usedCodes,
      totalClaims
    };
  }
};

module.exports = { initDB, db: dbOperations };
