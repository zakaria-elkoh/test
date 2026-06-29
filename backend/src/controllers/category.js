const CategoryModel = require('../models/category');
const { categorySchema } = require('../validations/category');

async function getAll(req, res, next) {
  try {
    const categories = await CategoryModel.findAll();
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const category = await CategoryModel.findById(req.params.id);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const category = await CategoryModel.create(parsed.data.name);
    res.status(201).json(category);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const parsed = categorySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }
    const category = await CategoryModel.update(req.params.id, parsed.data.name);
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const deleted = await CategoryModel.remove(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Category not found' });
    res.status(204).send();
  } catch (err) {
    if (err.code === '23503') {
      return res.status(409).json({ error: 'Category is in use by one or more products' });
    }
    next(err);
  }
}

module.exports = { getAll, getOne, create, update, remove };
