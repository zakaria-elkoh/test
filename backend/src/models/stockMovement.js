const pool = require('../db/pool');

async function findAll({ productId }) {
  const conditions = [];
  const params = [];

  if (productId) {
    params.push(productId);
    conditions.push(`sm.product_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT sm.id, sm.type, sm.quantity, sm.reason, sm.created_at,
            p.id AS product_id, p.name AS product_name, p.sku,
            u.id AS created_by_id, u.full_name AS created_by_name
     FROM stock_movements sm
     JOIN products p ON p.id = sm.product_id
     JOIN users u    ON u.id = sm.created_by
     ${where}
     ORDER BY sm.created_at DESC`,
    params
  );
  return rows;
}

async function create({ productId, type, quantity, reason, createdBy }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: productRows } = await client.query(
      'SELECT id, stock_quantity FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );

    if (!productRows[0]) throw Object.assign(new Error('Product not found'), { status: 404 });

    const currentStock = productRows[0].stock_quantity;

    if (type === 'OUT' && currentStock < quantity) {
      throw Object.assign(
        new Error(`Insufficient stock. Available: ${currentStock}, requested: ${quantity}`),
        { status: 409 }
      );
    }

    const delta = type === 'IN' ? quantity : -quantity;
    await client.query(
      'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
      [delta, productId]
    );

    const { rows } = await client.query(
      `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, product_id, type, quantity, reason, created_by, created_at`,
      [productId, type, quantity, reason || null, createdBy]
    );

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findAll, create };
