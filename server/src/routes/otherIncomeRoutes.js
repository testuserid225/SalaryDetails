const express = require('express');
const router = express.Router();
const {
  getOtherIncomes,
  createOtherIncome,
  updateOtherIncome,
  deleteOtherIncome,
} = require('../controllers/otherIncomeController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getOtherIncomes)
  .post(createOtherIncome);

router.route('/:id')
  .put(updateOtherIncome)
  .delete(deleteOtherIncome);

module.exports = router;
