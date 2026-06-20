const { Pool } = require('pg');

let pool = null;
let ready = false;
let cache = {};

const ALL_TABLES = [
  'appointments', 'audit_logs', 'blog_posts', 'chat_messages',
  'clients', 'contacts', 'delete_requests', 'discount_usage',
  'followups', 'orders', 'push_subscriptions', 'reviews',
  'template_orders', 'uploads', 'vault_files', 'visitors'
];

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING || '';
  if (!connectionString) throw new Error('DATABASE_URL not set');
  pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  pool.on('error', err => console.error('PostgreSQL pool error:', err.message));
  return pool;
}

async function load() {
  const p = getPool();
  try {
    for (const table of ALL_TABLES) {
      await p.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY,
          json JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
    }
    console.log('PostgreSQL tables ready');
    ready = true;
    return true;
  } catch (err) {
    console.error('Failed to initialize PostgreSQL:', err.message);
    throw err;
  }
}

function insert(collection, item) {
  if (!cache[collection]) cache[collection] = [];
  cache[collection].push(item);
  const p = getPool();
  const json = JSON.stringify(item);
  p.query('INSERT INTO ' + collection + ' (id, json) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET json = $2', [item.id, json])
    .catch(err => console.error('DB insert error [' + collection + ']:', err.message));
  return item;
}

function update(collection, id, updates) {
  const p = getPool();
  const cached = cache[collection] ? cache[collection].find(i => i.id === id) : null;
  if (!cached) {
    p.query('SELECT json FROM ' + collection + ' WHERE id = $1', [id]).then(result => {
      if (!result.rows.length) return null;
      const existing = result.rows[0].json;
      const updated = { ...existing, ...updates };
      if (cache[collection]) cache[collection] = cache[collection].map(i => i.id === id ? updated : i);
      p.query('UPDATE ' + collection + ' SET json = $1 WHERE id = $2', [JSON.stringify(updated), id])
        .catch(err => console.error('DB update error [' + collection + ']:', err.message));
      return updated;
    }).catch(err => console.error('DB update error [' + collection + ']:', err.message));
    return null;
  }
  const updated = { ...cached, ...updates };
  if (cache[collection]) cache[collection] = cache[collection].map(i => i.id === id ? updated : i);
  p.query('UPDATE ' + collection + ' SET json = $1 WHERE id = $2', [JSON.stringify(updated), id])
    .catch(err => console.error('DB update error [' + collection + ']:', err.message));
  return updated;
}

async function query(collection, filterFn) {
  if (!cache[collection]) cache[collection] = [];
  const p = getPool();
  try {
    const result = await p.query('SELECT json FROM ' + collection + ' ORDER BY created_at');
    const items = result.rows.map(r => r.json);
    cache[collection] = items;
    if (filterFn) return items.filter(filterFn);
    return items;
  } catch (err) {
    console.error('DB query error [' + collection + ']:', err.message);
    const cached = cache[collection] || [];
    if (filterFn) return cached.filter(filterFn);
    return cached;
  }
}

function getCollection(name) {
  return query(name, null);
}

function run(sql, params) {
  const p = getPool();
  p.query(sql, params).catch(err => console.error('DB run error:', err.message));
}

function save() {
}

module.exports = { getCollection, insert, update, query, load, run, save };
