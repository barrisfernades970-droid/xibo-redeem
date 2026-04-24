const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/xibo-redeem';

let client = null;
let db = null;

// 连接数据库
async function connectDB() {
  if (db) return db;
  
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db();
  
  // 创建索引
  await db.collection('types').createIndex({ id: 1 }, { unique: true });
  await db.collection('codes').createIndex({ id: 1 }, { unique: true });
  await db.collection('codes').createIndex({ typeId: 1, status: 1 });
  await db.collection('records').createIndex({ id: 1 }, { unique: true });
  
  return db;
}

// 初始化数据库（创建默认数据）
async function initDB() {
  const database = await connectDB();
  
  // 检查是否有类型数据
  const typesCount = await database.collection('types').countDocuments();
  if (typesCount === 0) {
    // 可以在这里添加默认类型
    console.log('数据库初始化完成');
  }
}

// 数据库操作封装
const dbOperations = {
  // 读取所有数据
  async read() {
    const database = await connectDB();
    const types = await database.collection('types').find({}).toArray();
    const codes = await database.collection('codes').find({}).toArray();
    const records = await database.collection('records').find({}).toArray();
    return { types, codes, records };
  },
  
  // 写入类型
  async insertType(type) {
    const database = await connectDB();
    await database.collection('types').insertOne(type);
  },
  
  // 删除类型
  async deleteType(id) {
    const database = await connectDB();
    await database.collection('types').deleteOne({ id });
    await database.collection('codes').deleteMany({ typeId: id });
  },
  
  // 插入兑换码
  async insertCodes(codes) {
    const database = await connectDB();
    if (codes.length > 0) {
      await database.collection('codes').insertMany(codes);
    }
  },
  
  // 更新兑换码状态
  async updateCodeStatus(id, status) {
    const database = await connectDB();
    await database.collection('codes').updateOne({ id }, { $set: { status } });
  },
  
  // 插入领取记录
  async insertRecord(record) {
    const database = await connectDB();
    await database.collection('records').insertOne(record);
  },
  
  // 获取可用兑换码
  async getAvailableCode(typeId) {
    const database = await connectDB();
    return await database.collection('codes').findOne({ typeId, status: 'available' });
  },
  
  // 统计
  async getStats() {
    const database = await connectDB();
    const totalCodes = await database.collection('codes').countDocuments();
    const availableCodes = await database.collection('codes').countDocuments({ status: 'available' });
    const usedCodes = await database.collection('codes').countDocuments({ status: 'used' });
    const totalClaims = await database.collection('records').countDocuments();
    return { totalCodes, availableCodes, usedCodes, totalClaims };
  },
  
  // 获取类型列表
  async getTypes() {
    const database = await connectDB();
    return await database.collection('types').find({}).toArray();
  },
  
  // 获取兑换码列表
  async getCodes(filter = {}) {
    const database = await connectDB();
    return await database.collection('codes').find(filter).toArray();
  },
  
  // 获取领取记录
  async getRecords() {
    const database = await connectDB();
    return await database.collection('records').find({}).sort({ claimedAt: -1 }).toArray();
  },
  
  // 检查兑换码是否存在
  async checkCodeExists(typeId, code) {
    const database = await connectDB();
    return await database.collection('codes').findOne({ typeId, code });
  }
};

module.exports = { initDB, db: dbOperations, connectDB };
