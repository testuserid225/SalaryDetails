const SalaryIncrement = require('../models/SalaryIncrement');

// Helper to auto calculate amount and percentage
const calculateIncrement = (prevMonthly, newMonthly) => {
  const prev = Number(prevMonthly) || 0;
  const next = Number(newMonthly) || 0;
  const amount = next - prev;
  let percentage = 0;

  if (prev > 0) {
    percentage = Number(((amount / prev) * 100).toFixed(2));
  } else if (next > 0) {
    percentage = 100;
  }

  return {
    previousMonthlySalary: prev,
    newMonthlySalary: next,
    previousAnnualSalary: prev * 12,
    newAnnualSalary: next * 12,
    incrementAmount: amount,
    incrementPercentage: percentage,
  };
};

// @desc    Get all salary increments + summary stats
// @route   GET /api/increments
// @access  Private
const getIncrements = async (req, res, next) => {
  try {
    const { year, company } = req.query;
    const query = { user: req.user.id };

    if (company) {
      query.companyName = new RegExp(company, 'i');
    }

    const increments = await SalaryIncrement.find(query).sort({
      incrementEffectiveDate: -1,
    });

    // Filter by year in JS or query
    const filteredIncrements = year
      ? increments.filter(inc => new Date(inc.incrementEffectiveDate).getFullYear() === Number(year))
      : increments;

    // Calculate summary statistics
    const totalIncrements = increments.length;
    const totalCumulativeIncrease = increments.reduce((acc, curr) => acc + (curr.incrementAmount || 0), 0);
    const avgPercentage = totalIncrements > 0
      ? Number((increments.reduce((acc, curr) => acc + (curr.incrementPercentage || 0), 0) / totalIncrements).toFixed(2))
      : 0;

    // Group history by year
    const historyByYear = {};
    increments.forEach(inc => {
      const incYear = new Date(inc.incrementEffectiveDate).getFullYear();
      if (!historyByYear[incYear]) {
        historyByYear[incYear] = {
          year: incYear,
          count: 0,
          totalHike: 0,
          items: [],
        };
      }
      historyByYear[incYear].count++;
      historyByYear[incYear].totalHike += inc.incrementAmount;
      historyByYear[incYear].items.push(inc);
    });

    res.status(200).json({
      success: true,
      data: filteredIncrements,
      stats: {
        totalIncrements,
        totalCumulativeIncrease,
        averagePercentage: avgPercentage,
        historyByYear: Object.values(historyByYear).sort((a, b) => b.year - a.year),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new salary increment
// @route   POST /api/increments
// @access  Private
const createIncrement = async (req, res, next) => {
  try {
    const {
      companyName,
      previousMonthlySalary,
      newMonthlySalary,
      incrementEffectiveDate,
      incrementType,
      notes,
    } = req.body;

    if (!companyName || previousMonthlySalary === undefined || newMonthlySalary === undefined || !incrementEffectiveDate) {
      return res.status(400).json({
        success: false,
        message: 'Company name, previous salary, new salary, and effective date are required.',
      });
    }

    const calculated = calculateIncrement(previousMonthlySalary, newMonthlySalary);

    const increment = await SalaryIncrement.create({
      user: req.user.id,
      companyName: companyName.trim(),
      ...calculated,
      incrementEffectiveDate: new Date(incrementEffectiveDate),
      incrementType: incrementType || 'Annual Appraisal',
      notes: notes ? notes.trim() : '',
    });

    res.status(201).json({
      success: true,
      message: 'Salary increment recorded successfully.',
      data: increment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update salary increment
// @route   PUT /api/increments/:id
// @access  Private
const updateIncrement = async (req, res, next) => {
  try {
    const increment = await SalaryIncrement.findOne({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!increment) {
      return res.status(404).json({
        success: false,
        message: 'Increment record not found.',
      });
    }

    const {
      companyName,
      previousMonthlySalary,
      newMonthlySalary,
      incrementEffectiveDate,
      incrementType,
      notes,
    } = req.body;

    const prev = previousMonthlySalary !== undefined ? previousMonthlySalary : increment.previousMonthlySalary;
    const nextSal = newMonthlySalary !== undefined ? newMonthlySalary : increment.newMonthlySalary;
    const calculated = calculateIncrement(prev, nextSal);

    increment.companyName = companyName ? companyName.trim() : increment.companyName;
    increment.previousMonthlySalary = calculated.previousMonthlySalary;
    increment.newMonthlySalary = calculated.newMonthlySalary;
    increment.previousAnnualSalary = calculated.previousAnnualSalary;
    increment.newAnnualSalary = calculated.newAnnualSalary;
    increment.incrementAmount = calculated.incrementAmount;
    increment.incrementPercentage = calculated.incrementPercentage;
    if (incrementEffectiveDate) increment.incrementEffectiveDate = new Date(incrementEffectiveDate);
    if (incrementType) increment.incrementType = incrementType;
    if (notes !== undefined) increment.notes = notes.trim();

    await increment.save();

    res.status(200).json({
      success: true,
      message: 'Increment record updated successfully.',
      data: increment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete salary increment
// @route   DELETE /api/increments/:id
// @access  Private
const deleteIncrement = async (req, res, next) => {
  try {
    const increment = await SalaryIncrement.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!increment) {
      return res.status(404).json({
        success: false,
        message: 'Increment record not found.',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Increment record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIncrements,
  createIncrement,
  updateIncrement,
  deleteIncrement,
};
