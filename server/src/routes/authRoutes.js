const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updatePassword,
  updateCredentials,
  seedDemoData,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', protect, getMe);
router.put('/password', protect, updatePassword);
router.put('/credentials', protect, updateCredentials);
router.post('/seed-demo', protect, seedDemoData);

router.post('/request-reset', authLimiter, requestPasswordReset);
router.post('/reset', authLimiter, resetPassword);
module.exports = router;
