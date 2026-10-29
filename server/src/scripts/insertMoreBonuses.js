const mongoose = require('mongoose');
const User = require('../models/User');
const Bonus = require('../models/Bonus');
const EmploymentProfile = require('../models/EmploymentProfile');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/paytrack';

async function insertBonuses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', MONGODB_URI);

    let user = await User.findOne({ email: 'tareqanwar12@gmail.com' });
    if (!user) user = await User.findOne();
    if (!user) throw new Error('No user found');

    const profile = await EmploymentProfile.findOne({ user: user._id });
    const companyName = profile?.companyName || 'IqraTechnology';

    const newBonusDataRaw = [
      // --- SCREENSHOT 1: Sep 2024 to Aug 2025 (12 records) ---
      { month: 9, year: 2024, amount: 10000, given: 8000, ded: 2000, status: 'Unpaid' },
      { month: 10, year: 2024, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 11, year: 2024, amount: 10000, given: 9318, ded: 682, status: 'Unpaid' },
      { month: 12, year: 2024, amount: 10000, given: 9318, ded: 682, status: 'Unpaid' },
      { month: 1, year: 2025, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 2, year: 2025, amount: 10000, given: 9762, ded: 238, status: 'Unpaid' },
      { month: 3, year: 2025, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 4, year: 2025, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 5, year: 2025, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 6, year: 2025, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 7, year: 2025, amount: 10000, given: 1818, ded: 8182, status: 'Unpaid' },
      { month: 8, year: 2025, amount: 10000, given: 0, ded: 0, status: 'No Bonus' },

      // --- SCREENSHOT 2: Sep 2025 to Aug 2026 (12 records) ---
      { month: 9, year: 2025, amount: 10000, given: 0, ded: 0, status: 'No Bonus' },
      { month: 10, year: 2025, amount: 10000, given: 0, ded: 0, status: 'No Bonus' },
      { month: 11, year: 2025, amount: 10000, given: 0, ded: 0, status: 'No Bonus' },
      { month: 12, year: 2025, amount: 10000, given: 0, ded: 0, status: 'Unpaid' },
      { month: 1, year: 2026, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 2, year: 2026, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 3, year: 2026, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 4, year: 2026, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 5, year: 2026, amount: 10000, given: 9500, ded: 500, status: 'Unpaid' },
      { month: 6, year: 2026, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 7, year: 2026, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },
      { month: 8, year: 2026, amount: 10000, given: 10000, ded: 0, status: 'Unpaid' },

      // --- SCREENSHOT 3: Sep 2026 (1 record) ---
      { month: 9, year: 2026, amount: 10000, given: 3478, ded: 6522, status: 'Unpaid' },
    ];

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Upsert or insert records avoiding duplicates
    let insertedCount = 0;
    for (const b of newBonusDataRaw) {
      const pDate = new Date(b.year, b.month - 1, 25);
      const filter = {
        user: user._id,
        bonusMonth: b.month,
        bonusYear: b.year,
      };

      const doc = {
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
        expectedPaymentDate: pDate,
        actualPaymentDate: b.status === 'Paid' ? pDate : null,
        bonusAmount: b.given,
        currency: 'INR',
        bonusStatus: b.status === 'Paid' ? 'Paid' : 'Expected',
        notes: `Monthly performance bonus ${monthNames[b.month]} ${b.year}`,
      };

      await Bonus.findOneAndUpdate(filter, { $set: doc }, { upsert: true, new: true });
      insertedCount++;
    }

    console.log(`Successfully inserted / updated ${insertedCount} bonus records!`);

    const totalBonuses = await Bonus.countDocuments({ user: user._id });
    console.log(`Total Bonus records in DB now: ${totalBonuses}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Failed to insert bonuses:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

insertBonuses();
