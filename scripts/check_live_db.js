const db = new (require('better-sqlite3'))('data/noor_optics.db');
console.log('Live customers count:', db.prepare('SELECT count(*) as c FROM customers').get().c);
console.log('Live orders count:', db.prepare('SELECT count(*) as c FROM orders').get().c);
console.log('Live dummy order count:', db.prepare("SELECT count(*) as c FROM orders WHERE order_number LIKE 'TEST-%'").get().c);
console.log('Live customers:', db.prepare('SELECT id, client_code, name, phone, total_spent_paise FROM customers').all());
