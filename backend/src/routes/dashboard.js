const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const { getStats } = require('../controllers/dashboard');

const router = Router();

router.get('/', authenticate, getStats);

module.exports = router;
