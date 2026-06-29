const { Router } = require('express');
const { login, me } = require('../controllers/auth');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.post('/login', login);
router.get('/me', authenticate, me);

module.exports = router;
