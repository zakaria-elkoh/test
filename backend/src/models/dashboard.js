const pool = require('../db/pool');

async function getStats() {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM products)                                AS total_products,
      (SELECT COUNT(*) FROM clients)                                 AS total_clients,
      (SELECT COUNT(*) FROM orders WHERE created_at::date = NOW()::date) AS orders_today,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders
       WHERE status = 'confirmed' OR status = 'delivered')          AS total_revenue
  `);

  const { rows: topProducts } = await pool.query(`
    SELECT p.id, p.name, p.sku, SUM(oi.quantity) AS total_sold
    FROM order_items oi
    JOIN orders o  ON o.id  = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.status IN ('confirmed', 'delivered')
    GROUP BY p.id, p.name, p.sku
    ORDER BY total_sold DESC
    LIMIT 5
  `);

  return { ...rows[0], top_products: topProducts };
}

module.exports = { getStats };
