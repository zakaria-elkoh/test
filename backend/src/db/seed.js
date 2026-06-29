require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./pool');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── Clean existing data (order matters for FK) ──────────────────
    await client.query('DELETE FROM stock_movements');
    await client.query('DELETE FROM order_items');
    await client.query('DELETE FROM orders');
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM categories');
    await client.query('DELETE FROM clients');
    await client.query('DELETE FROM users');

    // Reset sequences
    await client.query(`
      SELECT setval('users_id_seq', 1, false),
             setval('categories_id_seq', 1, false),
             setval('products_id_seq', 1, false),
             setval('clients_id_seq', 1, false),
             setval('orders_id_seq', 1, false),
             setval('order_items_id_seq', 1, false),
             setval('stock_movements_id_seq', 1, false)
    `);

    // ── Users ────────────────────────────────────────────────────────
    const hash = async (pw) => bcrypt.hash(pw, 10);

    const { rows: users } = await client.query(
      `INSERT INTO users (full_name, email, password, role) VALUES
        ('Admin User',   'admin@stockflow.com',  $1, 'admin'),
        ('Staff Alice',  'alice@stockflow.com',  $2, 'staff'),
        ('Staff Bob',    'bob@stockflow.com',    $3, 'staff')
       RETURNING id`,
      [await hash('admin123'), await hash('staff123'), await hash('staff123')]
    );
    const [adminId, aliceId, bobId] = users.map(u => u.id);
    console.log('✓ Users seeded');

    // ── Categories ───────────────────────────────────────────────────
    const { rows: cats } = await client.query(
      `INSERT INTO categories (name) VALUES
        ('Electronics'),
        ('Clothing'),
        ('Home & Kitchen'),
        ('Sports & Outdoors'),
        ('Books & Stationery')
       RETURNING id`
    );
    const [elecId, clothId, homeId, sportId, booksId] = cats.map(c => c.id);
    console.log('✓ Categories seeded');

    // ── Products (15) — stock set to 0; bumped via stock movements below ──
    const { rows: prods } = await client.query(
      `INSERT INTO products (name, sku, price, category_id) VALUES
        ('iPhone 15 Pro',        'APL-IP15P',  1199.99, $1),
        ('Samsung Galaxy S24',   'SAM-GS24',    899.99, $1),
        ('Sony WH-1000XM5',      'SNY-WH5',     349.99, $1),
        ('MacBook Air M3',       'APL-MBA-M3', 1299.99, $1),
        ('Logitech MX Master 3', 'LOG-MXM3',     99.99, $1),
        ('Levi\''s 501 Jeans',   'LEV-501-BL',   79.99, $2),
        ('Nike Air Max 270',     'NIK-AM270',   129.99, $2),
        ('Adidas Hoodie',        'ADI-HOOD-BK',  59.99, $2),
        ('Instant Pot Duo 7-in-1','POT-DUO7',    89.99, $3),
        ('Dyson V15 Vacuum',     'DYS-V15',     599.99, $3),
        ('Yoga Mat Pro',         'YOG-MATP',     39.99, $4),
        ('Kettlebell 16kg',      'KTB-16KG',     49.99, $4),
        ('Trailblazer Backpack', 'TRL-BP45',     89.99, $4),
        ('Atomic Habits',        'BK-ATOMHB',    18.99, $5),
        ('Moleskine Notebook',   'MLK-NB-BLK',   14.99, $5)
       RETURNING id`,
      [elecId, clothId, homeId, sportId, booksId]
    );
    const pIds = prods.map(p => p.id);
    console.log('✓ Products seeded');

    // ── Stock IN movements (initial stock) ───────────────────────────
    const initialStock = [100, 80, 60, 40, 120, 200, 150, 180, 90, 30, 250, 100, 70, 500, 300];
    for (let i = 0; i < pIds.length; i++) {
      await client.query(
        `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
         VALUES ($1, 'IN', $2, 'Initial stock', $3)`,
        [pIds[i], initialStock[i], adminId]
      );
      await client.query(
        'UPDATE products SET stock_quantity = $1 WHERE id = $2',
        [initialStock[i], pIds[i]]
      );
    }
    console.log('✓ Initial stock movements seeded');

    // ── Clients ──────────────────────────────────────────────────────
    const { rows: clientRows } = await client.query(
      `INSERT INTO clients (full_name, phone, email) VALUES
        ('Jean Dupont',    '0611111111', 'jean.dupont@email.com'),
        ('Marie Curie',    '0622222222', 'marie.curie@email.com'),
        ('Ahmed Benali',   '0633333333', null),
        ('Sophie Martin',  '0644444444', 'sophie.martin@email.com'),
        ('Lucas Bernard',  '0655555555', null)
       RETURNING id`
    );
    const cIds = clientRows.map(c => c.id);
    console.log('✓ Clients seeded');

    // ── Orders (10 with varied statuses) ────────────────────────────
    // Helper: create order + items, then set status (handling stock)
    const makeOrder = async (clientId, createdBy, items, finalStatus) => {
      const { rows: oRows } = await client.query(
        `INSERT INTO orders (client_id, created_by) VALUES ($1, $2) RETURNING id`,
        [clientId, createdBy]
      );
      const orderId = oRows[0].id;

      for (const { productId, quantity, unitPrice } of items) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
           VALUES ($1, $2, $3, $4)`,
          [orderId, productId, quantity, unitPrice]
        );
      }

      await client.query(
        `UPDATE orders
         SET total_amount = (SELECT COALESCE(SUM(subtotal),0) FROM order_items WHERE order_id = $1)
         WHERE id = $1`,
        [orderId]
      );

      // Apply stock OUT for confirmed/delivered orders
      if (finalStatus === 'confirmed' || finalStatus === 'delivered') {
        for (const { productId, quantity } of items) {
          await client.query(
            'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
            [quantity, productId]
          );
          await client.query(
            `INSERT INTO stock_movements (product_id, type, quantity, reason, created_by)
             VALUES ($1, 'OUT', $2, $3, $4)`,
            [productId, quantity, `Order #${orderId} ${finalStatus}`, createdBy]
          );
        }
      }

      if (finalStatus !== 'draft') {
        await client.query('UPDATE orders SET status = $1 WHERE id = $2', [finalStatus, orderId]);
      }

      return orderId;
    };

    await makeOrder(cIds[0], adminId, [
      { productId: pIds[0], quantity: 2, unitPrice: 1199.99 },
      { productId: pIds[2], quantity: 1, unitPrice: 349.99  },
    ], 'delivered');

    await makeOrder(cIds[1], aliceId, [
      { productId: pIds[3], quantity: 1, unitPrice: 1299.99 },
      { productId: pIds[4], quantity: 2, unitPrice: 99.99   },
    ], 'confirmed');

    await makeOrder(cIds[2], bobId, [
      { productId: pIds[5], quantity: 3, unitPrice: 79.99 },
      { productId: pIds[6], quantity: 2, unitPrice: 129.99 },
    ], 'confirmed');

    await makeOrder(cIds[3], aliceId, [
      { productId: pIds[8], quantity: 1, unitPrice: 89.99 },
    ], 'delivered');

    await makeOrder(cIds[4], adminId, [
      { productId: pIds[10], quantity: 4, unitPrice: 39.99 },
      { productId: pIds[11], quantity: 2, unitPrice: 49.99 },
    ], 'delivered');

    await makeOrder(cIds[0], aliceId, [
      { productId: pIds[1], quantity: 1, unitPrice: 899.99 },
    ], 'draft');

    await makeOrder(cIds[1], bobId, [
      { productId: pIds[13], quantity: 5, unitPrice: 18.99 },
      { productId: pIds[14], quantity: 3, unitPrice: 14.99 },
    ], 'draft');

    await makeOrder(cIds[2], adminId, [
      { productId: pIds[7], quantity: 2, unitPrice: 59.99 },
    ], 'cancelled');

    await makeOrder(cIds[3], aliceId, [
      { productId: pIds[9],  quantity: 1, unitPrice: 599.99 },
      { productId: pIds[12], quantity: 1, unitPrice: 89.99  },
    ], 'confirmed');

    await makeOrder(cIds[4], bobId, [
      { productId: pIds[0], quantity: 1, unitPrice: 1199.99 },
      { productId: pIds[6], quantity: 3, unitPrice: 129.99  },
    ], 'draft');

    console.log('✓ Orders seeded');

    await client.query('COMMIT');
    console.log('\n✅ Seed complete.');
    console.log('   admin@stockflow.com  / admin123');
    console.log('   alice@stockflow.com  / staff123');
    console.log('   bob@stockflow.com    / staff123');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
