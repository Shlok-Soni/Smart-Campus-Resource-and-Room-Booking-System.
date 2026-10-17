import { Booking } from '../types';

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
  conflictingBooking?: Booking;
}

/**
 * Format ISO datetime string to 12-hour clock time (e.g., "10:00 AM")
 */
export function formatTime12h(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    const parts = isoStr.split('T');
    return parts[1] || isoStr;
  }
}

/**
 * Validates slot logic, enforces Campus Operating Hours, Duration Limits,
 * Fair-Use Quotas, and checks for overlapping conflicts against active reservations.
 */
export function validateBookingRequest(
  resourceId: number,
  startTime: string,
  endTime: string,
  existingBookings: Booking[],
  userId?: number,
  excludeBookingId?: number
): ValidationResult {
  if (!resourceId || !startTime || !endTime) {
    return {
      isValid: false,
      errorMessage: 'Please select a resource, date, and valid time window.',
    };
  }

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);
  const now = new Date();

  // Rule 1: Valid date parsing
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return {
      isValid: false,
      errorMessage: 'Invalid date or time format provided.',
    };
  }

  // Rule 2: start_time < end_time
  if (startDate >= endDate) {
    return {
      isValid: false,
      errorMessage: 'Start time must be strictly before end time.',
    };
  }

  // Rule 3: Reject past dates (new_start < current_time)
  if (startDate < now) {
    return {
      isValid: false,
      errorMessage: 'Past date rejected: Reservations cannot be scheduled in the past.',
    };
  }

  // Rule 4: Operating Hours (between 08:00 AM and 08:00 PM)
  const startHour = startDate.getHours();
  const startMinute = startDate.getMinutes();
  const endHour = endDate.getHours();
  const endMinute = endDate.getMinutes();

  const startMinutesOfDay = startHour * 60 + startMinute;
  const endMinutesOfDay = endHour * 60 + endMinute;

  const openingMinutes = 8 * 60; // 08:00 AM = 480 mins
  const closingMinutes = 20 * 60; // 08:00 PM = 1200 mins

  if (startMinutesOfDay < openingMinutes || endMinutesOfDay > closingMinutes) {
    return {
      isValid: false,
      errorMessage: 'Operating hours violation: Bookings are restricted between 08:00 AM and 08:00 PM.',
    };
  }

  // Rule 5: Slot Duration Limits (Minimum 30 minutes, Maximum 4 hours)
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));

  if (durationMinutes < 30) {
    return {
      isValid: false,
      errorMessage: 'Slot limit violation: Minimum reservation duration is 30 minutes.',
    };
  }

  if (durationMinutes > 240) {
    return {
      isValid: false,
      errorMessage: 'Slot limit violation: Maximum reservation duration is 4 hours per session.',
    };
  }

  // Rule 6: Fair-Use Quota (Reject if current user already has 2 active bookings: Pending or Approved)
  if (userId) {
    const userActiveCount = existingBookings.filter((b) => {
      if (b.user_id !== userId) return false;
      if (excludeBookingId && b.id === excludeBookingId) return false;
      return b.status === 'Approved' || b.status === 'Pending';
    }).length;

    if (userActiveCount >= 2) {
      return {
        isValid: false,
        errorMessage: 'Fair-use quota exceeded: You already have 2 active bookings (Pending or Approved). Please wait for prior reservations to complete or cancel an existing request.',
      };
    }
  }

  // Rule 7: Time Overlap Validation Engine
  // Condition: (Booking.start_time < new_end) and (Booking.end_time > new_start)
  // Filter active conflicts: Booking.resource_id == resource_id and Booking.status in ['Approved', 'Pending']
  // Exclude self: Booking.id != excludeBookingId
  const conflict = existingBookings.find((b) => {
    if (b.resource_id !== resourceId) return false;
    if (excludeBookingId && b.id === excludeBookingId) return false;
    if (b.status !== 'Approved' && b.status !== 'Pending') return false;

    const bStart = new Date(b.start_time);
    const bEnd = new Date(b.end_time);

    return bStart < endDate && bEnd > startDate;
  });

  if (conflict) {
    const startStr = formatTime12h(conflict.start_time);
    const endStr = formatTime12h(conflict.end_time);
    return {
      isValid: false,
      conflictingBooking: conflict,
      errorMessage: `Slot clash: Already booked from ${startStr} to ${endStr} (Reservation #${conflict.id} - ${conflict.status}).`,
    };
  }

  return { isValid: true };
}

/**
 * Automatically calculates the next available free slot within operating hours (08:00 AM - 08:00 PM)
 * for a given resource and date, respecting slot limits and user quotas.
 */
export function findNextAvailableSlot(
  resourceId: number,
  bookDate: string,
  durationHours: number = 2,
  existingBookings: Booking[],
  userId?: number
): { startTime: string; endTime: string } | null {
  const startHour = 8;
  const endHour = 20;

  for (let hour = startHour; hour <= endHour - durationHours; hour++) {
    const sHourStr = hour.toString().padStart(2, '0') + ':00';
    const eHourStr = (hour + durationHours).toString().padStart(2, '0') + ':00';
    const sIso = `${bookDate}T${sHourStr}`;
    const eIso = `${bookDate}T${eHourStr}`;

    const check = validateBookingRequest(resourceId, sIso, eIso, existingBookings, userId);
    if (check.isValid) {
      return { startTime: sHourStr, endTime: eHourStr };
    }
  }

  // Check next day if current day is full
  const nextDay = new Date(bookDate);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().split('T')[0];

  for (let hour = startHour; hour <= endHour - durationHours; hour++) {
    const sHourStr = hour.toString().padStart(2, '0') + ':00';
    const eHourStr = (hour + durationHours).toString().padStart(2, '0') + ':00';
    const sIso = `${nextDayStr}T${sHourStr}`;
    const eIso = `${nextDayStr}T${eHourStr}`;

    const check = validateBookingRequest(resourceId, sIso, eIso, existingBookings, userId);
    if (check.isValid) {
      return { startTime: sHourStr, endTime: eHourStr };
    }
  }

  return null;
}

/**
 * Formats ISO date string nicely for display
 */
export function formatFriendlyDateTime(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoStr.replace('T', ' ');
  }
}
