const { Router } = require('express');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { getAll, getOne, create, update, remove } = require('../controllers/product');

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', requireAdmin, remove);

module.exports = router;
