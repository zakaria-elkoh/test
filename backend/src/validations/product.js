const { z } = require('zod');

const productSchema = z.object({
  name:       z.string().min(1).max(150),
  sku:        z.string().min(1).max(80),
  price:      z.number().nonnegative(),
  categoryId: z.number().int().positive(),
});

const querySchema = z.object({
  search: z.string().optional().default(''),
  page:   z.coerce.number().int().positive().optional().default(1),
  limit:  z.coerce.number().int().positive().max(100).optional().default(10),
});

module.exports = { productSchema, querySchema };
