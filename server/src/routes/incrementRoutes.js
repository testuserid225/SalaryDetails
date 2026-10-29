const express = require('express');
const router = express.Router();
const {
  getIncrements,
  createIncrement,
  updateIncrement,
  deleteIncrement,
} = require('../controllers/incrementController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getIncrements)
  .post(createIncrement);

router.route('/:id')
  .put(updateIncrement)
  .delete(deleteIncrement);

module.exports = router;
