const User = require('../models/User');
const Bonus = require('../models/Bonus');
const { Parser } = require('json2csv');

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// @desc    Get bonuses with filtering and stats
// @route   GET /api/bonuses
// @access  Private
const getBonuses = async (req, res, next) => {
  try {
    const { company, bonusType, bonusStatus, status, year } = req.query;
    const query = { user: req.user.id };

    if (company) query.companyName = new RegExp(company, 'i');
    if (bonusType) query.bonusType = bonusType;
    if (status) query.status = status;
    else if (bonusStatus) query.bonusStatus = bonusStatus;

    let bonuses = await Bonus.find(query).sort({ bonusYear: -1, bonusMonth: -1, actualPaymentDate: -1, createdAt: -1 });

    if (year) {
      bonuses = bonuses.filter(b => {
        const y = b.bonusYear || (b.actualPaymentDate ? new Date(b.actualPaymentDate).getFullYear() : new Date(b.createdAt).getFullYear());
        return y === Number(year);
      });
    }

    // Map backwards compatibility for existing records if fields are empty
    bonuses = bonuses.map(b => {
      const doc = b.toObject();
      if (!doc.monthlyBonusAmount && doc.bonusAmount) {
        doc.monthlyBonusAmount = doc.bonusAmount;
      }
      if (doc.monthlyBonusGiven === undefined || doc.monthlyBonusGiven === 0) {
        doc.monthlyBonusGiven = doc.bonusStatus === 'Paid' ? (doc.bonusAmount || doc.monthlyBonusAmount) : 0;
      }
      if (doc.deductionAmount === undefined) {
        doc.deductionAmount = Math.max(0, (doc.monthlyBonusAmount || 0) - (doc.monthlyBonusGiven || 0));
      }
      if (!doc.status) {
        doc.status = doc.bonusStatus === 'Paid' ? 'Given' : (doc.bonusStatus || 'Given');
      }
      if (!doc.bonusMonth) {
        const d = doc.actualPaymentDate || doc.expectedPaymentDate || doc.createdAt;
        doc.bonusMonth = new Date(d).getMonth() + 1;
        doc.bonusYear = new Date(d).getFullYear();
      }
      return doc;
    });

    // Compute stats from all non-cancelled bonuses for this user
    const allBonuses = await Bonus.find({ user: req.user.id });

    let totalMonthlyBonusAmount = 0;
    let totalMonthlyBonusGiven = 0;
    let totalDeductionAmount = 0;
    let givenCount = 0;
    let pendingCount = 0;

    allBonuses.forEach(b => {
      const bAmt = b.monthlyBonusAmount || b.bonusAmount || 0;
      const bGiven = b.monthlyBonusGiven !== undefined && b.monthlyBonusGiven > 0
        ? b.monthlyBonusGiven
        : (b.bonusStatus === 'Paid' || b.status === 'Given' ? bAmt : 0);
      const bDed = b.deductionAmount !== undefined ? b.deductionAmount : Math.max(0, bAmt - bGiven);

      totalMonthlyBonusAmount += bAmt;
      totalMonthlyBonusGiven += bGiven;

      if (b.status === 'Given' || b.status === 'Paid' || b.bonusStatus === 'Paid') {
        givenCount++;
      } else {
        pendingCount++;
      }
    });

    // Total Deduction Amount = Total Monthly Amount - Total Monthly Bonus Given
    totalDeductionAmount = Math.max(0, Number((totalMonthlyBonusAmount - totalMonthlyBonusGiven).toFixed(2)));

    const highestBonusReceived = allBonuses.length > 0 
      ? Math.max(...allBonuses.map(b => b.monthlyBonusGiven || b.bonusAmount || 0)) 
      : 0;

    const companies = await Bonus.distinct('companyName', { user: req.user.id });
    const types = await Bonus.distinct('bonusType', { user: req.user.id });

    const paidBonusAmount = Number(req.user?.paidBonusAmount || 0);
    const balanceResult = totalMonthlyBonusGiven - paidBonusAmount;

    res.status(200).json({
      success: true,
      data: bonuses,
      stats: {
        totalMonthlyBonusAmount,
        totalMonthlyBonusGiven,
        totalDeductionAmount,
        paidBonusAmount,
        balanceResult,
        totalBonusesPaid: totalMonthlyBonusGiven,
        totalExpectedBonuses: Math.max(0, totalMonthlyBonusAmount - totalMonthlyBonusGiven),
        highestBonusReceived,
        givenCount,
        pendingCount,
      },
      filters: {
        companies,
        types,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new bonus record
// @route   POST /api/bonuses
// @access  Private
const createBonus = async (req, res, next) => {
  try {
    const {
      companyName,
      bonusMonth,
      bonusYear,
      Month,
      monthlyBonusAmount,
      monthlyBonusGiven,
      deductionAmount,
      status,
      bonusType,
      bonusPeriod,
      bonusApprovalDate,
      expectedPaymentDate,
      actualPaymentDate,
      bonusAmount,
      currency,
      bonusStatus,
      bonusReason,
      includedInPayroll,
      notes,
    } = req.body;

    const bMonth = Number(bonusMonth || Month || (new Date().getMonth() + 1));
    const bYear = Number(bonusYear || new Date().getFullYear());

    const bAmt = Number(monthlyBonusAmount !== undefined ? monthlyBonusAmount : (bonusAmount || 0));
    let bGiven = monthlyBonusGiven !== undefined ? Number(monthlyBonusGiven) : null;
    let bDed = deductionAmount !== undefined ? Number(deductionAmount) : null;

    if (bGiven !== null && bDed === null) {
      bDed = Math.max(0, Number((bAmt - bGiven).toFixed(2)));
    } else if (bDed !== null && bGiven === null) {
      bGiven = Math.max(0, Number((bAmt - bDed).toFixed(2)));
    } else if (bGiven === null && bDed === null) {
      bGiven = bAmt;
      bDed = 0;
    }

    const finalStatus = status || (bGiven > 0 ? 'Given' : 'Pending');
    const finalBonusStatus = (finalStatus === 'Given' || finalStatus === 'Paid') ? 'Paid' : 'Expected';
    const periodLabel = bonusPeriod || `${monthNames[bMonth - 1] || 'Month'} ${bYear}`;

    const bonus = await Bonus.create({
      user: req.user.id,
      companyName: (companyName || 'Current Employer').trim(),
      bonusMonth: bMonth,
      bonusYear: bYear,
      bonusPeriod: periodLabel,
      monthlyBonusAmount: bAmt,
      monthlyBonusGiven: bGiven,
      deductionAmount: bDed,
      status: finalStatus,
      bonusType: bonusType || 'Monthly Bonus',
      bonusApprovalDate: bonusApprovalDate ? new Date(bonusApprovalDate) : null,
      expectedPaymentDate: expectedPaymentDate ? new Date(expectedPaymentDate) : null,
      actualPaymentDate: actualPaymentDate ? new Date(actualPaymentDate) : (finalBonusStatus === 'Paid' ? new Date() : null),
      bonusAmount: bGiven,
      currency: currency || 'INR',
      bonusStatus: finalBonusStatus,
      bonusReason: bonusReason ? bonusReason.trim() : '',
      includedInPayroll: !!includedInPayroll,
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Bonus record created successfully.',
      data: bonus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bonus record
// @route   PUT /api/bonuses/:id
// @access  Private
const updateBonus = async (req, res, next) => {
  try {
    const bonus = await Bonus.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bonus) {
      return res.status(404).json({
        success: false,
        message: 'Bonus record not found.',
      });
    }

    const {
      companyName,
      bonusMonth,
      bonusYear,
      monthlyBonusAmount,
      monthlyBonusGiven,
      deductionAmount,
      status,
      bonusType,
      bonusPeriod,
      bonusApprovalDate,
      expectedPaymentDate,
      actualPaymentDate,
      bonusAmount,
      currency,
      bonusStatus,
      bonusReason,
      includedInPayroll,
      notes,
    } = req.body;

    if (companyName) bonus.companyName = companyName.trim();
    if (bonusMonth !== undefined) bonus.bonusMonth = Number(bonusMonth);
    if (bonusYear !== undefined) bonus.bonusYear = Number(bonusYear);

    const bAmt = monthlyBonusAmount !== undefined
      ? Number(monthlyBonusAmount)
      : (bonusAmount !== undefined ? Number(bonusAmount) : bonus.monthlyBonusAmount || bonus.bonusAmount);

    let bGiven = monthlyBonusGiven !== undefined ? Number(monthlyBonusGiven) : bonus.monthlyBonusGiven;
    let bDed = deductionAmount !== undefined ? Number(deductionAmount) : bonus.deductionAmount;

    if (monthlyBonusGiven !== undefined && deductionAmount === undefined) {
      bDed = Math.max(0, Number((bAmt - bGiven).toFixed(2)));
    } else if (deductionAmount !== undefined && monthlyBonusGiven === undefined) {
      bGiven = Math.max(0, Number((bAmt - bDed).toFixed(2)));
    }

    bonus.monthlyBonusAmount = bAmt;
    bonus.monthlyBonusGiven = bGiven;
    bonus.deductionAmount = bDed;
    bonus.bonusAmount = bGiven;

    if (status) {
      bonus.status = status;
      bonus.bonusStatus = (status === 'Given' || status === 'Paid') ? 'Paid' : 'Expected';
    } else if (bonusStatus) {
      bonus.bonusStatus = bonusStatus;
      bonus.status = bonusStatus === 'Paid' ? 'Given' : bonusStatus;
    }

    if (bonusType) bonus.bonusType = bonusType;
    if (bonusPeriod) bonus.bonusPeriod = bonusPeriod.trim();
    else if (bonus.bonusMonth && bonus.bonusYear) {
      bonus.bonusPeriod = `${monthNames[bonus.bonusMonth - 1] || 'Month'} ${bonus.bonusYear}`;
    }

    bonus.bonusApprovalDate = bonusApprovalDate ? new Date(bonusApprovalDate) : bonus.bonusApprovalDate;
    bonus.expectedPaymentDate = expectedPaymentDate ? new Date(expectedPaymentDate) : bonus.expectedPaymentDate;
    bonus.actualPaymentDate = actualPaymentDate ? new Date(actualPaymentDate) : bonus.actualPaymentDate;
    if (currency) bonus.currency = currency;
    if (bonusReason !== undefined) bonus.bonusReason = bonusReason.trim();
    if (includedInPayroll !== undefined) bonus.includedInPayroll = !!includedInPayroll;
    if (notes !== undefined) bonus.notes = notes.trim();

    await bonus.save();

    res.status(200).json({
      success: true,
      message: 'Bonus record updated successfully.',
      data: bonus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete bonus record
// @route   DELETE /api/bonuses/:id
// @access  Private
const deleteBonus = async (req, res, next) => {
  try {
    const bonus = await Bonus.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!bonus) {
      return res.status(404).json({
        success: false,
        message: 'Bonus record not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Bonus record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Export bonuses to CSV
// @route   GET /api/bonuses/export/csv
// @access  Private
const exportBonusesCSV = async (req, res, next) => {
  try {
    const bonuses = await Bonus.find({ user: req.user.id }).sort({ createdAt: -1 });

    const fields = [
      { label: 'Month', value: row => `${row.bonusMonth || 1}/${row.bonusYear || new Date().getFullYear()}` },
      { label: 'Monthly Bonus Amount', value: row => row.monthlyBonusAmount || row.bonusAmount || 0 },
      { label: 'Monthly Bonus Given', value: row => row.monthlyBonusGiven !== undefined ? row.monthlyBonusGiven : (row.bonusStatus === 'Paid' ? (row.bonusAmount || 0) : 0) },
      { label: 'Deduction Amount', value: row => row.deductionAmount || 0 },
      { label: 'Status', value: row => row.status || row.bonusStatus || 'Given' },
      { label: 'Company', value: 'companyName' },
      { label: 'Remark', value: 'notes' },
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(bonuses);

    res.header('Content-Type', 'text/csv');
    res.attachment(`salarydetails-bonuses-${new Date().toISOString().split('T')[0]}.csv`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Update Paid Bonus Amount for the user
// @route   PUT /api/bonuses/paid-bonus-amount
// @access  Private
const updatePaidBonusAmount = async (req, res, next) => {
  try {
    const { paidBonusAmount } = req.body;
    const amountNum = Math.max(0, Number(paidBonusAmount) || 0);

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { paidBonusAmount: amountNum },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: {
        paidBonusAmount: user.paidBonusAmount || 0,
      },
      message: 'Paid Bonus Amount updated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBonuses,
  createBonus,
  updateBonus,
  deleteBonus,
  exportBonusesCSV,
  updatePaidBonusAmount,
};
