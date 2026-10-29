const express = require('express');
const router = express.Router();
const {
  getBonuses,
  createBonus,
  updateBonus,
  deleteBonus,
  exportBonusesCSV,
  updatePaidBonusAmount,
} = require('../controllers/bonusController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/export/csv', exportBonusesCSV);

router.put('/paid-bonus-amount', updatePaidBonusAmount);

router.route('/')
  .get(getBonuses)
  .post(createBonus);

router.route('/:id')
  .put(updateBonus)
  .delete(deleteBonus);

module.exports = router;
