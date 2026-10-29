/**
 * Service to calculate precise employment duration and total career experience
 * without double-counting overlapping intervals.
 */

// Calculate difference between two dates in years, months, and days
function calculateDateDifference(startDate, endDate = new Date()) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return { years: 0, months: 0, days: 0, totalDays: 0, formatted: '0 months' };
  }

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Get days in previous month of end date
    const prevMonthLastDay = new Date(end.getFullYear(), end.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const diffTime = Math.abs(end - start);
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const parts = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
  if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);

  return {
    years,
    months,
    days,
    totalDays,
    formatted: parts.join(', '),
  };
}

/**
 * Merge overlapping and adjacent date intervals
 * @param {Array<{start: Date, end: Date}>} intervals
 * @returns {Array<{start: Date, end: Date}>}
 */
function mergeDateIntervals(intervals) {
  if (!intervals || intervals.length === 0) return [];

  // Filter out invalid dates and normalize
  const valid = intervals
    .map(inv => ({
      start: new Date(inv.start),
      end: inv.end ? new Date(inv.end) : new Date(),
    }))
    .filter(inv => !isNaN(inv.start.getTime()) && !isNaN(inv.end.getTime()) && inv.start <= inv.end)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (valid.length === 0) return [];

  const merged = [valid[0]];

  for (let i = 1; i < valid.length; i++) {
    const current = valid[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      // Overlapping or touching intervals - merge
      if (current.end > last.end) {
        last.end = current.end;
      }
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Calculate total career experience combining current company and history,
 * guaranteeing no duplicate counting for overlapping periods.
 */
function calculateTotalCareerExperience(profile, historyRecords = []) {
  const intervals = [];

  // 1. Current company interval from profile
  if (profile && profile.joiningDate) {
    intervals.push({
      start: new Date(profile.joiningDate),
      end: profile.employmentStatus === 'Resigned' ? (profile.updatedAt || new Date()) : new Date(),
    });
  }

  // 2. Add history records intervals
  if (Array.isArray(historyRecords)) {
    historyRecords.forEach(h => {
      if (h.startDate) {
        intervals.push({
          start: new Date(h.startDate),
          end: h.endDate ? new Date(h.endDate) : (h.isCurrent ? new Date() : new Date()),
        });
      }
    });
  }

  // If there are specific date intervals, merge and compute
  if (intervals.length > 0) {
    const mergedIntervals = mergeDateIntervals(intervals);

    let totalY = 0;
    let totalM = 0;
    let totalD = 0;
    let totalDaysSum = 0;

    mergedIntervals.forEach(interval => {
      const diff = calculateDateDifference(interval.start, interval.end);
      totalY += diff.years;
      totalM += diff.months;
      totalD += diff.days;
      totalDaysSum += diff.totalDays;
    });

    // Normalize days and months
    totalM += Math.floor(totalD / 30.4375); // Average days in month
    totalD = Math.round(totalD % 30.4375);

    totalY += Math.floor(totalM / 12);
    totalM = totalM % 12;

    // If profile had manual previous experience years/months and NO history records were provided
    if ((!historyRecords || historyRecords.length === 0) && profile) {
      const prevY = Number(profile.previousExperienceYears) || 0;
      const prevM = Number(profile.previousExperienceMonths) || 0;
      totalY += prevY;
      totalM += prevM;
      totalY += Math.floor(totalM / 12);
      totalM = totalM % 12;
    }

    const parts = [];
    if (totalY > 0) parts.push(`${totalY} ${totalY === 1 ? 'year' : 'years'}`);
    if (totalM > 0) parts.push(`${totalM} ${totalM === 1 ? 'month' : 'months'}`);
    if (totalD > 0 || parts.length === 0) parts.push(`${totalD} ${totalD === 1 ? 'day' : 'days'}`);

    return {
      years: totalY,
      months: totalM,
      days: totalD,
      totalDays: totalDaysSum,
      formatted: parts.join(', '),
    };
  }

  // Fallback: estimate based on profile values if no dates
  const prevY = profile ? Number(profile.previousExperienceYears) || 0 : 0;
  const prevM = profile ? Number(profile.previousExperienceMonths) || 0 : 0;
  const normalizedY = prevY + Math.floor(prevM / 12);
  const normalizedM = prevM % 12;

  return {
    years: normalizedY,
    months: normalizedM,
    days: 0,
    totalDays: normalizedY * 365 + normalizedM * 30,
    formatted: `${normalizedY} years, ${normalizedM} months`,
  };
}

module.exports = {
  calculateDateDifference,
  mergeDateIntervals,
  calculateTotalCareerExperience,
};
