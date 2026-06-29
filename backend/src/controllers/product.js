const ProductModel = require('../models/product');
const { productSchema, querySchema } = require('../validations/product');

async function getAll(req, res, next) {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const result = await ProductModel.findAll(parsed.data);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const product = await ProductModel.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const product = await ProductModel.create(parsed.data);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'Category not found' });
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const product = await ProductModel.update(req.params.id, parsed.data);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'SKU already exists' });
    if (err.code === '23503') return res.status(400).json({ error: 'Category not found' });
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await ProductModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Product not found' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Product is referenced by existing orders or stock movements' });
    }
    next(err);
  }
}

module.exports = { getAll, getOne, create, update, remove };
