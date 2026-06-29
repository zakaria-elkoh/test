const { z } = require('zod');

const createOrderSchema = z.object({
  clientId: z.number().int().positive(),
});

const addItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity:  z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
});

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'delivered']),
});

const querySchema = z.object({
  status: z.enum(['draft', 'confirmed', 'cancelled', 'delivered']).optional(),
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

module.exports = { createOrderSchema, addItemSchema, updateStatusSchema, querySchema };
