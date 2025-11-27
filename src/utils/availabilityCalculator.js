import { format, parse, addMinutes, startOfDay, endOfDay, isWithinInterval, isBefore, isAfter, addDays, isSameDay } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

/**
 * Calculate available time slots based on calendar events and settings
 *
 * @param {Object} params
 * @param {Array} params.events - Calendar events from Google Calendar API
 * @param {Object} params.settings - User settings
 * @param {Object} params.formParams - Form parameters for this specific generation
 * @returns {Array} Array of days with available time slots
 */
export function calculateAvailability({
  events,
  settings,
  formParams,
}) {
  const {
    workingHoursStart,
    workingHoursEnd,
    workingHoursTimezone,
    workingDays,
    preBufferMinutes,
    postBufferMinutes,
    includeTentativeEvents,
  } = settings;

  const {
    meetingDuration,
    daysToShow,
    daysForward,
    slotSelection,
    selectedDays = workingDays,
  } = formParams;

  // Generate date range to scan
  const today = new Date();
  const endDate = addDays(today, daysForward);

  // Find all available days
  const availableDays = [];

  for (let i = 0; i < daysForward; i++) {
    const currentDate = addDays(today, i);
    const dayName = format(currentDate, 'EEEE').toLowerCase();

    // Skip if not a selected working day
    if (!selectedDays[dayName]) {
      continue;
    }

    // Get available time windows for this day
    const timeWindows = getAvailableTimeWindows({
      date: currentDate,
      events,
      workingHoursStart,
      workingHoursEnd,
      workingHoursTimezone,
      preBufferMinutes,
      postBufferMinutes,
      meetingDuration,
      includeTentativeEvents,
    });

    if (timeWindows.length > 0) {
      availableDays.push({
        date: currentDate,
        timeWindows,
      });
    }
  }

  // Apply slot selection method
  const selectedSlots = selectDays(availableDays, daysToShow, slotSelection);

  return selectedSlots;
}

/**
 * Get available time windows for a specific day
 */
function getAvailableTimeWindows({
  date,
  events,
  workingHoursStart,
  workingHoursEnd,
  workingHoursTimezone,
  preBufferMinutes,
  postBufferMinutes,
  meetingDuration,
  includeTentativeEvents,
}) {
  // Parse working hours in the working hours timezone
  const dayStart = parse(workingHoursStart, 'HH:mm', date);
  const dayEnd = parse(workingHoursEnd, 'HH:mm', date);

  // Convert to zoned time
  const zonedDayStart = toZonedTime(dayStart, workingHoursTimezone);
  const zonedDayEnd = toZonedTime(dayEnd, workingHoursTimezone);

  // Get all events for this day
  const dayEvents = events.filter((event) => {
    // Skip tentative events if setting is disabled
    if (!includeTentativeEvents && event.status === 'tentative') {
      return false;
    }

    // Parse event times
    const eventStart = event.start.dateTime
      ? new Date(event.start.dateTime)
      : new Date(event.start.date);
    const eventEnd = event.end.dateTime
      ? new Date(event.end.dateTime)
      : new Date(event.end.date);

    // Check if event overlaps with this day
    return (
      isSameDay(eventStart, date) ||
      isSameDay(eventEnd, date) ||
      (isBefore(eventStart, date) && isAfter(eventEnd, date))
    );
  });

  // Start with the full working day as one available window
  let availableWindows = [{ start: zonedDayStart, end: zonedDayEnd }];

  // Remove time blocked by events (with buffers)
  dayEvents.forEach((event) => {
    let eventStart = event.start.dateTime
      ? new Date(event.start.dateTime)
      : startOfDay(new Date(event.start.date));
    let eventEnd = event.end.dateTime
      ? new Date(event.end.dateTime)
      : endOfDay(new Date(event.end.date));

    // Apply buffers
    const bufferedStart = addMinutes(eventStart, -preBufferMinutes);
    const bufferedEnd = addMinutes(eventEnd, postBufferMinutes);

    // Remove this time from available windows
    availableWindows = subtractTimeBlock(availableWindows, bufferedStart, bufferedEnd);
  });

  // Filter windows that are long enough for the meeting
  const validWindows = availableWindows.filter((window) => {
    const durationMs = window.end - window.start;
    const durationMinutes = durationMs / (1000 * 60);
    return durationMinutes >= meetingDuration;
  });

  return validWindows;
}

/**
 * Subtract a time block from available windows
 */
function subtractTimeBlock(windows, blockStart, blockEnd) {
  const result = [];

  windows.forEach((window) => {
    // Case 1: Block doesn't overlap with window at all
    if (isAfter(blockStart, window.end) || isBefore(blockEnd, window.start)) {
      result.push(window);
      return;
    }

    // Case 2: Block completely covers window
    if (isBefore(blockStart, window.start) && isAfter(blockEnd, window.end)) {
      // Window is completely blocked, don't add it
      return;
    }

    // Case 3: Block overlaps start of window
    if (isBefore(blockStart, window.start) && isWithinInterval(blockEnd, { start: window.start, end: window.end })) {
      result.push({ start: blockEnd, end: window.end });
      return;
    }

    // Case 4: Block overlaps end of window
    if (isWithinInterval(blockStart, { start: window.start, end: window.end }) && isAfter(blockEnd, window.end)) {
      result.push({ start: window.start, end: blockStart });
      return;
    }

    // Case 5: Block is in the middle of window (splits it)
    if (isAfter(blockStart, window.start) && isBefore(blockEnd, window.end)) {
      result.push({ start: window.start, end: blockStart });
      result.push({ start: blockEnd, end: window.end });
      return;
    }

    // Default: keep the window
    result.push(window);
  });

  return result;
}

/**
 * Select days based on the slot selection method
 */
function selectDays(availableDays, daysToShow, method) {
  if (availableDays.length === 0) {
    return [];
  }

  // Limit to requested number
  const limit = Math.min(daysToShow, availableDays.length);

  switch (method) {
    case 'soonest':
      return availableDays.slice(0, limit);

    case 'every-other':
      const everyOther = [];
      for (let i = 0; i < availableDays.length && everyOther.length < limit; i += 2) {
        everyOther.push(availableDays[i]);
      }
      return everyOther;

    case 'random':
      const shuffled = [...availableDays].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, limit).sort((a, b) => a.date - b.date);

    default:
      return availableDays.slice(0, limit);
  }
}

/**
 * Format availability output as text
 */
export function formatAvailabilityText({
  availableDays,
  settings,
  formParams,
}) {
  const {
    displayTimezone,
    showDualTimezone,
    workingHoursTimezone,
    introText,
    calendarLinkFooter,
    includeCalendarLink,
    showFullDayAvailability,
    limitBlocksWhenNotFullDay,
  } = settings;

  if (availableDays.length === 0) {
    return 'No availability found.';
  }

  let output = introText + '\n\n';

  availableDays.forEach((day) => {
    const dateStr = format(day.date, 'EEEE, M/d');

    // Check if this is full-day availability
    const isFullDay = day.timeWindows.length === 1;
    const windows = showFullDayAvailability || !isFullDay
      ? day.timeWindows
      : day.timeWindows.slice(0, limitBlocksWhenNotFullDay);

    // Format time windows
    const timeRanges = windows.map((window, index) => {
      const startTime = formatTime(window.start, displayTimezone, showDualTimezone, workingHoursTimezone);
      const endTime = formatTime(window.end, displayTimezone, showDualTimezone, workingHoursTimezone);
      return `${startTime} - ${endTime}`;
    });

    // Join with commas and "or"
    let timeStr;
    if (timeRanges.length === 1) {
      timeStr = timeRanges[0];
    } else if (timeRanges.length === 2) {
      timeStr = timeRanges.join(' or ');
    } else {
      const lastRange = timeRanges.pop();
      timeStr = timeRanges.join(', ') + ', or ' + lastRange;
    }

    output += `* ${dateStr}, from ${timeStr}\n`;
  });

  if (includeCalendarLink && calendarLinkFooter) {
    const parsedFooter = parseMarkdownLinks(calendarLinkFooter);
    output += '\n' + parsedFooter;
  }

  return output;
}

/**
 * Parse markdown links in text and convert to plain text format
 * Converts [text](url) to "text: url" for email compatibility
 */
function parseMarkdownLinks(text) {
  // Match markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  return text.replace(markdownLinkRegex, (match, linkText, url) => {
    // If the link text is just "link" or similar, just return the URL
    if (linkText.toLowerCase().trim() === 'link' || linkText.toLowerCase().trim() === 'here') {
      return url;
    }
    // Otherwise format as "text: url"
    return `${linkText}: ${url}`;
  });
}

/**
 * Format a time with timezone
 */
function formatTime(date, displayTz, showDual, workingTz) {
  const zonedTime = toZonedTime(date, displayTz);
  const timeStr = format(zonedTime, 'h:mm a');
  const tzAbbr = getTimezoneAbbr(displayTz);

  if (!showDual || displayTz === workingTz) {
    return `${timeStr} ${tzAbbr}`;
  }

  // Show dual timezone
  const workingZonedTime = toZonedTime(date, workingTz);
  const workingTimeStr = format(workingZonedTime, 'h:mm a');
  const workingTzAbbr = getTimezoneAbbr(workingTz);

  return `${timeStr} ${tzAbbr} (${workingTimeStr} ${workingTzAbbr})`;
}

/**
 * Get timezone abbreviation
 */
function getTimezoneAbbr(timezone) {
  const tzMap = {
    'Pacific/Honolulu': 'HST',
    'America/Anchorage': 'AKST',
    'America/Los_Angeles': 'PST',
    'America/Denver': 'MST',
    'America/Chicago': 'CST',
    'America/New_York': 'EST',
    'Europe/London': 'GMT',
    'Europe/Paris': 'CET',
  };

  return tzMap[timezone] || 'UTC';
}
