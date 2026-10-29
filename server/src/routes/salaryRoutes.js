const express = require('express');
const router = express.Router();
const {
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  deleteSalary,
  exportSalaryCSV,
  importSalaries,
} = require('../controllers/salaryController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/export/csv', exportSalaryCSV);
router.post('/import', importSalaries);

router.route('/')
  .get(getSalaries)
  .post(createSalary);

router.route('/:id')
  .get(getSalaryById)
  .put(updateSalary)
  .delete(deleteSalary);

module.exports = router;
