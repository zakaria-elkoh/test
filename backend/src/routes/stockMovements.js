const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { getAll, create } = require('../controllers/stockMovement');

const router = Router();

router.use(authenticate);

router.get('/', getAll);
router.post('/', create);

module.exports = router;
