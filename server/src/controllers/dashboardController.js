const SalaryRecord = require('../models/SalaryRecord');
const SalaryIncrement = require('../models/SalaryIncrement');
const Bonus = require('../models/Bonus');
const OtherIncomeRecord = require('../models/OtherIncomeRecord');
const EmploymentProfile = require('../models/EmploymentProfile');
const EmploymentHistory = require('../models/EmploymentHistory');
const AppSettings = require('../models/AppSettings');
const {
  calculateDateDifference,
  calculateTotalCareerExperience,
} = require('../services/experienceService');

// @desc    Get dynamic dashboard summary metrics, charts, and recent activity
// @route   GET /api/dashboard
// @access  Private
const getDashboardData = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { year, filterType, month } = req.query; // filterType: 'calendar' | 'financial'

    // 1. Fetch Profile & Settings
    const profile = await EmploymentProfile.findOne({ user: userId });
    const settings = await AppSettings.findOne({ user: userId }) || {
      currency: 'INR',
      currencySymbol: '₹',
      financialYearStartMonth: 4,
    };
    const history = await EmploymentHistory.find({ user: userId }).sort({ startDate: 1 });

    // 2. Available Sep-to-Aug Cycles for Filter Dropdown
    const allSalaries = await SalaryRecord.find({ user: userId }, { salaryYear: 1, salaryMonth: 1 });
    const cyclesMap = new Map();
    allSalaries.forEach(s => {
      const cKey = s.salaryMonth >= 9 ? `${s.salaryYear}-${s.salaryYear + 1}` : `${s.salaryYear - 1}-${s.salaryYear}`;
      const [sYear, eYear] = cKey.split('-');
      if (!cyclesMap.has(cKey)) {
        cyclesMap.set(cKey, {
          value: cKey,
          label: `Sep ${sYear} - Aug ${eYear}`,
          startYear: Number(sYear),
          endYear: Number(eYear),
        });
      }
    });

    const cycleOptions = Array.from(cyclesMap.values()).sort((a, b) => b.startYear - a.startYear);
    const availableYears = cycleOptions.map(c => c.value);

    const isAllYears = year === 'all' || year === 'All';
    let targetCycle = null;
    let cycleStartYear = null;
    let cycleEndYear = null;

    if (!isAllYears) {
      if (year && String(year).includes('-')) {
        targetCycle = String(year).trim();
        const [sy, ey] = targetCycle.split('-').map(Number);
        cycleStartYear = sy;
        cycleEndYear = ey;
      } else if (year && !isNaN(Number(year))) {
        const yNum = Number(year);
        const match = cycleOptions.find(c => c.startYear === yNum) || cycleOptions.find(c => c.endYear === yNum);
        if (match) {
          targetCycle = match.value;
          cycleStartYear = match.startYear;
          cycleEndYear = match.endYear;
        } else {
          cycleStartYear = yNum;
          cycleEndYear = yNum + 1;
          targetCycle = `${cycleStartYear}-${cycleEndYear}`;
        }
      } else if (cycleOptions.length > 0) {
        targetCycle = cycleOptions[0].value;
        cycleStartYear = cycleOptions[0].startYear;
        cycleEndYear = cycleOptions[0].endYear;
      }
    }

    // 3. Monthly Salary & Company (Filtered by targetCycle if specified)
    let salaryRecord;
    if (targetCycle && cycleStartYear && cycleEndYear) {
      salaryRecord = await SalaryRecord.findOne({
        user: userId,
        $or: [
          { salaryYear: cycleStartYear, salaryMonth: { $gte: 9 } },
          { salaryYear: cycleEndYear, salaryMonth: { $lte: 8 } }
        ]
      }).sort({ salaryYear: -1, salaryMonth: -1 });
    }

    if (!salaryRecord) {
      salaryRecord = await SalaryRecord.findOne({ user: userId, isCurrent: true });
      if (!salaryRecord) {
        salaryRecord = await SalaryRecord.findOne({ user: userId }).sort({
          salaryYear: -1,
          salaryMonth: -1,
        });
      }
    }

    const currentMonthlySalary = salaryRecord
      ? (salaryRecord.salary || salaryRecord.grossSalary || 0)
      : (profile ? profile.currentMonthlyGrossSalary : 0);

    const currentMonthlyTakeHome = salaryRecord
      ? (salaryRecord.amount || salaryRecord.takeHomeSalary || 0)
      : (profile ? profile.currentMonthlyTakeHomeSalary : 0);

    const currentAnnualSalary = currentMonthlySalary * 12;
    const currentCompany = salaryRecord ? salaryRecord.companyName : (profile ? profile.companyName : 'Not Set');

    // 4. Bonuses Calculation
    const paidBonuses = await Bonus.find({
      user: userId,
      bonusStatus: 'Paid',
      includedInPayroll: false,
    }).sort({ actualPaymentDate: -1, createdAt: -1 });

    const paidBonusAmount = Number(req.user?.paidBonusAmount || 0);
    const totalBonusesReceived = paidBonusAmount > 0 ? paidBonusAmount : paidBonuses.reduce((acc, b) => acc + (b.monthlyBonusGiven || b.bonusAmount || 0), 0);
    const lastBonus = paidBonuses[0] || null;

    // Expected Bonuses
    const expectedBonuses = await Bonus.find({
      user: userId,
      bonusStatus: { $in: ['Expected', 'Approved'] },
    });
    const totalExpectedBonuses = expectedBonuses.reduce((acc, b) => acc + (b.bonusAmount || 0), 0);

    // 5. Increments Calculation
    const increments = await SalaryIncrement.find({ user: userId }).sort({
      incrementEffectiveDate: -1,
    });
    const totalSalaryIncrementsCount = increments.length;
    const totalSalaryIncrementsAmount = increments.reduce((acc, inc) => acc + (inc.incrementAmount || 0), 0);
    const lastIncrement = increments[0] || null;

    // 6. Total Salary and Earnings Received (Filtered by targetYear if specified)
    const allReceivedSalaries = await SalaryRecord.find({
      user: userId,
      paymentStatus: 'Received',
    });

    const allOtherIncomes = await OtherIncomeRecord.find({
      user: userId,
      paymentStatus: { $in: ['Received', 'Paid'] },
    });

    let receivedSalaryRecords;
    if (targetCycle && cycleStartYear && cycleEndYear) {
      receivedSalaryRecords = allReceivedSalaries.filter(s =>
        (s.salaryYear === cycleStartYear && s.salaryMonth >= 9) ||
        (s.salaryYear === cycleEndYear && s.salaryMonth <= 8)
      );
    } else {
      receivedSalaryRecords = allReceivedSalaries;
    }

    const totalSalaryTakeHomeReceived = receivedSalaryRecords.reduce((acc, s) => acc + (s.amount || s.takeHomeSalary || 0), 0);
    const totalSalaryGrossReceived = receivedSalaryRecords.reduce((acc, s) => acc + (s.salary || s.grossSalary || 0), 0);

    // Total Earnings Received strictly reflects Total of "Amount" from Salary Screen
    const totalEarnings = totalSalaryTakeHomeReceived;

    // 7. Joining Date & Experience
    const joiningDate = profile ? profile.joiningDate : null;
    const currentCompanyExp = joiningDate
      ? calculateDateDifference(joiningDate, profile.employmentStatus === 'Resigned' ? profile.updatedAt : new Date())
      : { years: 0, months: 0, days: 0, formatted: '0 days' };

    const totalCareerExp = calculateTotalCareerExperience(profile, history);

    // Chart Target Cycle (12 Months of Sep-to-Aug cycle in chronological order)
    const activeStartYear = cycleStartYear || (cycleOptions[0]?.startYear || 2025);
    const activeEndYear = cycleEndYear || (cycleOptions[0]?.endYear || 2026);
    const chartYear = activeStartYear;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const netOtherIncome = allOtherIncomes.reduce((acc, r) => acc + (r.recordType === 'Other Income' ? (r.amount || 0) : -(r.amount || 0)), 0);

    const cycleMonths = [
      { m: 9, y: activeStartYear, label: `Sep '${String(activeStartYear).slice(-2)}` },
      { m: 10, y: activeStartYear, label: `Oct '${String(activeStartYear).slice(-2)}` },
      { m: 11, y: activeStartYear, label: `Nov '${String(activeStartYear).slice(-2)}` },
      { m: 12, y: activeStartYear, label: `Dec '${String(activeStartYear).slice(-2)}` },
      { m: 1, y: activeEndYear, label: `Jan '${String(activeEndYear).slice(-2)}` },
      { m: 2, y: activeEndYear, label: `Feb '${String(activeEndYear).slice(-2)}` },
      { m: 3, y: activeEndYear, label: `Mar '${String(activeEndYear).slice(-2)}` },
      { m: 4, y: activeEndYear, label: `Apr '${String(activeEndYear).slice(-2)}` },
      { m: 5, y: activeEndYear, label: `May '${String(activeEndYear).slice(-2)}` },
      { m: 6, y: activeEndYear, label: `Jun '${String(activeEndYear).slice(-2)}` },
      { m: 7, y: activeEndYear, label: `Jul '${String(activeEndYear).slice(-2)}` },
      { m: 8, y: activeEndYear, label: `Aug '${String(activeEndYear).slice(-2)}` },
    ];

    const monthlySalaryTrend = [];
    for (const cm of cycleMonths) {
      const monthRecords = await SalaryRecord.find({
        user: userId,
        salaryYear: cm.y,
        salaryMonth: cm.m,
      });

      const gross = monthRecords.reduce((acc, r) => acc + (r.salary || r.grossSalary || 0), 0);
      const takeHome = monthRecords.reduce((acc, r) => acc + (r.amount || r.takeHomeSalary || 0), 0);
      const deductions = monthRecords.reduce((acc, r) => acc + (r.differencePerMonthAmount || r.deductions || 0), 0);
      const basic = monthRecords.reduce((acc, r) => acc + (r.monthlyBasicSalary || 0), 0);

      monthlySalaryTrend.push({
        month: cm.label,
        monthIndex: cm.m,
        year: cm.y,
        gross,
        takeHome,
        deductions,
        basic,
        hasData: monthRecords.length > 0,
      });
    }

    // 10. Yearly Salary Comparison Chart Data
    const yearlyComparisonAgg = await SalaryRecord.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$salaryYear',
          totalGross: { $sum: '$grossSalary' },
          totalTakeHome: { $sum: '$takeHomeSalary' },
          totalDeductions: { $sum: '$deductions' },
          receivedTakeHome: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'Received'] }, '$takeHomeSalary', 0] },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const yearlySalaryComparison = yearlyComparisonAgg.map(item => ({
      year: item._id,
      gross: item.totalGross,
      takeHome: item.totalTakeHome,
      deductions: item.totalDeductions,
      received: item.receivedTakeHome,
      count: item.count,
    }));

    // 11. Monthly Bonus Received Chart Data (chartYear)
    const monthlyBonusTrend = [];
    for (let m = 1; m <= 12; m++) {
      const startOfMonth = new Date(chartYear, m - 1, 1);
      const endOfMonth = new Date(chartYear, m, 0, 23, 59, 59);

      const mBonuses = paidBonuses.filter(b => {
        const d = new Date(b.actualPaymentDate || b.createdAt);
        return d >= startOfMonth && d <= endOfMonth;
      });

      const amount = mBonuses.reduce((acc, b) => acc + (b.monthlyBonusGiven || b.bonusAmount || 0), 0);
      monthlyBonusTrend.push({
        month: monthNames[m - 1],
        amount,
        count: mBonuses.length,
      });
    }

    // 12. Yearly Total Earnings Chart Data (Salary + Bonus + Other Income across all years)
    const yearlyEarningsMap = {};
    allReceivedSalaries.forEach(s => {
      const y = s.salaryYear;
      if (!yearlyEarningsMap[y]) yearlyEarningsMap[y] = { year: y, salary: 0, bonus: 0, other: 0, total: 0 };
      yearlyEarningsMap[y].salary += (s.amount || s.takeHomeSalary || 0);
      yearlyEarningsMap[y].total += (s.amount || s.takeHomeSalary || 0);
    });

    paidBonuses.forEach(b => {
      const y = b.bonusYear || new Date(b.actualPaymentDate || b.createdAt).getFullYear();
      if (!yearlyEarningsMap[y]) yearlyEarningsMap[y] = { year: y, salary: 0, bonus: 0, other: 0, total: 0 };
      yearlyEarningsMap[y].bonus += (b.monthlyBonusGiven || b.bonusAmount || 0);
      yearlyEarningsMap[y].total += (b.monthlyBonusGiven || b.bonusAmount || 0);
    });

    allOtherIncomes.forEach(o => {
      if (o.recordType === 'Other Income') {
        const y = new Date(o.transactionDate).getFullYear();
        if (!yearlyEarningsMap[y]) yearlyEarningsMap[y] = { year: y, salary: 0, bonus: 0, other: 0, total: 0 };
        yearlyEarningsMap[y].other += o.amount;
        yearlyEarningsMap[y].total += o.amount;
      }
    });

    const yearlyTotalEarnings = Object.values(yearlyEarningsMap).sort((a, b) => a.year - b.year);

    // 13. Salary Increment History Chart Data
    const salaryIncrementHistory = increments
      .map(inc => ({
        date: inc.incrementEffectiveDate,
        dateFormatted: new Date(inc.incrementEffectiveDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
        }),
        company: inc.companyName,
        previousSalary: inc.previousMonthlySalary,
        newSalary: inc.newMonthlySalary,
        amount: inc.incrementAmount,
        percentage: inc.incrementPercentage,
        type: inc.incrementType,
      }))
      .reverse(); // chronological for line chart

    // 14. Income Component Breakdown (for chartYear)
    const yearSalaries = await SalaryRecord.find({ user: userId, salaryYear: chartYear });
    const yearBonusSum = paidBonuses
      .filter(b => (b.bonusYear === chartYear) || (new Date(b.actualPaymentDate || b.createdAt).getFullYear() === chartYear))
      .reduce((sum, b) => sum + (b.monthlyBonusGiven || b.bonusAmount || 0), 0);

    const yearBasic = yearSalaries.reduce((sum, s) => sum + s.monthlyBasicSalary, 0);
    const yearHra = yearSalaries.reduce((sum, s) => sum + s.hra, 0);
    const yearAllowances = yearSalaries.reduce((sum, s) => sum + s.otherAllowances, 0);

    const incomeComponentsBreakdown = [
      { name: 'Basic Salary', value: yearBasic },
      { name: 'HRA', value: yearHra },
      { name: 'Allowances', value: yearAllowances },
      { name: 'Bonuses', value: yearBonusSum },
    ].filter(item => item.value > 0);

    // 15. Recent Activity Feed (Latest 8 items)
    const recentSalaries = (await SalaryRecord.find({ user: userId }).sort({ createdAt: -1 }).limit(4)).map(s => ({
      id: s._id,
      type: 'salary',
      title: `Salary slip for ${monthNames[s.salaryMonth - 1]} ${s.salaryYear}`,
      subtitle: `${s.companyName} • ${s.paymentStatus}`,
      amount: s.takeHomeSalary,
      status: s.paymentStatus,
      date: s.effectiveDate || s.createdAt,
    }));

    const recentBonuses = (await Bonus.find({ user: userId }).sort({ createdAt: -1 }).limit(4)).map(b => ({
      id: b._id,
      type: 'bonus',
      title: `${b.bonusType} (${b.bonusPeriod})`,
      subtitle: `${b.companyName} • ${b.bonusStatus}`,
      amount: b.bonusAmount,
      status: b.bonusStatus,
      date: b.actualPaymentDate || b.expectedPaymentDate || b.createdAt,
    }));

    const recentIncrements = (await SalaryIncrement.find({ user: userId }).sort({ createdAt: -1 }).limit(3)).map(inc => ({
      id: inc._id,
      type: 'increment',
      title: `${inc.incrementType} (+${inc.incrementPercentage}%)`,
      subtitle: `${inc.companyName} • Hike: +${inc.incrementAmount.toLocaleString()}`,
      amount: inc.incrementAmount,
      status: 'Applied',
      date: inc.incrementEffectiveDate,
    }));

    const recentActivity = [...recentSalaries, ...recentBonuses, ...recentIncrements]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    res.status(200).json({
      success: true,
      summary: {
        currentMonthlySalary,
        currentMonthlyTakeHome,
        currentAnnualSalary,
        totalBonusesReceived,
        paidBonusAmount,
        totalExpectedBonuses,
        totalSalaryIncrementsCount,
        totalSalaryIncrementsAmount,
        totalEarnings,
        totalSalaryGrossReceived,
        totalSalaryTakeHomeReceived,
        totalOtherIncomeReceived: netOtherIncome,
        joiningDate,
        currentCompany,
        experience: {
          currentCompany: currentCompanyExp,
          totalCareer: totalCareerExp,
        },
        lastIncrement: lastIncrement ? {
          date: lastIncrement.incrementEffectiveDate,
          amount: lastIncrement.incrementAmount,
          percentage: lastIncrement.incrementPercentage,
          newSalary: lastIncrement.newMonthlySalary,
          type: lastIncrement.incrementType,
        } : null,
        lastBonus: lastBonus ? {
          date: lastBonus.actualPaymentDate || lastBonus.createdAt,
          amount: lastBonus.bonusAmount,
          type: lastBonus.bonusType,
          period: lastBonus.bonusPeriod,
        } : null,
      },
      charts: {
        targetYear: chartYear,
        monthlySalaryTrend,
        yearlySalaryComparison,
        monthlyBonusTrend,
        yearlyTotalEarnings,
        salaryIncrementHistory,
        incomeComponentsBreakdown,
      },
      recentActivity,
      filters: {
        availableYears,
        cycleOptions,
        targetYear: isAllYears ? 'all' : (targetCycle || cycleOptions[0]?.value),
        selectedYear: isAllYears ? 'all' : (targetCycle || cycleOptions[0]?.value),
        selectedCycleLabel: isAllYears
          ? 'All Years'
          : (cycleOptions.find(c => c.value === targetCycle)?.label || `Sep ${cycleStartYear} - Aug ${cycleEndYear}`),
        salaryCycle: 'Sep-Aug',
        financialYearStartMonth: 9,
      },
      settings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
};
