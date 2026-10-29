const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmploymentProfile = require('../models/EmploymentProfile');
const AppSettings = require('../models/AppSettings');
const EmploymentHistory = require('../models/EmploymentHistory');
const SalaryRecord = require('../models/SalaryRecord');
const SalaryIncrement = require('../models/SalaryIncrement');
const Bonus = require('../models/Bonus');
const OtherIncomeRecord = require('../models/OtherIncomeRecord');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'paytrack_dev_jwt_secret_token_key_2026_secured',
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    }
  );
};

// @desc    Register a new user / Initial Account Setup
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const user = await User.create({ name, email, password });

    // Initialize default AppSettings for user
    await AppSettings.create({
      user: user._id,
      currency: 'INR',
      currencySymbol: '₹',
      financialYearStartMonth: 4, // April
      theme: 'light',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current authenticated user info + profile & settings
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const profile = await EmploymentProfile.findOne({ user: req.user.id });
    const settings = await AppSettings.findOne({ user: req.user.id });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      profile: profile || null,
      settings: settings || {
        currency: 'INR',
        currencySymbol: '₹',
        financialYearStartMonth: 4,
        theme: 'light',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change user password
// @route   PUT /api/auth/password
// @access  Private
const updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new passwords.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters.',
      });
    }

    const user = await User.findById(req.user.id).select('+password');
    const isMatch = await user.matchPassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password successfully updated.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user login credentials (email and/or password, name)
// @route   PUT /api/auth/credentials
// @access  Private
const updateCredentials = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    // 1. Update Email if provided and changed
    if (email && email.toLowerCase().trim() !== user.email.toLowerCase()) {
      const trimmedEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }

      const existingUser = await User.findOne({
        email: trimmedEmail,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'This email address is already in use by another account.',
        });
      }

      user.email = trimmedEmail;
    }

    // 2. Update Name if provided
    if (name && name.trim()) {
      user.name = name.trim();
    }

    // 3. Update Password if provided
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long.',
        });
      }
      user.password = password; // Mongoose pre-save hook will hash it
    }

    await user.save();

    // Generate fresh JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login credentials updated successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Seed rich demo salary & employment data for immediate testing
// @route   POST /api/auth/seed-demo
// @access  Private
const seedDemoData = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Check if user already has data; clean existing if requested
    await EmploymentProfile.deleteMany({ user: userId });
    await EmploymentHistory.deleteMany({ user: userId });
    await SalaryRecord.deleteMany({ user: userId });
    await SalaryIncrement.deleteMany({ user: userId });
    await Bonus.deleteMany({ user: userId });
    await OtherIncomeRecord.deleteMany({ user: userId });

    // 1. Create Employment Profile
    const joiningDate = new Date('2022-01-15');
    const profile = await EmploymentProfile.create({
      user: userId,
      fullName: req.user.name || 'Aditya Sharma',
      employeeId: 'EMP-7890',
      companyName: 'Apex Cloud Technologies',
      jobTitle: 'Senior Software Engineer',
      department: 'Platform Engineering',
      employmentType: 'Full-time',
      joiningDate: joiningDate,
      previousExperienceYears: 2,
      previousExperienceMonths: 6,
      employmentStatus: 'Active',
      currentMonthlyBasicSalary: 75000,
      currentMonthlyGrossSalary: 145000,
      currentMonthlyTakeHomeSalary: 128000,
      currency: 'INR',
      workLocation: 'Bengaluru, India',
      notes: 'Leading backend microservices migration and platform infrastructure.',
    });

    // 2. Create Employment History (Past jobs)
    await EmploymentHistory.create([
      {
        user: userId,
        companyName: 'NexGen Digital Solutions',
        jobTitle: 'Software Engineer',
        startDate: new Date('2019-07-01'),
        endDate: new Date('2021-12-31'),
        isCurrent: false,
        startingSalary: 45000,
        finalSalary: 70000,
        currency: 'INR',
        reasonForLeaving: 'Career advancement and opportunity to work on cloud platform architecture.',
        notes: 'Full-stack development using Node.js, React, and MongoDB.',
      },
      {
        user: userId,
        companyName: 'Apex Cloud Technologies',
        jobTitle: 'Senior Software Engineer',
        startDate: new Date('2022-01-15'),
        endDate: null,
        isCurrent: true,
        startingSalary: 95000,
        finalSalary: 145000,
        currency: 'INR',
        notes: 'Current active employment.',
      },
    ]);

    // 3. Create Salary Increments
    await SalaryIncrement.create([
      {
        user: userId,
        companyName: 'Apex Cloud Technologies',
        previousMonthlySalary: 95000,
        newMonthlySalary: 115000,
        previousAnnualSalary: 1140000,
        newAnnualSalary: 1380000,
        incrementEffectiveDate: new Date('2023-04-01'),
        incrementType: 'Annual Appraisal',
        incrementAmount: 20000,
        incrementPercentage: 21.05,
        notes: 'Annual performance cycle appraisal rating 4.8/5.',
      },
      {
        user: userId,
        companyName: 'Apex Cloud Technologies',
        previousMonthlySalary: 115000,
        newMonthlySalary: 145000,
        previousAnnualSalary: 1380000,
        newAnnualSalary: 1740000,
        incrementEffectiveDate: new Date('2024-04-01'),
        incrementType: 'Promotion',
        incrementAmount: 30000,
        incrementPercentage: 26.09,
        notes: 'Promoted to Senior Software Engineer role.',
      },
    ]);

    // 4. Create Salary Records for 2023 and 2024
    const salariesData = [];
    const companies = 'Apex Cloud Technologies';
    
    // 2023 Monthly Slips (Apr 2023 - Dec 2023)
    for (let m = 4; m <= 12; m++) {
      const gross = 115000;
      const wDays = 30;
      const perDay = Number((gross / wDays).toFixed(2));
      const leave = m === 7 ? 1 : 0;
      const leaveDed = Number((perDay * leave).toFixed(2));
      const pt = 200;
      const pf = 1800;
      const diff = 0;
      const otherDed = 10000;
      const totalDed = pt + pf + leaveDed + otherDed;
      const netAmount = gross - totalDed + diff;
      const cDate = new Date(2023, m - 1, 1);

      salariesData.push({
        user: userId,
        companyName: companies,
        effectiveDate: cDate,
        createdDate: cDate,
        salaryMonth: m,
        salaryYear: 2023,
        salary: gross,
        workingDays: wDays,
        perDaySalary: perDay,
        leaveTaken: leave,
        leaveDeductionAmount: leaveDed,
        pt: pt,
        pfAmount: pf,
        differencePerMonthAmount: diff,
        amount: netAmount,
        remark: leave > 0 ? `1 day unpaid leave deducted; regular credit` : `Monthly payroll credited for ${m}/2023`,
        monthlyBasicSalary: 60000,
        hra: 30000,
        otherAllowances: 25000,
        bonusIncludedInPayroll: 0,
        deductions: totalDed,
        grossSalary: gross,
        takeHomeSalary: netAmount,
        currency: 'INR',
        paymentStatus: 'Received',
        isCurrent: false,
        notes: `Monthly payroll credited for ${m}/2023`,
      });
    }

    // 2024 Monthly Slips (Jan 2024 - Dec 2024)
    for (let m = 1; m <= 10; m++) {
      const isPostPromotion = m >= 4;
      const gross = isPostPromotion ? 145000 : 115000;
      const basic = isPostPromotion ? 75000 : 60000;
      const hra = isPostPromotion ? 40000 : 30000;
      const allowances = isPostPromotion ? 30000 : 25000;
      const wDays = 30;
      const perDay = Number((gross / wDays).toFixed(2));
      const leave = (m === 3 || m === 7) ? 1 : 0;
      const leaveDed = Number((perDay * leave).toFixed(2));
      const pt = 200;
      const pf = 1800;
      const diff = m === 4 ? 5000 : 0; // appraisal difference arrears in April
      const otherDed = isPostPromotion ? 15000 : 10000;
      const totalDed = pt + pf + leaveDed + otherDed;
      const netAmount = gross - totalDed + diff;
      const cDate = new Date(2024, m - 1, 1);

      salariesData.push({
        user: userId,
        companyName: companies,
        effectiveDate: cDate,
        createdDate: cDate,
        salaryMonth: m,
        salaryYear: 2024,
        salary: gross,
        workingDays: wDays,
        perDaySalary: perDay,
        leaveTaken: leave,
        leaveDeductionAmount: leaveDed,
        pt: pt,
        pfAmount: pf,
        differencePerMonthAmount: diff,
        amount: netAmount,
        remark: diff > 0 ? `Appraisal increment arrears included` : (leave > 0 ? `1 day leave deduction` : `Monthly payroll credited for ${m}/2024`),
        monthlyBasicSalary: basic,
        hra: hra,
        otherAllowances: allowances,
        bonusIncludedInPayroll: 0,
        deductions: totalDed,
        grossSalary: gross,
        takeHomeSalary: netAmount,
        currency: 'INR',
        paymentStatus: m <= 9 ? 'Received' : 'Expected',
        isCurrent: m === 10,
        notes: `Monthly payroll credited for ${m}/2024`,
      });
    }

    await SalaryRecord.insertMany(salariesData);

    // 5. Create Bonuses matching the exact Monthly Bonus Grid columns
    await Bonus.create([
      {
        user: userId,
        companyName: companies,
        bonusMonth: 10,
        bonusYear: 2024,
        bonusPeriod: 'October 2024',
        monthlyBonusAmount: 20000,
        monthlyBonusGiven: 18000,
        deductionAmount: 2000,
        status: 'Given',
        bonusType: 'Monthly Performance Bonus',
        actualPaymentDate: new Date('2024-10-31'),
        bonusAmount: 18000,
        currency: 'INR',
        bonusStatus: 'Paid',
        notes: 'Monthly performance bonus with standard TDS deduction',
      },
      {
        user: userId,
        companyName: companies,
        bonusMonth: 9,
        bonusYear: 2024,
        bonusPeriod: 'September 2024',
        monthlyBonusAmount: 20000,
        monthlyBonusGiven: 20000,
        deductionAmount: 0,
        status: 'Given',
        bonusType: 'Monthly Performance Bonus',
        actualPaymentDate: new Date('2024-09-30'),
        bonusAmount: 20000,
        currency: 'INR',
        bonusStatus: 'Paid',
        notes: 'Full monthly bonus disbursed',
      },
      {
        user: userId,
        companyName: companies,
        bonusMonth: 8,
        bonusYear: 2024,
        bonusPeriod: 'August 2024',
        monthlyBonusAmount: 20000,
        monthlyBonusGiven: 17500,
        deductionAmount: 2500,
        status: 'Given',
        bonusType: 'Monthly Performance Bonus',
        actualPaymentDate: new Date('2024-08-31'),
        bonusAmount: 17500,
        currency: 'INR',
        bonusStatus: 'Paid',
        notes: 'Monthly target achievement bonus',
      },
      {
        user: userId,
        companyName: companies,
        bonusMonth: 7,
        bonusYear: 2024,
        bonusPeriod: 'July 2024',
        monthlyBonusAmount: 20000,
        monthlyBonusGiven: 20000,
        deductionAmount: 0,
        status: 'Given',
        bonusType: 'Monthly Performance Bonus',
        actualPaymentDate: new Date('2024-07-31'),
        bonusAmount: 20000,
        currency: 'INR',
        bonusStatus: 'Paid',
        notes: 'Q2 excellence reward credited',
      },
      {
        user: userId,
        companyName: companies,
        bonusMonth: 11,
        bonusYear: 2024,
        bonusPeriod: 'November 2024',
        monthlyBonusAmount: 20000,
        monthlyBonusGiven: 0,
        deductionAmount: 0,
        status: 'Pending',
        bonusType: 'Monthly Performance Bonus',
        expectedPaymentDate: new Date('2024-11-30'),
        actualPaymentDate: null,
        bonusAmount: 0,
        currency: 'INR',
        bonusStatus: 'Expected',
        notes: 'Scheduled upcoming monthly bonus',
      },
      {
        user: userId,
        companyName: companies,
        bonusMonth: 4,
        bonusYear: 2024,
        bonusPeriod: 'April 2024',
        monthlyBonusAmount: 185000,
        monthlyBonusGiven: 185000,
        deductionAmount: 0,
        status: 'Given',
        bonusType: 'Annual Performance Bonus',
        actualPaymentDate: new Date('2024-04-29'),
        bonusAmount: 185000,
        currency: 'INR',
        bonusStatus: 'Paid',
        notes: 'Annual appraisal incentive',
      },
      {
        user: userId,
        companyName: companies,
        bonusMonth: 10,
        bonusYear: 2023,
        bonusPeriod: 'October 2023',
        monthlyBonusAmount: 50000,
        monthlyBonusGiven: 50000,
        deductionAmount: 0,
        status: 'Given',
        bonusType: 'Festival Bonus',
        actualPaymentDate: new Date('2023-11-04'),
        bonusAmount: 50000,
        currency: 'INR',
        bonusStatus: 'Paid',
        notes: 'Diwali festival bonus',
      },
    ]);

    // 6. Create Other Income & Deductions
    await OtherIncomeRecord.create([
      {
        user: userId,
        recordType: 'Other Income',
        category: 'Travel Reimbursement',
        amount: 24500,
        transactionDate: new Date('2024-05-15'),
        company: companies,
        description: 'Tech summit conference airfare and hotel reimbursement',
        paymentStatus: 'Received',
      },
      {
        user: userId,
        recordType: 'Other Income',
        category: 'Wellness Allowance',
        amount: 15000,
        transactionDate: new Date('2024-07-20'),
        company: companies,
        description: 'Annual fitness and gym reimbursement benefit',
        paymentStatus: 'Received',
      },
    ]);

    res.status(200).json({
      success: true,
      message: 'Demo dataset successfully generated and linked to your account.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  requestPasswordReset,
  resetPassword,

  register,
  login,
  getMe,
  updatePassword,
  updateCredentials,
  seedDemoData,
};
