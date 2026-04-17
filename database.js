const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const path = require('path');

const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const defaultData = {
  types: [],
  codes: [],
  records: []
};

const db = new Low(adapter, defaultData);

// 初始化数据库
async function initDB() {
  await db.read();
  db.data ||= defaultData;
  await db.write();
}

module.exports = { db, initDB };
