const express = require('express');
const router = express.Router();
const {
  getHistories,
  createHistory,
  updateHistory,
  deleteHistory,
} = require('../controllers/employmentHistoryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getHistories)
  .post(createHistory);

router.route('/:id')
  .put(updateHistory)
  .delete(deleteHistory);

module.exports = router;
