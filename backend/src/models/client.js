const pool = require('../db/pool');

async function findAll({ search = '' }) {
  const pattern = `%${search}%`;
  const { rows } = await pool.query(
    `SELECT id, full_name, phone, email, created_at
     FROM clients
     WHERE full_name ILIKE $1 OR phone ILIKE $1
     ORDER BY full_name ASC`,
    [pattern]
  );
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, full_name, phone, email, created_at FROM clients WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

async function create({ fullName, phone, email }) {
  const { rows } = await pool.query(
    `INSERT INTO clients (full_name, phone, email)
     VALUES ($1, $2, $3)
     RETURNING id, full_name, phone, email, created_at`,
    [fullName, phone, email || null]
  );
  return rows[0];
}

async function update(id, { fullName, phone, email }) {
  const { rows } = await pool.query(
    `UPDATE clients
     SET full_name = $1, phone = $2, email = $3
     WHERE id = $4
     RETURNING id, full_name, phone, email, created_at`,
    [fullName, phone, email || null, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM clients WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };
