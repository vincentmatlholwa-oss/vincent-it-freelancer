const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data.db');

let db = null;
let SQL = null;

function getDb() {
    if (db) return db;
    throw new Error('Database not initialized. Call load() first.');
}

function load() {
    return new Promise(async (resolve) => {
        SQL = await initSqlJs();
        try {
            if (fs.existsSync(DB_PATH)) {
                const buffer = fs.readFileSync(DB_PATH);
                db = new SQL.Database(buffer);
            } else {
                db = new SQL.Database();
            }
        } catch (e) {
            console.error('Error loading DB, creating fresh:', e.message);
            db = new SQL.Database();
        }
        db.run(`CREATE TABLE IF NOT EXISTS data (
            collection TEXT NOT NULL,
            id TEXT NOT NULL,
            json TEXT NOT NULL,
            PRIMARY KEY (collection, id)
        )`);
        db.run(`CREATE INDEX IF NOT EXISTS idx_collection ON data(collection)`);
        resolve(true);
    });
}

function save() {
    const data = db.export();
    const buffer = Buffer.from(data);
    const tmp = DB_PATH + '.tmp';
    fs.writeFileSync(tmp, buffer);
    fs.renameSync(tmp, DB_PATH);
}

function insert(collection, item) {
    const d = getDb();
    d.run('INSERT OR REPLACE INTO data (collection, id, json) VALUES (?, ?, ?)', [collection, item.id, JSON.stringify(item)]);
    save();
    return item;
}

function update(collection, id, updates) {
    const d = getDb();
    const row = d.exec('SELECT json FROM data WHERE collection = ? AND id = ?', [collection, id]);
    if (!row.length) return null;
    const existing = JSON.parse(row[0].values[0][0]);
    const updated = { ...existing, ...updates };
    d.run('UPDATE data SET json = ? WHERE collection = ? AND id = ?', [JSON.stringify(updated), collection, id]);
    save();
    return updated;
}

function query(collection, filterFn) {
    const d = getDb();
    const rows = d.exec('SELECT json FROM data WHERE collection = ?', [collection]);
    if (!rows.length) return [];
    const items = rows[0].values.map(row => JSON.parse(row[0]));
    if (filterFn) return items.filter(filterFn);
    return items;
}

function getCollection(name) {
    return query(name, null);
}

module.exports = { getCollection, insert, update, query, load };
