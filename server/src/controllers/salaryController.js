const SalaryRecord = require('../models/SalaryRecord');
const EmploymentProfile = require('../models/EmploymentProfile');
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
    const day = cur.getUTCDay(); // 0 is Sun, 6 is Sat
    if (day !== 0 && day !== 6) {
      count++;
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return count > 0 ? count : 22;
};

// Helper: Calculate Exact Salary Components as specified in the screenshot:
// Month | Amount | Created | Salary | PT | PF Amount | Difference Per Month Amount | Working Day's | Per day Salary | Leave Deduction Amount | Leave Taken | Remark
const calculateSalaryComponents = (body) => {
  const salary = Number(body.salary !== undefined && body.salary !== '' ? body.salary : (body.grossSalary || body.monthlyBasicSalary)) || 0;
  const calculatedDays = calculateSalaryCycleWorkingDays(body.salaryMonth, body.salaryYear);
  const workingDays = Number(body.workingDays) > 0 ? Number(body.workingDays) : calculatedDays;

  let perDaySalary = body.perDaySalary !== undefined && body.perDaySalary !== ''
    ? Number(body.perDaySalary)
    : (workingDays > 0 ? Number((salary / workingDays).toFixed(2)) : 0);

  const leaveTaken = Number(body.leaveTaken) || 0;

  let leaveDeductionAmount = body.leaveDeductionAmount !== undefined && body.leaveDeductionAmount !== ''
    ? Number(body.leaveDeductionAmount)
    : Number((perDaySalary * leaveTaken).toFixed(2));

  const pt = Number(body.pt) || 0;

  // Defaults: from Feb-2026 onwards, PF defaults to 4800 and ESIC defaults to 800
  const isFromFeb2026 = Number(body.salaryYear) > 2026 || (Number(body.salaryYear) === 2026 && Number(body.salaryMonth) >= 2);
  const defaultPf = isFromFeb2026 ? 4800 : 1800;
  const defaultEsic = isFromFeb2026 ? 800 : 0;

  const pfAmount = body.pfAmount !== undefined && body.pfAmount !== '' ? Number(body.pfAmount) : defaultPf;
  const esic = body.esic !== undefined && body.esic !== '' ? Number(body.esic) : defaultEsic;
  // Difference Per Month Amount = PT + PF Amount + ESIC
  const calculatedDiff = Number((pt + pfAmount + esic).toFixed(2));
  const differencePerMonthAmount = body.differencePerMonthAmount !== undefined && body.differencePerMonthAmount !== ''
    ? Number(body.differencePerMonthAmount)
    : calculatedDiff;

  // Additional component breakdown for backwards compatibility
  const basic = Number(body.monthlyBasicSalary) || Math.round(salary * 0.5);
  const hra = Number(body.hra) || Math.round(salary * 0.25);
  const allowances = Number(body.otherAllowances) || Math.max(0, salary - basic - hra);
  const bonus = Number(body.bonusIncludedInPayroll) || 0;

  const totalDeductions = differencePerMonthAmount + leaveDeductionAmount + (Number(body.deductions) || 0);

  // Net amount payable / received: Salary - Difference Per Month Amount - Leave Deduction
  let amount = body.amount !== undefined && body.amount !== ''
    ? Number(body.amount)
    : Math.max(0, Number((salary - totalDeductions).toFixed(2)));

  const remark = (body.remark || body.notes || '').trim();
  const createdDate = body.createdDate ? new Date(body.createdDate) : (body.effectiveDate ? new Date(body.effectiveDate) : new Date());

  return {
    salary,
    workingDays,
    perDaySalary,
    leaveTaken,
    leaveDeductionAmount,
    pt,
    pfAmount,
    esic,
    differencePerMonthAmount,
    amount,
    remark,
    createdDate,
    monthlyBasicSalary: basic,
    hra,
    otherAllowances: allowances,
    bonusIncludedInPayroll: bonus,
    deductions: totalDeductions,
    grossSalary: salary,
    takeHomeSalary: amount,
    notes: remark,
    effectiveDate: createdDate,
  };
};

// @desc    Get all salary records with filter, search, sort, pagination
// @route   GET /api/salaries
// @access  Private
const getSalaries = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      year,
      month,
      company,
      paymentStatus,
      sortBy = 'salaryYear',
      sortOrder = 'desc',
      search,
    } = req.query;

    const andConditions = [{ user: req.user._id }];

    if (year && year !== 'all') {
      const yearStr = String(year).trim();
      if (yearStr.includes('-')) {
        const [startYearStr, endYearStr] = yearStr.split('-');
        const sYear = parseInt(startYearStr, 10);
        const eYear = parseInt(endYearStr, 10);
        if (!isNaN(sYear) && !isNaN(eYear)) {
          andConditions.push({
            $or: [
              { salaryYear: sYear, salaryMonth: { $gte: 9 } },
              { salaryYear: eYear, salaryMonth: { $lte: 8 } }
            ]
          });
        }
      } else if (!isNaN(Number(yearStr))) {
        const singleY = Number(yearStr);
        andConditions.push({
          $or: [
            { salaryYear: singleY, salaryMonth: { $gte: 9 } },
            { salaryYear: singleY + 1, salaryMonth: { $lte: 8 } },
            { salaryYear: singleY }
          ]
        });
      }
    }

    if (month) andConditions.push({ salaryMonth: Number(month) });
    if (company) andConditions.push({ companyName: new RegExp(company, 'i') });
    if (paymentStatus) andConditions.push({ paymentStatus });

    if (search) {
      andConditions.push({
        $or: [
          { companyName: { $regex: search, $options: 'i' } },
          { remark: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },
        ]
      });
    }

    const query = andConditions.length > 1 ? { $and: andConditions } : andConditions[0];

    const sort = {};
    if (sortBy === 'salaryYear') {
      sort.salaryYear = sortOrder === 'asc' ? 1 : -1;
      sort.salaryMonth = sortOrder === 'asc' ? 1 : -1;
    } else {
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await SalaryRecord.countDocuments(query);
    const rawSalaries = await SalaryRecord.find(query)
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    // Ensure all response items expose both exact screenshot fields and legacy keys
    const salaries = rawSalaries.map((s) => {
      const obj = s.toObject();
      return {
        ...obj,
        salary: obj.salary || obj.grossSalary || obj.monthlyBasicSalary || 0,
        amount: obj.amount || obj.takeHomeSalary || 0,
        workingDays: obj.workingDays || calculateSalaryCycleWorkingDays(obj.salaryMonth, obj.salaryYear),
        perDaySalary: obj.perDaySalary || (obj.workingDays > 0 ? Number(((obj.salary || obj.grossSalary || 0) / obj.workingDays).toFixed(2)) : 0),
        leaveTaken: obj.leaveTaken || 0,
        leaveDeductionAmount: obj.leaveDeductionAmount || 0,
        pt: obj.pt || 0,
        pfAmount: obj.pfAmount || 0,
        esic: obj.esic || 0,
        differencePerMonthAmount: obj.differencePerMonthAmount || 0,
        remark: obj.remark || obj.notes || '',
        createdDate: obj.createdDate || obj.effectiveDate || obj.createdAt,
      };
    });

    // Calculate aggregated metrics (respecting active filters such as Sep-to-Aug cycle year)
    const statsAgg = await SalaryRecord.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSalary: {
            $sum: { $ifNull: ['$salary', { $ifNull: ['$grossSalary', 0] }] },
          },
          totalPF: {
            $sum: { $ifNull: ['$pfAmount', 0] },
          },
          totalESIC: {
            $sum: { $ifNull: ['$esic', 0] },
          },
          totalPT: {
            $sum: { $ifNull: ['$pt', 0] },
          },
          totalDiff: {
            $sum: {
              $add: [
                { $ifNull: ['$pt', 0] },
                { $ifNull: ['$pfAmount', 0] },
                { $ifNull: ['$esic', 0] },
              ],
            },
          },
          totalAmount: {
            $sum: { $ifNull: ['$amount', { $ifNull: ['$takeHomeSalary', 0] }] },
          },
          totalReceivedTakeHome: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'Received'] },
                { $ifNull: ['$amount', '$takeHomeSalary'] },
                { $ifNull: ['$amount', 0] },
              ],
            },
          },
          totalReceivedGross: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'Received'] },
                { $ifNull: ['$salary', '$grossSalary'] },
                { $ifNull: ['$salary', 0] },
              ],
            },
          },
          totalExpectedTakeHome: {
            $sum: {
              $cond: [
                { $eq: ['$paymentStatus', 'Expected'] },
                { $ifNull: ['$amount', '$takeHomeSalary'] },
                0,
              ],
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const stats = statsAgg[0] || {
      totalSalary: 0,
      totalPF: 0,
      totalESIC: 0,
      totalPT: 0,
      totalDiff: 0,
      totalAmount: 0,
      totalReceivedTakeHome: 0,
      totalReceivedGross: 0,
      totalExpectedTakeHome: 0,
      count: 0,
    };

    // Distinct list of companies and Sep-to-Aug cycles for filter dropdowns
    const companies = await SalaryRecord.distinct('companyName', { user: req.user._id });
    const allRecordsForYears = await SalaryRecord.find({ user: req.user._id }, { salaryYear: 1, salaryMonth: 1 });
    const cyclesMap = new Map();
    allRecordsForYears.forEach(s => {
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

    const years = Array.from(cyclesMap.values())
      .sort((a, b) => b.startYear - a.startYear);

    res.status(200).json({
      success: true,
      data: salaries,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
      stats,
      filters: {
        companies,
        years,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single salary record
// @route   GET /api/salaries/:id
// @access  Private
const getSalaryById = async (req, res, next) => {
  try {
    const salary = await SalaryRecord.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found.',
      });
    }

    res.status(200).json({ success: true, data: salary });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new salary record with duplicate protection
// @route   POST /api/salaries
// @access  Private
const createSalary = async (req, res, next) => {
  try {
    const {
      companyName,
      effectiveDate,
      createdDate,
      salaryMonth,
      salaryYear,
      currency,
      paymentStatus,
      isCurrent,
      notes,
      remark,
      allowDuplicate = false,
    } = req.body;

    const targetDate = createdDate || effectiveDate || new Date();

    if (!companyName || !salaryMonth || !salaryYear) {
      return res.status(400).json({
        success: false,
        message: 'Company name, salary month, and salary year are required.',
      });
    }

    // Duplicate Prevention Check
    const existing = await SalaryRecord.findOne({
      user: req.user.id,
      companyName: companyName.trim(),
      salaryYear: Number(salaryYear),
      salaryMonth: Number(salaryMonth),
    });

    if (existing && !allowDuplicate) {
      return res.status(409).json({
        success: false,
        isDuplicate: true,
        existingId: existing._id,
        message: `A salary record for ${companyName.trim()} for ${salaryMonth}/${salaryYear} already exists. Please update the existing record or confirm to proceed.`,
      });
    }

    const calculated = calculateSalaryComponents(req.body);

    // If marked current, unset other current flags for this user
    if (isCurrent) {
      await SalaryRecord.updateMany(
        { user: req.user.id, isCurrent: true },
        { isCurrent: false }
      );

      // Also sync current profile salary
      await EmploymentProfile.findOneAndUpdate(
        { user: req.user.id },
        {
          currentMonthlyBasicSalary: calculated.monthlyBasicSalary,
          currentMonthlyGrossSalary: calculated.salary,
          currentMonthlyTakeHomeSalary: calculated.amount,
          currency: currency || 'INR',
        }
      );
    }

    const salary = await SalaryRecord.create({
      user: req.user.id,
      companyName: companyName.trim(),
      effectiveDate: new Date(targetDate),
      createdDate: new Date(targetDate),
      salaryMonth: Number(salaryMonth),
      salaryYear: Number(salaryYear),
      ...calculated,
      currency: currency || 'INR',
      paymentStatus: paymentStatus || 'Received',
      isCurrent: !!isCurrent,
      notes: (remark || notes || '').trim(),
      remark: (remark || notes || '').trim(),
    });

    res.status(201).json({
      success: true,
      message: 'Salary record saved successfully.',
      data: salary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update salary record
// @route   PUT /api/salaries/:id
// @access  Private
const updateSalary = async (req, res, next) => {
  try {
    const salary = await SalaryRecord.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found.',
      });
    }

    const {
      companyName,
      effectiveDate,
      createdDate,
      salaryMonth,
      salaryYear,
      currency,
      paymentStatus,
      isCurrent,
      notes,
      remark,
    } = req.body;

    // Check duplicate if month/year/company changed to another existing record
    if (salaryMonth && salaryYear && companyName) {
      const duplicate = await SalaryRecord.findOne({
        _id: { $ne: salary._id },
        user: req.user.id,
        companyName: companyName.trim(),
        salaryYear: Number(salaryYear),
        salaryMonth: Number(salaryMonth),
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: `Another salary record already exists for ${companyName} for period ${salaryMonth}/${salaryYear}.`,
        });
      }
    }

    const calculated = calculateSalaryComponents({
      ...salary.toObject(),
      ...req.body,
    });

    if (isCurrent && !salary.isCurrent) {
      await SalaryRecord.updateMany(
        { user: req.user.id, isCurrent: true, _id: { $ne: salary._id } },
        { isCurrent: false }
      );

      await EmploymentProfile.findOneAndUpdate(
        { user: req.user.id },
        {
          currentMonthlyBasicSalary: calculated.monthlyBasicSalary,
          currentMonthlyGrossSalary: calculated.salary,
          currentMonthlyTakeHomeSalary: calculated.amount,
          currency: currency || salary.currency,
        }
      );
    }

    salary.companyName = companyName ? companyName.trim() : salary.companyName;
    if (effectiveDate || createdDate) {
      salary.effectiveDate = new Date(createdDate || effectiveDate);
      salary.createdDate = new Date(createdDate || effectiveDate);
    }
    if (salaryMonth) salary.salaryMonth = Number(salaryMonth);
    if (salaryYear) salary.salaryYear = Number(salaryYear);

    // Apply calculated fields
    salary.salary = calculated.salary;
    salary.workingDays = calculated.workingDays;
    salary.perDaySalary = calculated.perDaySalary;
    salary.leaveTaken = calculated.leaveTaken;
    salary.leaveDeductionAmount = calculated.leaveDeductionAmount;
    salary.pt = calculated.pt;
    salary.pfAmount = calculated.pfAmount;
    salary.esic = calculated.esic;
    salary.differencePerMonthAmount = calculated.differencePerMonthAmount;
    salary.amount = calculated.amount;
    salary.remark = calculated.remark;

    salary.monthlyBasicSalary = calculated.monthlyBasicSalary;
    salary.hra = calculated.hra;
    salary.otherAllowances = calculated.otherAllowances;
    salary.bonusIncludedInPayroll = calculated.bonusIncludedInPayroll;
    salary.deductions = calculated.deductions;
    salary.grossSalary = calculated.grossSalary;
    salary.takeHomeSalary = calculated.takeHomeSalary;
    salary.notes = calculated.notes;

    if (currency) salary.currency = currency;
    if (paymentStatus) salary.paymentStatus = paymentStatus;
    if (isCurrent !== undefined) salary.isCurrent = !!isCurrent;

    await salary.save();

    res.status(200).json({
      success: true,
      message: 'Salary record updated successfully.',
      data: salary,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete salary record
// @route   DELETE /api/salaries/:id
// @access  Private
const deleteSalary = async (req, res, next) => {
  try {
    const salary = await SalaryRecord.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!salary) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Salary record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export salary records to CSV matching required columns
// @route   GET /api/salaries/export/csv
// @access  Private
const exportSalaryCSV = async (req, res, next) => {
  try {
    const rawSalaries = await SalaryRecord.find({ user: req.user.id }).sort({
      salaryYear: -1,
      salaryMonth: -1,
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formattedData = rawSalaries.map((s) => ({
      Month: `${monthNames[s.salaryMonth - 1] || s.salaryMonth} ${s.salaryYear}`,
      Amount: s.amount || s.takeHomeSalary || 0,
      Created: s.createdDate ? new Date(s.createdDate).toISOString().split('T')[0] : (s.effectiveDate ? new Date(s.effectiveDate).toISOString().split('T')[0] : ''),
      Salary: s.salary || s.grossSalary || 0,
      PT: s.pt || 0,
      'PF Amount': s.pfAmount || 0,
      ESIC: s.esic || 0,
      'Difference Per Month Amount': s.differencePerMonthAmount || 0,
      "Working Day's": s.workingDays || 30,
      'Per day Salary': s.perDaySalary || (s.workingDays > 0 ? Number(((s.salary || s.grossSalary || 0) / s.workingDays).toFixed(2)) : 0),
      'Leave Deduction Amount': s.leaveDeductionAmount || 0,
      'Leave Taken': s.leaveTaken || 0,
      Remark: s.remark || s.notes || '',
      Company: s.companyName,
      Status: s.paymentStatus || 'Received',
    }));

    const fields = [
      'Month',
      'Amount',
      'Created',
      'Salary',
      'PT',
      'PF Amount',
      'ESIC',
      'Difference Per Month Amount',
      "Working Day's",
      'Per day Salary',
      'Leave Deduction Amount',
      'Leave Taken',
      'Remark',
      'Company',
      'Status',
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(formattedData);

    res.header('Content-Type', 'text/csv');
    res.attachment(`salarydetails-salary-details-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Import salary records from parsed CSV / JSON batch
// @route   POST /api/salaries/import
// @access  Private
const importSalaries = async (req, res, next) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No records provided for import.',
      });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const item = records[i];
      const rowNum = i + 1;

      const company = item.companyName || item.Company || 'Company';
      const month = Number(item.salaryMonth || item.Month);
      const year = Number(item.salaryYear || item.Year || new Date().getFullYear());

      if (isNaN(month) || month < 1 || month > 12) {
        errors.push(`Row ${rowNum}: Invalid salary month '${item.salaryMonth || item.Month}'. Must be 1 to 12.`);
        skippedCount++;
        continue;
      }

      // Check duplicate
      const duplicate = await SalaryRecord.findOne({
        user: req.user.id,
        companyName: company.trim(),
        salaryYear: year,
        salaryMonth: month,
      });

      if (duplicate) {
        skippedCount++;
        errors.push(`Row ${rowNum}: Duplicate skipped for ${company} (${month}/${year}).`);
        continue;
      }

      const calculated = calculateSalaryComponents({
        ...item,
        salary: item.salary || item.Salary || item.grossSalary,
        workingDays: item.workingDays || item["Working Day's"] || item.WorkingDays,
        perDaySalary: item.perDaySalary || item['Per day Salary'],
        leaveTaken: item.leaveTaken || item['Leave Taken'],
        leaveDeductionAmount: item.leaveDeductionAmount || item['Leave Deduction Amount'],
        pt: item.pt || item.PT,
        pfAmount: item.pfAmount || item['PF Amount'],
        esic: item.esic || item.ESIC,
        differencePerMonthAmount: item.differencePerMonthAmount || item['Difference Per Month Amount'],
        amount: item.amount || item.Amount,
        remark: item.remark || item.Remark || item.notes,
        createdDate: item.createdDate || item.Created || item.effectiveDate,
      });

      await SalaryRecord.create({
        user: req.user.id,
        companyName: company.trim(),
        effectiveDate: calculated.createdDate,
        createdDate: calculated.createdDate,
        salaryMonth: month,
        salaryYear: year,
        ...calculated,
        currency: item.currency || 'INR',
        paymentStatus: item.paymentStatus || item.Status || 'Received',
        isCurrent: !!item.isCurrent,
      });

      importedCount++;
    }

    res.status(200).json({
      success: true,
      message: `Import completed: ${importedCount} records imported, ${skippedCount} skipped.`,
      importedCount,
      skippedCount,
      errors,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSalaries,
  getSalaryById,
  createSalary,
  updateSalary,
  deleteSalary,
  exportSalaryCSV,
  importSalaries,
};
