const { z } = require('zod');

const categorySchema = z.object({
  name: z.string().min(1).max(100),
});

module.exports = { categorySchema };
