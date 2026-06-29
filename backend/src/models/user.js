const pool = require('../db/pool');

async function findByEmail(email) {
  const { rows } = await pool.query(
    'SELECT id, full_name, email, password, role FROM users WHERE email = $1',
    [email]
  );
  return rows[0] || null;
}

async function findById(id) {
  const { rows } = await pool.query(
    'SELECT id, full_name, email, role, created_at FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

module.exports = { findByEmail, findById };
