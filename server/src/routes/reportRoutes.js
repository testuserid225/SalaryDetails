const express = require('express');
const router = express.Router();
const { getReports, exportReportCSV } = require('../controllers/reportsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getReports);
router.get('/export/csv', exportReportCSV);

module.exports = router;
