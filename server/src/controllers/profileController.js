const User = require('../models/User');
const EmploymentProfile = require('../models/EmploymentProfile');
const EmploymentHistory = require('../models/EmploymentHistory');
const {
  calculateDateDifference,
  calculateTotalCareerExperience,
} = require('../services/experienceService');

// @desc    Get user's personal & employment profile with calculated experiences
// @route   GET /api/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    let profile = await EmploymentProfile.findOne({ user: req.user.id });
    const history = await EmploymentHistory.find({ user: req.user.id }).sort({ startDate: 1 });

    if (!profile) {
      return res.status(200).json({
        success: true,
        data: null,
        experience: {
          currentCompany: { years: 0, months: 0, days: 0, formatted: '0 days' },
          previousExperience: { years: 0, months: 0, days: 0, formatted: '0 years, 0 months' },
          totalCareerExperience: { years: 0, months: 0, days: 0, formatted: '0 days' },
        },
      });
    }

    // 1. Current Company Experience
    const currentDiff = calculateDateDifference(
      profile.joiningDate,
      profile.employmentStatus === 'Resigned' ? profile.updatedAt : new Date()
    );

    // 2. Previous Experience
    const prevYears = Number(profile.previousExperienceYears) || 0;
    const prevMonths = Number(profile.previousExperienceMonths) || 0;
    const previousExperience = {
      years: prevYears,
      months: prevMonths,
      days: 0,
      formatted: `${prevYears} ${prevYears === 1 ? 'year' : 'years'}, ${prevMonths} ${prevMonths === 1 ? 'month' : 'months'}`,
    };

    // 3. Total Career Experience (Interval Merged without Overlap)
    const totalExp = calculateTotalCareerExperience(profile, history);

    res.status(200).json({
      success: true,
      data: profile,
      experience: {
        currentCompany: currentDiff,
        previousExperience,
        totalCareerExperience: totalExp,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update personal & employment profile
// @route   PUT /api/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const {
      fullName,
      employeeId,
      companyName,
      jobTitle,
      department,
      employmentType,
      joiningDate,
      previousExperienceYears,
      previousExperienceMonths,
      employmentStatus,
      currentMonthlyBasicSalary,
      currentMonthlyGrossSalary,
      currentMonthlyTakeHomeSalary,
      currency,
      workLocation,
      notes,
    } = req.body;

    if (!fullName || !companyName || !jobTitle || !joiningDate) {
      return res.status(400).json({
        success: false,
        message: 'Full Name, Company Name, Job Title, and Joining Date are required.',
      });
    }

    const profileFields = {
      user: req.user.id,
      fullName: fullName.trim(),
      employeeId: employeeId ? employeeId.trim() : '',
      companyName: companyName.trim(),
      jobTitle: jobTitle.trim(),
      department: department ? department.trim() : '',
      employmentType: employmentType || 'Full-time',
      joiningDate: new Date(joiningDate),
      previousExperienceYears: Number(previousExperienceYears) || 0,
      previousExperienceMonths: Number(previousExperienceMonths) || 0,
      employmentStatus: employmentStatus || 'Active',
      currentMonthlyBasicSalary: Number(currentMonthlyBasicSalary) || 0,
      currentMonthlyGrossSalary: Number(currentMonthlyGrossSalary) || 0,
      currentMonthlyTakeHomeSalary: Number(currentMonthlyTakeHomeSalary) || 0,
      currency: currency || 'INR',
      workLocation: workLocation ? workLocation.trim() : '',
      notes: notes ? notes.trim() : '',
    };

    let profile = await EmploymentProfile.findOne({ user: req.user.id });

    if (profile) {
      profile = await EmploymentProfile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true, runValidators: true }
      );
    } else {
      profile = await EmploymentProfile.create(profileFields);
    }

    // Sync user's account name with fullName
    if (fullName && fullName.trim()) {
      await User.findByIdAndUpdate(req.user.id, { name: fullName.trim() });
    }

    // Also ensure current active employment record in history matches if one exists
    await EmploymentHistory.findOneAndUpdate(
      { user: req.user.id, isCurrent: true },
      {
        companyName: profile.companyName,
        jobTitle: profile.jobTitle,
        startDate: profile.joiningDate,
        finalSalary: profile.currentMonthlyGrossSalary,
        currency: profile.currency,
      }
    );

    // Compute updated experience breakdown
    const history = await EmploymentHistory.find({ user: req.user.id }).sort({ startDate: 1 });
    const currentDiff = calculateDateDifference(profile.joiningDate, new Date());
    const totalExp = calculateTotalCareerExperience(profile, history);

    res.status(200).json({
      success: true,
      message: 'Employment profile saved successfully.',
      data: profile,
      experience: {
        currentCompany: currentDiff,
        previousExperience: {
          years: profile.previousExperienceYears,
          months: profile.previousExperienceMonths,
          days: 0,
          formatted: `${profile.previousExperienceYears} years, ${profile.previousExperienceMonths} months`,
        },
        totalCareerExperience: totalExp,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
