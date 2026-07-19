
export default (daysLoggedIn: string[]): number => {

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  const uniqueDays = new Set(
    daysLoggedIn
      .map(date => new Date(date))
      .filter(date => date >= thirtyDaysAgo)
      .map(date => date.toISOString().split("T")[0])
      .sort()
      .reverse()
  )


  let activeDaysRatio = uniqueDays.size / 30;

  let streak = 0;
  let expected = new Date();

  // Normalize to UTC midnight
  expected.setUTCHours(0, 0, 0, 0);

  for (const day of uniqueDays) {
    if (!day) {
      continue
    }
    const current = new Date(day);
    current.setUTCHours(0, 0, 0, 0);

    if (current.getTime() === expected.getTime()) {
      streak++;
      expected.setUTCDate(expected.getUTCDate() - 1);
    } else if (streak === 0) {
      // Allow missing today if last practice was yesterday
      expected.setUTCDate(expected.getUTCDate() - 1);
      if (current.getTime() === expected.getTime()) {
        streak++;
        expected.setUTCDate(expected.getUTCDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  let streakScore = Math.min(Math.log(streak + 1) / Math.log(30), 1);

  let recencyScore = 0
  let lastSession = uniqueDays.values().next().value
  if (lastSession) {
    let daysSinceLatestSession = (today.getTime() - new Date(lastSession).getTime()) / (1000 * 60 * 60 * 24)
    recencyScore = Math.exp(-daysSinceLatestSession / 14)
  }


  const consistencyScore = (
    0.5 * activeDaysRatio +
    0.3 * streakScore +
    0.2 * recencyScore
  ) * 100;


  return (consistencyScore)
}
