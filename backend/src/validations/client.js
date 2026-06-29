const { z } = require('zod');

const clientSchema = z.object({
  fullName: z.string().min(1).max(100),
  phone:    z.string().min(1).max(30),
  email:    z.string().email().optional(),
});

const querySchema = z.object({
  search: z.string().optional().default(''),
});

module.exports = { clientSchema, querySchema };
