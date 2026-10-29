const SalaryRecord = require('../models/SalaryRecord');
const Bonus = require('../models/Bonus');
const User = require('../models/User');
const { Parser } = require('json2csv');

// Helper: Calculate working days (Mon-Fri, excluding Sat & Sun) for cycle: 24th prev month to 23rd current month
const calculateSalaryCycleWorkingDays = (month, year) => {
  const m = Number(month) || (new Date().getMonth() + 1);
  const y = Number(year) || new Date().getFullYear();
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;

  const startDate = new Date(Date.UTC(prevY, prevM - 1, 24));
  const endDate = new Date(Date.UTC(y, m - 1, 23));

  let count = 0;
  let cur = new Date(startDate);
  while (cur <= endDate) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count > 0 ? count : 22;
};

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// @desc    Generate dedicated Salary and Bonus reports
// @route   GET /api/reports
// @access  Private
const getReports = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      salaryCycle,
      salaryCompany,
      salaryStatus,
      bonusYear,
      bonusCompany,
      bonusStatus,
      search,
    } = req.query;

    // Fetch user for Paid Bonus Amount setting
    const user = await User.findById(userId);
    const paidBonusAmount = Number(user?.paidBonusAmount || 0);

    // -------------------------------------------------------------
    // 1. SALARY REPORT DATA
    // -------------------------------------------------------------
    const salaryAndConditions = [{ user: userId }];

    // Handle Sep-to-Aug cycle filter (e.g. "2025-2026" or "all")
    if (salaryCycle && salaryCycle !== 'all') {
      const parts = String(salaryCycle).trim().split('-');
      if (parts.length === 2) {
        const sy = Number(parts[0]);
        const ey = Number(parts[1]);
        salaryAndConditions.push({
          $or: [
            { salaryYear: sy, salaryMonth: { $gte: 9 } },
            { salaryYear: ey, salaryMonth: { $lte: 8 } },
          ],
        });
      } else if (!isNaN(Number(salaryCycle))) {
        salaryAndConditions.push({ salaryYear: Number(salaryCycle) });
      }
    }

    if (salaryCompany) {
      salaryAndConditions.push({ companyName: new RegExp(salaryCompany, 'i') });
    }

    if (salaryStatus) {
      salaryAndConditions.push({ paymentStatus: salaryStatus });
    }

    if (search) {
      salaryAndConditions.push({
        $or: [
          { companyName: { $regex: search, $options: 'i' } },
          { remark: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const salaryQuery = salaryAndConditions.length > 1
      ? { $and: salaryAndConditions }
      : salaryAndConditions[0];

    const rawSalaries = await SalaryRecord.find(salaryQuery)
      .sort({ salaryYear: -1, salaryMonth: -1 });

    let totalAmount = 0;
    let totalSalary = 0;
    let totalPT = 0;
    let totalPF = 0;
    let totalESIC = 0;
    let totalDiff = 0;
    let totalLeaveDeduction = 0;
    let totalLeaveTaken = 0;

    const salaryRecords = rawSalaries.map((s) => {
      const obj = s.toObject();
      const m = obj.salaryMonth || 1;
      const y = obj.salaryYear || 2026;
      const monthLabel = `${MONTH_NAMES[m] || m} ${y}`;
      const baseSalary = Number(obj.salary || obj.grossSalary || obj.monthlyBasicSalary || 0);
      const netAmount = Number(obj.amount || obj.takeHomeSalary || 0);
      const ptVal = Number(obj.pt || 0);
      const pfVal = Number(obj.pfAmount || 0);
      const esicVal = Number(obj.esic || 0);
      const diffVal = Number(obj.differencePerMonthAmount || (ptVal + pfVal + esicVal));
      const workDays = Number(obj.workingDays || calculateSalaryCycleWorkingDays(m, y));
      const perDay = Number(obj.perDaySalary || (workDays > 0 ? (baseSalary / workDays).toFixed(2) : 0));
      const leaveDed = Number(obj.leaveDeductionAmount || 0);
      const leaves = Number(obj.leaveTaken || 0);
      const cDate = obj.createdDate || obj.effectiveDate || obj.createdAt;

      totalAmount += netAmount;
      totalSalary += baseSalary;
      totalPT += ptVal;
      totalPF += pfVal;
      totalESIC += esicVal;
      totalDiff += diffVal;
      totalLeaveDeduction += leaveDed;
      totalLeaveTaken += leaves;

      return {
        _id: obj._id,
        monthLabel,
        salaryMonth: m,
        salaryYear: y,
        amount: netAmount,
        createdDate: cDate,
        salary: baseSalary,
        pt: ptVal,
        pfAmount: pfVal,
        esic: esicVal,
        differencePerMonthAmount: diffVal,
        workingDays: workDays,
        perDaySalary: perDay,
        leaveDeductionAmount: leaveDed,
        leaveTaken: leaves,
        remark: obj.remark || obj.notes || '',
        companyName: obj.companyName || 'Current Employer',
        paymentStatus: obj.paymentStatus || 'Received',
      };
    });

    // Available Sep-to-Aug cycles across all user salaries
    const allUserSalaries = await SalaryRecord.find({ user: userId }, { salaryYear: 1, salaryMonth: 1 });
    const cyclesMap = new Map();
    allUserSalaries.forEach((s) => {
      const cKey = s.salaryMonth >= 9 ? `${s.salaryYear}-${s.salaryYear + 1}` : `${s.salaryYear - 1}-${s.salaryYear}`;
      const [sYear, eYear] = cKey.split('-');
      if (!cyclesMap.has(cKey)) {
        cyclesMap.set(cKey, {
          value: cKey,
          label: `Sep ${sYear} - Aug ${eYear}`,
          startYear: Number(sYear),
        });
      }
    });
    const salaryCycleOptions = Array.from(cyclesMap.values()).sort((a, b) => b.startYear - a.startYear);
    const salaryCompanies = await SalaryRecord.distinct('companyName', { user: userId });

    // -------------------------------------------------------------
    // 2. BONUS REPORT DATA
    // -------------------------------------------------------------
    const bonusAndConditions = [{ user: userId }];

    if (bonusYear && bonusYear !== 'all') {
      bonusAndConditions.push({ bonusYear: Number(bonusYear) });
    }

    if (bonusCompany) {
      bonusAndConditions.push({ companyName: new RegExp(bonusCompany, 'i') });
    }

    if (bonusStatus) {
      bonusAndConditions.push({
        $or: [
          { status: new RegExp(bonusStatus, 'i') },
          { bonusStatus: new RegExp(bonusStatus, 'i') },
        ],
      });
    }

    if (search) {
      bonusAndConditions.push({
        $or: [
          { companyName: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },
          { bonusReason: { $regex: search, $options: 'i' } },
        ],
      });
    }

    const bonusQuery = bonusAndConditions.length > 1
      ? { $and: bonusAndConditions }
      : bonusAndConditions[0];

    const rawBonuses = await Bonus.find(bonusQuery).sort({ bonusYear: -1, bonusMonth: -1, createdAt: -1 });

    let totalMonthlyBonusAmount = 0;
    let totalMonthlyBonusGiven = 0;
    let totalDeductionAmount = 0;
    let givenCount = 0;
    let pendingCount = 0;

    const bonusRecords = rawBonuses.map((b) => {
      const obj = b.toObject();
      let m = obj.bonusMonth;
      let y = obj.bonusYear;
      if (!m) {
        const d = obj.actualPaymentDate || obj.expectedPaymentDate || obj.createdAt;
        m = d ? new Date(d).getMonth() + 1 : 1;
        y = d ? new Date(d).getFullYear() : 2026;
      }

      const monthLabel = m ? `${MONTH_NAMES[m] || m} ${y || ''}` : (obj.bonusPeriod || '—');
      const bAmt = Number(obj.monthlyBonusAmount || obj.bonusAmount || 0);
      const bGiven = obj.monthlyBonusGiven !== undefined
        ? Number(obj.monthlyBonusGiven)
        : (obj.bonusStatus === 'Paid' || obj.status === 'Given' ? bAmt : 0);
      const bDed = obj.deductionAmount !== undefined
        ? Number(obj.deductionAmount)
        : Math.max(0, bAmt - bGiven);
      const st = obj.status || (obj.bonusStatus === 'Paid' ? 'Given' : (obj.bonusStatus || 'Given'));

      totalMonthlyBonusAmount += bAmt;
      totalMonthlyBonusGiven += bGiven;

      if (st === 'Given' || st === 'Paid') {
        givenCount++;
      } else {
        pendingCount++;
      }

      return {
        _id: obj._id,
        monthLabel,
        bonusMonth: m,
        bonusYear: y,
        companyName: obj.companyName || 'Current Employer',
        monthlyBonusAmount: bAmt,
        monthlyBonusGiven: bGiven,
        deductionAmount: bDed,
        status: st,
        notes: obj.notes || obj.bonusReason || '',
      };
    });

    const allBonusYears = await Bonus.distinct('bonusYear', { user: userId });
    const bonusYears = (allBonusYears.filter(Boolean) || []).sort((a, b) => b - a);
    const bonusCompanies = await Bonus.distinct('companyName', { user: userId });

    totalDeductionAmount = Math.max(0, Number((totalMonthlyBonusAmount - totalMonthlyBonusGiven).toFixed(2)));
    const balanceResult = totalMonthlyBonusGiven - paidBonusAmount;

    res.status(200).json({
      success: true,
      salaryReport: {
        records: salaryRecords,
        stats: {
          totalAmount,
          totalSalary,
          totalPT,
          totalPF,
          totalESIC,
          totalDiff,
          totalLeaveDeduction,
          totalLeaveTaken,
          count: salaryRecords.length,
        },
        cycleOptions: salaryCycleOptions,
        companies: salaryCompanies,
      },
      bonusReport: {
        records: bonusRecords,
        stats: {
          totalMonthlyBonusAmount,
          totalMonthlyBonusGiven,
          totalDeductionAmount,
          paidBonusAmount,
          balanceResult,
          givenCount,
          pendingCount,
          count: bonusRecords.length,
        },
        years: bonusYears,
        companies: bonusCompanies,
      },
      summary: {
        totalSalaryNetReceived: totalAmount,
        totalBonusGiven: totalMonthlyBonusGiven,
        paidBonusAmount,
        netBalanceAfterPaidBonus: balanceResult,
        grandTotalEarnings: totalAmount + totalMonthlyBonusGiven,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export specific report to CSV (Salary or Bonus)
// @route   GET /api/reports/export/csv
// @access  Private
const exportReportCSV = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const {
      report = 'salary',
      salaryCycle,
      salaryCompany,
      salaryStatus,
      bonusYear,
      bonusCompany,
      bonusStatus,
    } = req.query;

    const dateStamp = new Date().toISOString().split('T')[0];

    // -------------------------------------------------------------
    // EXPORT BONUS REPORT
    // -------------------------------------------------------------
    if (report === 'bonus') {
      const bonusAndConditions = [{ user: userId }];

      if (bonusYear && bonusYear !== 'all') {
        bonusAndConditions.push({ bonusYear: Number(bonusYear) });
      }
      if (bonusCompany) {
        bonusAndConditions.push({ companyName: new RegExp(bonusCompany, 'i') });
      }
      if (bonusStatus) {
        bonusAndConditions.push({
          $or: [
            { status: new RegExp(bonusStatus, 'i') },
            { bonusStatus: new RegExp(bonusStatus, 'i') },
          ],
        });
      }

      const bonusQuery = bonusAndConditions.length > 1
        ? { $and: bonusAndConditions }
        : bonusAndConditions[0];

      const rawBonuses = await Bonus.find(bonusQuery).sort({ bonusYear: -1, bonusMonth: -1, createdAt: -1 });
      const user = await User.findById(userId);
      const paidBonusAmount = Number(user?.paidBonusAmount || 0);

      let sumAmount = 0;
      let sumGiven = 0;
      let sumDed = 0;

      const rows = rawBonuses.map((b) => {
        let m = b.bonusMonth;
        let y = b.bonusYear;
        if (!m) {
          const d = b.actualPaymentDate || b.expectedPaymentDate || b.createdAt;
          m = d ? new Date(d).getMonth() + 1 : 1;
          y = d ? new Date(d).getFullYear() : 2026;
        }

        const monthLabel = m ? `${MONTH_NAMES[m] || m} ${y || ''}` : (b.bonusPeriod || '—');
        const bAmt = Number(b.monthlyBonusAmount || b.bonusAmount || 0);
        const bGiven = b.monthlyBonusGiven !== undefined
          ? Number(b.monthlyBonusGiven)
          : (b.bonusStatus === 'Paid' || b.status === 'Given' ? bAmt : 0);
        const bDed = b.deductionAmount !== undefined
          ? Number(b.deductionAmount)
          : Math.max(0, bAmt - bGiven);
        const st = b.status || (b.bonusStatus === 'Paid' ? 'Given' : (b.bonusStatus || 'Given'));

        sumAmount += bAmt;
        sumGiven += bGiven;

        return {
          monthLabel,
          companyName: b.companyName || 'Current Employer',
          monthlyBonusAmount: bAmt.toFixed(2),
          monthlyBonusGiven: bGiven.toFixed(2),
          deductionAmount: bDed.toFixed(2),
          status: st,
          notes: b.notes || b.bonusReason || '',
        };
      });

      sumDed = Math.max(0, Number((sumAmount - sumGiven).toFixed(2)));

      // Append Grand Total Row
      rows.push({
        monthLabel: 'GRAND TOTAL',
        companyName: `Total Records: ${rows.length}`,
        monthlyBonusAmount: sumAmount.toFixed(2),
        monthlyBonusGiven: sumGiven.toFixed(2),
        deductionAmount: sumDed.toFixed(2),
        status: `Paid Bonus: ${paidBonusAmount.toFixed(2)} | Balance: ${(sumGiven - paidBonusAmount).toFixed(2)}`,
        notes: '',
      });

      const fields = [
        { label: 'Bonus Month & Year', value: 'monthLabel' },
        { label: 'Company', value: 'companyName' },
        { label: 'Monthly Bonus Amount', value: 'monthlyBonusAmount' },
        { label: 'Monthly Bonus Given', value: 'monthlyBonusGiven' },
        { label: 'Deduction Amount', value: 'deductionAmount' },
        { label: 'Status', value: 'status' },
        { label: 'Notes / Remark', value: 'notes' },
      ];

      const parser = new Parser({ fields });
      const csv = parser.parse(rows);
      res.header('Content-Type', 'text/csv');
      res.attachment(`salarydetails-bonus-report-${dateStamp}.csv`);
      return res.send(csv);
    }

    // -------------------------------------------------------------
    // EXPORT SALARY REPORT (DEFAULT)
    // -------------------------------------------------------------
    const salaryAndConditions = [{ user: userId }];

    if (salaryCycle && salaryCycle !== 'all') {
      const parts = String(salaryCycle).trim().split('-');
      if (parts.length === 2) {
        const sy = Number(parts[0]);
        const ey = Number(parts[1]);
        salaryAndConditions.push({
          $or: [
            { salaryYear: sy, salaryMonth: { $gte: 9 } },
            { salaryYear: ey, salaryMonth: { $lte: 8 } },
          ],
        });
      } else if (!isNaN(Number(salaryCycle))) {
        salaryAndConditions.push({ salaryYear: Number(salaryCycle) });
      }
    }

    if (salaryCompany) {
      salaryAndConditions.push({ companyName: new RegExp(salaryCompany, 'i') });
    }

    if (salaryStatus) {
      salaryAndConditions.push({ paymentStatus: salaryStatus });
    }

    const salaryQuery = salaryAndConditions.length > 1
      ? { $and: salaryAndConditions }
      : salaryAndConditions[0];

    const rawSalaries = await SalaryRecord.find(salaryQuery)
      .sort({ salaryYear: -1, salaryMonth: -1 });

    let sumAmount = 0;
    let sumSalary = 0;
    let sumPT = 0;
    let sumPF = 0;
    let sumESIC = 0;
    let sumDiff = 0;
    let sumLeaveDed = 0;
    let sumLeaveTaken = 0;

    const rows = rawSalaries.map((s) => {
      const m = s.salaryMonth || 1;
      const y = s.salaryYear || 2026;
      const monthLabel = `${MONTH_NAMES[m] || m} ${y}`;
      const baseSalary = Number(s.salary || s.grossSalary || s.monthlyBasicSalary || 0);
      const netAmount = Number(s.amount || s.takeHomeSalary || 0);
      const ptVal = Number(s.pt || 0);
      const pfVal = Number(s.pfAmount || 0);
      const esicVal = Number(s.esic || 0);
      const diffVal = Number(s.differencePerMonthAmount || (ptVal + pfVal + esicVal));
      const workDays = Number(s.workingDays || calculateSalaryCycleWorkingDays(m, y));
      const perDay = Number(s.perDaySalary || (workDays > 0 ? (baseSalary / workDays).toFixed(2) : 0));
      const leaveDed = Number(s.leaveDeductionAmount || 0);
      const leaves = Number(s.leaveTaken || 0);

      const rawCreated = s.createdDate || s.effectiveDate || s.createdAt;
      let createdStr = '';
      if (rawCreated) {
        try {
          createdStr = new Date(rawCreated).toISOString().split('T')[0];
        } catch (e) {
          createdStr = String(rawCreated);
        }
      }

      sumAmount += netAmount;
      sumSalary += baseSalary;
      sumPT += ptVal;
      sumPF += pfVal;
      sumESIC += esicVal;
      sumDiff += diffVal;
      sumLeaveDed += leaveDed;
      sumLeaveTaken += leaves;

      return {
        monthLabel,
        amount: netAmount.toFixed(2),
        createdDateFormatted: createdStr,
        salary: baseSalary.toFixed(2),
        pt: ptVal.toFixed(2),
        pfAmount: pfVal.toFixed(2),
        esic: esicVal.toFixed(2),
        differencePerMonthAmount: diffVal.toFixed(2),
        workingDays: workDays,
        perDaySalary: perDay.toFixed(2),
        leaveDeductionAmount: leaveDed.toFixed(2),
        leaveTaken: leaves,
        remark: s.remark || s.notes || '',
        companyName: s.companyName || 'Current Employer',
        paymentStatus: s.paymentStatus || 'Received',
      };
    });

    // Append Grand Total Row
    rows.push({
      monthLabel: 'GRAND TOTAL',
      amount: sumAmount.toFixed(2),
      createdDateFormatted: '',
      salary: sumSalary.toFixed(2),
      pt: sumPT.toFixed(2),
      pfAmount: sumPF.toFixed(2),
      esic: sumESIC.toFixed(2),
      differencePerMonthAmount: sumDiff.toFixed(2),
      workingDays: '',
      perDaySalary: '',
      leaveDeductionAmount: sumLeaveDed.toFixed(2),
      leaveTaken: sumLeaveTaken,
      remark: `Total Records: ${rows.length}`,
      companyName: '',
      paymentStatus: '',
    });

    const fields = [
      { label: 'Month', value: 'monthLabel' },
      { label: 'Amount', value: 'amount' },
      { label: 'Created Date', value: 'createdDateFormatted' },
      { label: 'Salary', value: 'salary' },
      { label: 'PT', value: 'pt' },
      { label: 'PF Amount', value: 'pfAmount' },
      { label: 'ESIC', value: 'esic' },
      { label: 'Difference Per Month Amount', value: 'differencePerMonthAmount' },
      { label: "Working Day's", value: 'workingDays' },
      { label: 'Per day Salary', value: 'perDaySalary' },
      { label: 'Leave Deduction Amount', value: 'leaveDeductionAmount' },
      { label: 'Leave Taken', value: 'leaveTaken' },
      { label: 'Remark', value: 'remark' },
      { label: 'Company', value: 'companyName' },
      { label: 'Status', value: 'paymentStatus' },
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment(`salarydetails-salary-report-${dateStamp}.csv`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getReports,
  exportReportCSV,
};

