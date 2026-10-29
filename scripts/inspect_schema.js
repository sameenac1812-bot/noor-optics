const db = new (require('better-sqlite3'))('data/noor_optics.db');
const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='customers'").get();
console.log('Customers SQL:', sql.sql);
const indexes = db.prepare("PRAGMA index_list('customers')").all();
console.log('Customers indexes:', indexes);
