// Days until the class test, for "Test in 3 Tagen".

/** Whole days from `today` to the test date (YYYY-MM-DD, local time); null without a date. */
export function daysUntil(testDate: string | null, today: Date = new Date()): number | null {
  if (!testDate) return null
  const [y, m, d] = testDate.split('-').map(Number)
  const test = new Date(y, m - 1, d)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((test.getTime() - start.getTime()) / 86_400_000)
}
