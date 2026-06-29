const StockMovementModel = require('../models/stockMovement');
const { stockMovementSchema, querySchema } = require('../validations/stockMovement');

async function getAll(req, res, next) {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const movements = await StockMovementModel.findAll(parsed.data);
    res.json(movements);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const parsed = stockMovementSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const movement = await StockMovementModel.create({
      ...parsed.data,
      createdBy: req.user.id,
    });
    res.status(201).json(movement);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    next(err);
  }
}

module.exports = { getAll, create };
