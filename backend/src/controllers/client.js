const ClientModel = require('../models/client');
const { clientSchema, querySchema } = require('../validations/client');

async function getAll(req, res, next) {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const clients = await ClientModel.findAll(parsed.data);
    res.json(clients);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const client = await ClientModel.findById(req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const client = await ClientModel.create(parsed.data);
    res.status(201).json(client);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const parsed = clientSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const client = await ClientModel.update(req.params.id, parsed.data);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await ClientModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Client not found' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Client has existing orders' });
    }
    next(err);
  }
}

module.exports = { getAll, getOne, create, update, remove };
