/**
 * Google Calendar API Service
 * Handles all interactions with Google Calendar API
 */

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

/**
 * Fetch user's calendar list
 */
export async function fetchCalendarList(accessToken) {
  try {
    const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch calendars: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error('Error fetching calendar list:', error);
    throw error;
  }
}

/**
 * Fetch events from specified calendars within a date range
 * @param {string} accessToken - Google OAuth access token
 * @param {string[]} calendarIds - Array of calendar IDs to fetch from
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 */
export async function fetchCalendarEvents(
  accessToken,
  calendarIds,
  startDate,
  endDate
) {
  try {
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();

    // Fetch events from all selected calendars in parallel
    const eventPromises = calendarIds.map((calendarId) =>
      fetchEventsFromCalendar(accessToken, calendarId, timeMin, timeMax)
    );

    const eventsArrays = await Promise.all(eventPromises);

    // Flatten and combine all events
    const allEvents = eventsArrays.flat();

    // Filter out declined and cancelled events
    const validEvents = allEvents.filter((event) => {
      // Skip declined events
      if (
        event.attendees &&
        event.attendees.some(
          (attendee) =>
            attendee.self &&
            attendee.responseStatus === 'declined'
        )
      ) {
        return false;
      }

      // Skip cancelled events
      if (event.status === 'cancelled') {
        return false;
      }

      return true;
    });

    return validEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Fetch events from a single calendar
 */
async function fetchEventsFromCalendar(
  accessToken,
  calendarId,
  timeMin,
  timeMax
) {
  const url = new URL(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`);
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');
  url.searchParams.append('maxResults', '2500');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch events from calendar ${calendarId}: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Test calendar API access
 */
export async function testCalendarAccess(accessToken) {
  try {
    const calendars = await fetchCalendarList(accessToken);
    return {
      success: true,
      calendarsCount: calendars.length,
      calendars,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
