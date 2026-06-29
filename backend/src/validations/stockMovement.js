const { z } = require('zod');

const stockMovementSchema = z.object({
  productId: z.number().int().positive(),
  type:      z.enum(['IN', 'OUT']),
  quantity:  z.number().int().positive(),
  reason:    z.string().max(255).optional(),
});

const querySchema = z.object({
  productId: z.coerce.number().int().positive().optional(),
});

module.exports = { stockMovementSchema, querySchema };
