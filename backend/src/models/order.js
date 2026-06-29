const pool = require('../db/pool');

// Valid status transitions
const TRANSITIONS = {
  draft:     ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  cancelled: [],
  delivered: [],
};

async function findAll({ status, date }) {
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`o.status = $${params.length}`);
  }
  if (date) {
    params.push(date);
    conditions.push(`o.created_at::date = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT o.id, o.status, o.total_amount, o.created_at,
            c.id AS client_id, c.full_name AS client_name,
            u.id AS created_by_id, u.full_name AS created_by_name
     FROM orders o
     JOIN clients c ON c.id = o.client_id
     JOIN users u   ON u.id = o.created_by
     ${where}
     ORDER BY o.created_at DESC`,
    params
  );
  return rows;
}

async function findById(id) {
  const { rows: orderRows } = await pool.query(
    `SELECT o.id, o.status, o.total_amount, o.created_at,
            c.id AS client_id, c.full_name AS client_name,
            u.id AS created_by_id, u.full_name AS created_by_name
     FROM orders o
     JOIN clients c ON c.id = o.client_id
     JOIN users u   ON u.id = o.created_by
     WHERE o.id = $1`,
    [id]
  );
  if (!orderRows[0]) return null;

  const { rows: itemRows } = await pool.query(
    `SELECT oi.id, oi.quantity, oi.unit_price, oi.subtotal,
            p.id AS product_id, p.name AS product_name, p.sku
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = $1
     ORDER BY oi.id`,
    [id]
  );

  return { ...orderRows[0], items: itemRows };
}

async function create({ clientId, createdBy }) {
  const { rows } = await pool.query(
    `INSERT INTO orders (client_id, created_by)
     VALUES ($1, $2)
     RETURNING id, client_id, status, total_amount, created_by, created_at`,
    [clientId, createdBy]
  );
  return rows[0];
}

async function addItem(orderId, { productId, quantity, unitPrice }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure order exists and is still draft
    const { rows: orderRows } = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (!orderRows[0]) throw Object.assign(new Error('Order not found'), { status: 404 });
    if (orderRows[0].status !== 'draft') {
      throw Object.assign(new Error('Cannot modify a non-draft order'), { status: 409 });
    }

    // Upsert item (same product → update quantity)
    const { rows: itemRows } = await client.query(
      `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (order_id, product_id)
       DO UPDATE SET quantity = $3, unit_price = $4
       RETURNING id, order_id, product_id, quantity, unit_price, subtotal`,
      [orderId, productId, quantity, unitPrice]
    );

    // Recalculate total_amount
    await client.query(
      `UPDATE orders
       SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = $1)
       WHERE id = $1`,
      [orderId]
    );

    await client.query('COMMIT');
    return itemRows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function removeItem(orderId, itemId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (!orderRows[0]) throw Object.assign(new Error('Order not found'), { status: 404 });
    if (orderRows[0].status !== 'draft') {
      throw Object.assign(new Error('Cannot modify a non-draft order'), { status: 409 });
    }

    const { rowCount } = await client.query(
      'DELETE FROM order_items WHERE id = $1 AND order_id = $2',
      [itemId, orderId]
    );
    if (rowCount === 0) throw Object.assign(new Error('Item not found'), { status: 404 });

    await client.query(
      `UPDATE orders
       SET total_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM order_items WHERE order_id = $1)
       WHERE id = $1`,
      [orderId]
    );

    await client.query('COMMIT');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateStatus(orderId, newStatus, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: orderRows } = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );

    if (!orderRows[0]) throw Object.assign(new Error('Order not found'), { status: 404 });

    const { rows: itemRows } = await client.query(
      'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
      [orderId]
    );

    const order = { ...orderRows[0], items: itemRows };
    const allowed = TRANSITIONS[order.status] || [];

    if (!allowed.includes(newStatus)) {
      throw Object.assign(
        new Error(`Cannot transition from '${order.status}' to '${newStatus}'`),
        { status: 409 }
      );
    }

    // Confirm: check stock and decrement
    if (newStatus === 'confirmed') {
      const items = order.items;
      if (items.length === 0) {
        throw Object.assign(new Error('Cannot confirm an order with no items'), { status: 409 });
      }

      for (const item of items) {
        const { rows: stockRows } = await client.query(
          'SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE',
          [item.product_id]
        );
        if (!stockRows[0] || stockRows[0].stock_quantity < item.quantity) {
          throw Object.assign(
            new Error(`Insufficient stock for product id ${item.product_id}`),
            { status: 409 }
          );
        }

        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );

        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
           VALUES ($1, 'OUT', $2, $3, $4)`,
          [item.product_id, item.quantity, `Order #${orderId} confirmed`, userId]
        );
      }
    }

    // Cancel a confirmed order: restore stock
    if (newStatus === 'cancelled' && order.status === 'confirmed') {
      const items = order.items;
      for (const item of items) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity + $1 WHERE id = $2',
          [item.quantity, item.product_id]
        );
        await client.query(
          `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
           VALUES ($1, 'IN', $2, $3, $4)`,
          [item.product_id, item.quantity, `Order #${orderId} cancelled — stock restored`, userId]
        );
      }
    }

    const { rows: updated } = await client.query(
      `UPDATE orders SET status = $1 WHERE id = $2
       RETURNING id, client_id, status, total_amount, created_by, created_at`,
      [newStatus, orderId]
    );

    await client.query('COMMIT');
    return updated[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { findAll, findById, create, addItem, removeItem, updateStatus };
