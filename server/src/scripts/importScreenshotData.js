const mongoose = require('mongoose');
const User = require('../models/User');
const SalaryRecord = require('../models/SalaryRecord');
const Bonus = require('../models/Bonus');
const EmploymentProfile = require('../models/EmploymentProfile');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/paytrack';

async function importData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', MONGODB_URI);

    // Find the user (or default user)
    let user = await User.findOne({ email: 'tareqanwar12@gmail.com' });
    if (!user) {
      user = await User.findOne();
    }
    if (!user) {
      throw new Error('No user found in the database. Please register first.');
    }

    console.log(`Targeting user: ${user.name} (${user.email}, ID: ${user._id})`);

    // Ensure EmploymentProfile exists with company IqraTechnology
    let profile = await EmploymentProfile.findOne({ user: user._id });
    if (!profile) {
      profile = await EmploymentProfile.create({
        user: user._id,
        fullName: user.name || 'Shaikh Tareq Anwar',
        companyName: 'IqraTechnology',
        jobTitle: 'Software Engineer',
        joiningDate: new Date('2022-09-01'),
        currency: 'INR',
      });
      console.log('Created EmploymentProfile with company IqraTechnology');
    }

    const companyName = profile.companyName || 'IqraTechnology';

    // 1. DELETE all existing SalaryRecord and Bonus data for this user (or all)
    const delSalary = await SalaryRecord.deleteMany({ user: user._id });
    const delBonus = await Bonus.deleteMany({ user: user._id });
    console.log(`Deleted ${delSalary.deletedCount} existing salary records.`);
    console.log(`Deleted ${delBonus.deletedCount} existing bonus records.`);

    // 2. INSERT 49 Salary Records from Screenshots 1, 2, 3, and 4
    const salaryDataRaw = [
      // --- SHEET 1: Sep 2022 to Aug 2023 ---
      {
        month: 9, year: 2022, amount: 39800, created: '2022-09-26', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 10, year: 2022, amount: 37895, created: '2022-10-22', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 2105, days: 22, perDay: 1818.181818, leaveDed: 1905, leaveTaken: 1, remark: 'Leave Taken'
      },
      {
        month: 11, year: 2022, amount: 39800, created: '2022-11-25', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 12, year: 2022, amount: 36943, created: '2022-12-23', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 3057, days: 22, perDay: 1818.181818, leaveDed: 2857, leaveTaken: 1.5, remark: 'Leave Taken'
      },
      {
        month: 1, year: 2023, amount: 39800, created: '2023-01-25', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 2, year: 2023, amount: 38830, created: '2023-02-24', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 1170, days: 21, perDay: 1904.761905, leaveDed: 970, leaveTaken: 0.5, remark: 'Leave Taken'
      },
      {
        month: 3, year: 2023, amount: 39800, created: '2023-03-23', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 20, perDay: 2000, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 4, year: 2023, amount: 39800, created: '2023-04-20', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 5, year: 2023, amount: 39800, created: '2023-05-26', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 6, year: 2023, amount: 38891, created: '2023-06-27', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 1109, days: 22, perDay: 1818.181818, leaveDed: 909, leaveTaken: 0.5, remark: 'Leave Taken'
      },
      {
        month: 7, year: 2023, amount: 39800, created: '2023-07-24', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 8, year: 2023, amount: 39800, created: '2023-08-23', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },

      // --- SHEET 2: Sep 2023 to Aug 2024 ---
      {
        month: 9, year: 2023, amount: 37895, created: '2023-09-23', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 2105, days: 22, perDay: 1818.181818, leaveDed: 1905, leaveTaken: 1, remark: 'Leave Taken'
      },
      {
        month: 10, year: 2023, amount: 39800, created: '2023-10-24', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 11, year: 2023, amount: 37961, created: '2023-11-24', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 2039, days: 21, perDay: 1904.761905, leaveDed: 1839, leaveTaken: 1, remark: 'Leave Taken'
      },
      {
        month: 12, year: 2023, amount: 37700, created: '2023-12-23', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 2300, days: 22, perDay: 1818.181818, leaveDed: 2100, leaveTaken: 1, remark: 'Leave Taken'
      },
      {
        month: 1, year: 2024, amount: 39800, created: '2024-01-23', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 2, year: 2024, amount: 39700, created: '2024-02-23', salary: 40000,
        pt: 300, pf: 0, esic: 0, diff: 300, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 3, year: 2024, amount: 39700, created: '2024-03-21', salary: 40000,
        pt: 300, pf: 0, esic: 0, diff: 300, days: 20, perDay: 2000, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 4, year: 2024, amount: 39800, created: '2024-04-23', salary: 40000,
        pt: 200, pf: 0, esic: 0, diff: 200, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 5, year: 2024, amount: 36100, created: '2024-05-24', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3900, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 6, year: 2024, amount: 35248, created: '2024-06-25', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 4752, days: 22, perDay: 1818.181818, leaveDed: 952, leaveTaken: 0.5, remark: 'Leave Taken'
      },
      {
        month: 7, year: 2024, amount: 36200, created: '2024-07-24', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 8, year: 2024, amount: 36200, created: '2024-08-23', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },

      // --- SHEET 3: Sep 2024 to Aug 2025 ---
      {
        month: 9, year: 2024, amount: 36200, created: '2024-09-23', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 10, year: 2024, amount: 36200, created: '2024-10-24', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 11, year: 2024, amount: 36200, created: '2024-11-24', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 12, year: 2024, amount: 36200, created: '2024-12-24', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 1, year: 2025, amount: 36200, created: '2025-01-23', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 2, year: 2025, amount: 36100, created: '2025-02-24', salary: 40000,
        pt: 300, pf: 3600, esic: 0, diff: 3900, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 3, year: 2025, amount: 36200, created: '2025-03-21', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 20, perDay: 2000, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 4, year: 2025, amount: 36200, created: '2025-03-12', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'advanced (12-03-2025 of April-2025)'
      },
      {
        month: 5, year: 2025, amount: 36200, created: '2025-05-23', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 6, year: 2025, amount: 36200, created: '2025-06-24', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 7, year: 2025, amount: 36200, created: '2025-07-24', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 8, year: 2025, amount: 36200, created: '2025-08-28', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },

      // --- SHEET 4: Sep 2025 to Sep 2026 ---
      {
        month: 9, year: 2025, amount: 36200, created: '2025-09-26', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 10, year: 2025, amount: 36200, created: '2025-10-27', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 11, year: 2025, amount: 36200, created: '2025-11-25', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 3800, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 12, year: 2025, amount: 18018, created: '2025-12-26', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 21982, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'Deduction salary'
      },
      {
        month: 1, year: 2026, amount: 35400, created: '2026-01-26', salary: 40000,
        pt: 200, pf: 3600, esic: 0, diff: 4600, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 2, year: 2026, amount: 36100, created: '2026-02-24', salary: 40000,
        pt: 300, pf: 3600, esic: 800, diff: 3900, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 3, year: 2026, amount: 35400, created: '2026-03-16', salary: 40000,
        pt: 200, pf: 3600, esic: 800, diff: 4600, days: 20, perDay: 2000, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 4, year: 2026, amount: 35437, created: '2026-04-27', salary: 40000,
        pt: 200, pf: 3600, esic: 763, diff: 4563, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 5, year: 2026, amount: 35400, created: '2026-05-24', salary: 40000,
        pt: 200, pf: 3600, esic: 800, diff: 4600, days: 20, perDay: 2000, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 6, year: 2026, amount: 35400, created: '2026-06-27', salary: 40000,
        pt: 200, pf: 3600, esic: 800, diff: 4600, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 7, year: 2026, amount: 35400, created: '2026-07-24', salary: 40000,
        pt: 200, pf: 3600, esic: 800, diff: 4600, days: 22, perDay: 1818.181818, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 8, year: 2026, amount: 35400, created: '2026-08-24', salary: 40000,
        pt: 200, pf: 3600, esic: 800, diff: 4600, days: 21, perDay: 1904.761905, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
      {
        month: 9, year: 2026, amount: 34200, created: '2026-09-24', salary: 40000,
        pt: 200, pf: 4800, esic: 800, diff: 5800, days: 23, perDay: 1739.130435, leaveDed: 0, leaveTaken: 0, remark: 'No Leave Taken'
      },
    ];

    const salaryDocs = salaryDataRaw.map((s, idx) => {
      const cDate = new Date(s.created);
      const isLatest = idx === salaryDataRaw.length - 1;
      return {
        user: user._id,
        companyName,
        salaryMonth: s.month,
        salaryYear: s.year,
        amount: s.amount,
        createdDate: cDate,
        effectiveDate: cDate,
        salary: s.salary,
        workingDays: s.days,
        perDaySalary: s.perDay,
        leaveTaken: s.leaveTaken,
        leaveDeductionAmount: s.leaveDed,
        pt: s.pt,
        pfAmount: s.pf,
        esic: s.esic,
        differencePerMonthAmount: s.diff,
        remark: s.remark,
        notes: s.remark,
        monthlyBasicSalary: Math.round(s.salary * 0.5),
        hra: Math.round(s.salary * 0.25),
        otherAllowances: Math.round(s.salary * 0.25),
        bonusIncludedInPayroll: 0,
        deductions: s.pt + s.pf + s.esic + s.leaveDed,
        grossSalary: s.salary,
        takeHomeSalary: s.amount,
        currency: 'INR',
        paymentStatus: 'Received',
        isCurrent: isLatest,
      };
    });

    await SalaryRecord.insertMany(salaryDocs);
    console.log(`Inserted ${salaryDocs.length} verified salary records matching the screenshots!`);

    // 3. INSERT 12 Bonus Records from Screenshot 5 (Sep 2023 to Aug 2024)
    const bonusDataRaw = [
      { month: 9, year: 2023, amount: 10000, given: 2000, ded: 8000, status: 'Paid' },
      { month: 10, year: 2023, amount: 10000, given: 2000, ded: 8000, status: 'Paid' },
      { month: 11, year: 2023, amount: 10000, given: 5000, ded: 5000, status: 'Unpaid' },
      { month: 12, year: 2023, amount: 10000, given: 5000, ded: 5000, status: 'Unpaid' },
      { month: 1, year: 2024, amount: 10000, given: 7826, ded: 2174, status: 'Unpaid' },
      { month: 2, year: 2024, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 3, year: 2024, amount: 10000, given: 8000, ded: 2000, status: 'Unpaid' },
      { month: 4, year: 2024, amount: 10000, given: 8000, ded: 2000, status: 'Unpaid' },
      { month: 5, year: 2024, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 6, year: 2024, amount: 10000, given: 9524, ded: 476, status: 'Unpaid' },
      { month: 7, year: 2024, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 8, year: 2024, amount: 10000, given: 9500, ded: 500, status: 'Unpaid' },
    ];

    const bonusDocs = bonusDataRaw.map((b) => {
      const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const pDate = new Date(b.year, b.month - 1, 25);
      return {
        user: user._id,
        companyName,
        bonusMonth: b.month,
        bonusYear: b.year,
        bonusPeriod: `${monthNames[b.month]} ${b.year}`,
        monthlyBonusAmount: b.amount,
        monthlyBonusGiven: b.given,
        deductionAmount: b.ded,
        status: b.status,
        bonusType: 'Monthly Bonus',
        actualPaymentDate: b.status === 'Paid' ? pDate : null,
        expectedPaymentDate: pDate,
        bonusAmount: b.given,
        currency: 'INR',
        bonusStatus: b.status === 'Paid' ? 'Paid' : 'Expected',
        notes: `Monthly performance bonus ${monthNames[b.month]} ${b.year}`,
      };
    });

    await Bonus.insertMany(bonusDocs);
    console.log(`Inserted ${bonusDocs.length} verified monthly bonus records matching Screenshot 5!`);

    // Sync employment profile with current salary
    await EmploymentProfile.findOneAndUpdate(
      { user: user._id },
      {
        currentMonthlyBasicSalary: 20000,
        currentMonthlyGrossSalary: 40000,
        currentMonthlyTakeHomeSalary: 34200,
        companyName,
      }
    );

    console.log('Successfully completed data import!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Data import failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

importData();
