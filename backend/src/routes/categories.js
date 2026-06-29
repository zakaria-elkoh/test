const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { getAll, getOne, create, update, remove } = require('../controllers/category');

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getOne);

// admin only: create, update, delete
router.post('/', requireAdmin, create);
router.put('/:id', requireAdmin, update);
router.delete('/:id', requireAdmin, remove);

module.exports = router;
