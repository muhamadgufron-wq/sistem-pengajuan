/**
 * Utility functions for attendance management
 */

/**
 * Check if a given date is Wednesday
 */
export function isWednesday(date: Date): boolean {
  return date.getDay() === 3; // 0 = Sunday, 3 = Wednesday
}

/**
 * Get default attendance status based on date
 * Wednesday = 'libur', other days = 'hadir'
 */
export function getDefaultAttendanceStatus(date: Date): 'libur' | 'hadir' {
  return isWednesday(date) ? 'libur' : 'hadir';
}

/**
 * Determine if check-in should be marked as overtime
 * Returns true if it's Wednesday (holiday) and employee is checking in
 */
export function shouldMarkAsOvertime(date: Date): boolean {
  return isWednesday(date);
}

/**
 * Get status for check-in based on date
 * Wednesday = 'lembur', other days = 'hadir'
 */
export function getCheckInStatus(date: Date): 'lembur' | 'hadir' {
  return isWednesday(date) ? 'lembur' : 'hadir';
}

/**
 * Get day name in Indonesian
 */
export function getDayName(date: Date): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[date.getDay()];
}
