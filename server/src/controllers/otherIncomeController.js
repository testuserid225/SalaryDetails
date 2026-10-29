const OtherIncomeRecord = require('../models/OtherIncomeRecord');

// @desc    Get all other income & deductions
// @route   GET /api/other-incomes
// @access  Private
const getOtherIncomes = async (req, res, next) => {
  try {
    const { recordType, category, paymentStatus, year } = req.query;
    const query = { user: req.user.id };

    if (recordType) query.recordType = recordType;
    if (category) query.category = new RegExp(category, 'i');
    if (paymentStatus) query.paymentStatus = paymentStatus;

    let records = await OtherIncomeRecord.find(query).sort({ transactionDate: -1 });

    if (year) {
      records = records.filter(r => new Date(r.transactionDate).getFullYear() === Number(year));
    }

    // Totals
    const all = await OtherIncomeRecord.find({ user: req.user.id });
    const totalOtherIncomePaid = all
      .filter(r => r.recordType === 'Other Income' && (r.paymentStatus === 'Received' || r.paymentStatus === 'Paid'))
      .reduce((sum, r) => sum + r.amount, 0);

    const totalDeductionsPaid = all
      .filter(r => r.recordType === 'Deduction' && (r.paymentStatus === 'Received' || r.paymentStatus === 'Paid'))
      .reduce((sum, r) => sum + r.amount, 0);

    const categories = await OtherIncomeRecord.distinct('category', { user: req.user.id });

    res.status(200).json({
      success: true,
      data: records,
      stats: {
        totalOtherIncomePaid,
        totalDeductionsPaid,
        netOtherIncome: totalOtherIncomePaid - totalDeductionsPaid,
      },
      categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new other income / deduction record
// @route   POST /api/other-incomes
// @access  Private
const createOtherIncome = async (req, res, next) => {
  try {
    const {
      recordType,
      category,
      amount,
      transactionDate,
      company,
      description,
      paymentStatus,
      notes,
    } = req.body;

    if (!category || amount === undefined || !transactionDate) {
      return res.status(400).json({
        success: false,
        message: 'Category, amount, and transaction date are required.',
      });
    }

    const record = await OtherIncomeRecord.create({
      user: req.user.id,
      recordType: recordType || 'Other Income',
      category: category.trim(),
      amount: Number(amount),
      transactionDate: new Date(transactionDate),
      company: company ? company.trim() : '',
      description: description ? description.trim() : '',
      paymentStatus: paymentStatus || 'Received',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Record created successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update other income / deduction record
// @route   PUT /api/other-incomes/:id
// @access  Private
const updateOtherIncome = async (req, res, next) => {
  try {
    const record = await OtherIncomeRecord.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
      });
    }

    const {
      recordType,
      category,
      amount,
      transactionDate,
      company,
      description,
      paymentStatus,
      notes,
    } = req.body;

    if (recordType) record.recordType = recordType;
    if (category) record.category = category.trim();
    if (amount !== undefined) record.amount = Number(amount);
    if (transactionDate) record.transactionDate = new Date(transactionDate);
    if (company !== undefined) record.company = company.trim();
    if (description !== undefined) record.description = description.trim();
    if (paymentStatus) record.paymentStatus = paymentStatus;
    if (notes !== undefined) record.notes = notes.trim();

    await record.save();

    res.status(200).json({
      success: true,
      message: 'Record updated successfully.',
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete other income / deduction record
// @route   DELETE /api/other-incomes/:id
// @access  Private
const deleteOtherIncome = async (req, res, next) => {
  try {
    const record = await OtherIncomeRecord.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOtherIncomes,
  createOtherIncome,
  updateOtherIncome,
  deleteOtherIncome,
};
