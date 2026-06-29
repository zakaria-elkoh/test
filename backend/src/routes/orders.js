const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { getAll, getOne, create, addItem, removeItem, updateStatus } = require('../controllers/order');

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', create);
router.post('/:id/items', addItem);
router.delete('/:id/items/:itemId', removeItem);
router.patch('/:id/status', updateStatus);

module.exports = router;
