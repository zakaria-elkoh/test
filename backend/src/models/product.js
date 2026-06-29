const pool = require('../db/pool');

async function findAll({ search = '', page = 1, limit = 10 }) {
  const offset = (page - 1) * limit;
  const pattern = `%${search}%`;

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.sku, p.price, p.stock_quantity,
            p.created_at, c.id AS category_id, c.name AS category_name
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.name ILIKE $1 OR p.sku ILIKE $1
     ORDER BY p.created_at DESC
     LIMIT $2 OFFSET $3`,
    [pattern, limit, offset]
  );

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*) FROM products p
     WHERE p.name ILIKE $1 OR p.sku ILIKE $1`,
    [pattern]
  );

  return { data: rows, total: parseInt(countRows[0].count, 10), page, limit };
}

async function findById(id) {
  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.sku, p.price, p.stock_quantity,
            p.created_at, c.id AS category_id, c.name AS category_name
     FROM products p
     JOIN categories c ON c.id = p.category_id
     WHERE p.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function create({ name, sku, price, categoryId }) {
  const { rows } = await pool.query(
    `INSERT INTO products (name, sku, price, category_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, sku, price, stock_quantity, category_id, created_at`,
    [name, sku, price, categoryId]
  );
  return rows[0];
}

async function update(id, { name, sku, price, categoryId }) {
  const { rows } = await pool.query(
    `UPDATE products
     SET name = $1, sku = $2, price = $3, category_id = $4
     WHERE id = $5
     RETURNING id, name, sku, price, stock_quantity, category_id, created_at`,
    [name, sku, price, categoryId, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const { rowCount } = await pool.query('DELETE FROM products WHERE id = $1', [id]);
  return rowCount > 0;
}

module.exports = { findAll, findById, create, update, remove };
