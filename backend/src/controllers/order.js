const OrderModel = require('../models/order');
const { createOrderSchema, addItemSchema, updateStatusSchema, querySchema } = require('../validations/order');

async function getAll(req, res, next) {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const orders = await OrderModel.findAll(parsed.data);
    res.json(orders);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const order = await OrderModel.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const order = await OrderModel.create({
      clientId: parsed.data.clientId,
      createdBy: req.user.id,
    });
    res.status(201).json(order);
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ error: 'Client not found' });
    next(err);
  }
}

async function addItem(req, res, next) {
  try {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const item = await OrderModel.addItem(req.params.id, parsed.data);
    res.status(201).json(item);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    if (err.code === '23503') return res.status(400).json({ error: 'Product not found' });
    next(err);
  }
}

async function removeItem(req, res, next) {
  try {
    await OrderModel.removeItem(req.params.id, req.params.itemId);
    res.status(204).send();
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const order = await OrderModel.updateStatus(req.params.id, parsed.data.status, req.user.id);
    res.json(order);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

module.exports = { getAll, getOne, create, addItem, removeItem, updateStatus };
