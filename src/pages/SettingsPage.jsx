import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

// Timezone options (limited set as per PRD)
const TIMEZONES = [
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'America/Anchorage', label: 'Alaska (AKST)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PST/PDT)' },
  { value: 'America/Denver', label: 'Mountain (MST/MDT)' },
  { value: 'America/Chicago', label: 'Central (CST/CDT)' },
  { value: 'America/New_York', label: 'Eastern (EST/EDT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET)' },
];

// Time options for dropdowns (every 30 minutes)
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour % 12 === 0 ? 12 : hour % 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const timeLabel = `${h}:${String(minute).padStart(2, '0')} ${ampm}`;
      times.push({ value: timeValue, label: timeLabel });
    }
  }
  return times;
};

const TIME_OPTIONS = generateTimeOptions();

export const SettingsPage = () => {
  const { settings, updateSettings, resetSettings } = useSettings();
  const { accessToken } = useAuth();
  const [localSettings, setLocalSettings] = useState(settings);
  const [calendars, setCalendars] = useState([]);
  const [isLoadingCalendars, setIsLoadingCalendars] = useState(true);
  const [saveMessage, setSaveMessage] = useState('');

  // Load calendars on mount
  useEffect(() => {
    const loadCalendars = async () => {
      if (!accessToken) return;

      try {
        const { fetchCalendarList } = await import('../services/googleCalendar');
        const calList = await fetchCalendarList(accessToken);
        setCalendars(calList);

        // Auto-select primary calendar if no calendars selected yet
        if (settings.selectedCalendars.length === 0) {
          const primaryCal = calList.find((cal) => cal.primary);
          if (primaryCal) {
            handleChange('selectedCalendars', [primaryCal.id]);
          }
        }
      } catch (error) {
        console.error('Failed to load calendars:', error);
      } finally {
        setIsLoadingCalendars(false);
      }
    };

    loadCalendars();
  }, [accessToken]);

  // Sync local settings with context
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleChange = (key, value) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleWorkingDayChange = (day) => {
    setLocalSettings((prev) => ({
      ...prev,
      workingDays: {
        ...prev.workingDays,
        [day]: !prev.workingDays[day],
      },
    }));
  };

  const handleCalendarToggle = (calendarId) => {
    setLocalSettings((prev) => {
      const selected = prev.selectedCalendars || [];
      const isSelected = selected.includes(calendarId);

      return {
        ...prev,
        selectedCalendars: isSelected
          ? selected.filter((id) => id !== calendarId)
          : [...selected, calendarId],
      };
    });
  };

  const handleSave = () => {
    updateSettings(localSettings);
    setSaveMessage('Settings saved!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      resetSettings();
      setSaveMessage('Settings reset to defaults');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const setWeekdays = () => {
    setLocalSettings((prev) => ({
      ...prev,
      workingDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
    }));
  };

  const setAllDays = () => {
    setLocalSettings((prev) => ({
      ...prev,
      workingDays: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
        sunday: true,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Generator
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
            {saveMessage && (
              <span className="text-green-600 font-medium">{saveMessage}</span>
            )}
          </div>

          <div className="space-y-8">
            {/* Calendar Selection */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Calendar Selection
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Select which calendars to scan for availability
              </p>

              {isLoadingCalendars ? (
                <p className="text-gray-500">Loading calendars...</p>
              ) : (
                <div className="space-y-2">
                  {calendars.map((cal) => (
                    <label
                      key={cal.id}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={localSettings.selectedCalendars?.includes(cal.id)}
                        onChange={() => handleCalendarToggle(cal.id)}
                        className="w-4 h-4"
                      />
                      <span
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: cal.backgroundColor }}
                      />
                      <span className="text-gray-900">{cal.summary}</span>
                      {cal.primary && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          Primary
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </section>

            {/* Working Hours */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Working Hours
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time
                  </label>
                  <select
                    value={localSettings.workingHoursStart}
                    onChange={(e) => handleChange('workingHoursStart', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time
                  </label>
                  <select
                    value={localSettings.workingHoursEnd}
                    onChange={(e) => handleChange('workingHoursEnd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {TIME_OPTIONS.map((time) => (
                      <option key={time.value} value={time.value}>
                        {time.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={localSettings.workingHoursTimezone}
                    onChange={(e) => handleChange('workingHoursTimezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Working Days */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Working Days
              </h3>

              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={setWeekdays}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  Weekdays Only
                </button>
                <button
                  type="button"
                  onClick={setAllDays}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                >
                  All 7 Days
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                  (day) => (
                    <label
                      key={day}
                      className={`px-4 py-2 border-2 rounded-lg cursor-pointer transition-colors ${
                        localSettings.workingDays[day]
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={localSettings.workingDays[day]}
                        onChange={() => handleWorkingDayChange(day)}
                        className="hidden"
                      />
                      {day.charAt(0).toUpperCase()}
                    </label>
                  )
                )}
              </div>
            </section>

            {/* Meeting Buffers */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Meeting Buffers
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pre-Meeting Buffer (minutes)
                  </label>
                  <select
                    value={localSettings.preBufferMinutes}
                    onChange={(e) =>
                      handleChange('preBufferMinutes', parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {[0, 15, 30, 45, 60, 90, 120].map((min) => (
                      <option key={min} value={min}>
                        {min} minutes
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Post-Meeting Buffer (minutes)
                  </label>
                  <select
                    value={localSettings.postBufferMinutes}
                    onChange={(e) =>
                      handleChange('postBufferMinutes', parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {[0, 15, 30, 45, 60, 90, 120].map((min) => (
                      <option key={min} value={min}>
                        {min} minutes
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Display Settings */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Display Settings
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Display Times In
                  </label>
                  <select
                    value={localSettings.displayTimezone}
                    onChange={(e) => handleChange('displayTimezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md max-w-md"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={localSettings.showDualTimezone}
                    onChange={(e) => handleChange('showDualTimezone', e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">
                    Show dual timezone (e.g., "2:00 PM EST (11:00 AM PST)")
                  </span>
                </label>
              </div>
            </section>

            {/* Default Generation Settings */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Default Generation Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Meeting Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={localSettings.defaultMeetingDuration}
                    onChange={(e) =>
                      handleChange('defaultMeetingDuration', parseInt(e.target.value))
                    }
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days to Show
                  </label>
                  <input
                    type="number"
                    value={localSettings.defaultDaysToShow}
                    onChange={(e) =>
                      handleChange('defaultDaysToShow', parseInt(e.target.value))
                    }
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days Forward to Scan
                  </label>
                  <input
                    type="number"
                    value={localSettings.defaultDaysForward}
                    onChange={(e) =>
                      handleChange('defaultDaysForward', parseInt(e.target.value))
                    }
                    min="1"
                    max="90"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slot Selection Method
                  </label>
                  <select
                    value={localSettings.defaultSlotSelection}
                    onChange={(e) => handleChange('defaultSlotSelection', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="soonest">Soonest available days</option>
                    <option value="every-other">Every other day</option>
                    <option value="random">Random selection</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Output Customization */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Output Customization
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intro Text
                  </label>
                  <input
                    type="text"
                    value={localSettings.introText}
                    onChange={(e) => handleChange('introText', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="How's your schedule in the coming weeks?"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={localSettings.includeCalendarLink}
                      onChange={(e) =>
                        handleChange('includeCalendarLink', e.target.checked)
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Include Calendar Link Footer
                    </span>
                  </label>

                  {localSettings.includeCalendarLink && (
                    <textarea
                      value={localSettings.calendarLinkFooter}
                      onChange={(e) => handleChange('calendarLinkFooter', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      rows="2"
                      placeholder="Here's my calendar link if that works better for you."
                    />
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Supports markdown links: [link text](url)
                  </p>
                </div>
              </div>
            </section>

            {/* Advanced Options */}
            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Advanced Options
              </h3>

              <div className="space-y-4">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={localSettings.showFullDayAvailability}
                    onChange={(e) =>
                      handleChange('showFullDayAvailability', e.target.checked)
                    }
                    className="w-4 h-4 mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      If free all day, show full availability
                    </span>
                    <p className="text-xs text-gray-500">
                      When enabled, displays single time range for full-day availability
                    </p>
                  </div>
                </label>

                {!localSettings.showFullDayAvailability && (
                  <div className="ml-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Limit to first X blocks
                    </label>
                    <input
                      type="number"
                      value={localSettings.limitBlocksWhenNotFullDay}
                      onChange={(e) =>
                        handleChange('limitBlocksWhenNotFullDay', parseInt(e.target.value))
                      }
                      min="1"
                      max="10"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}

                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={localSettings.includeTentativeEvents}
                    onChange={(e) =>
                      handleChange('includeTentativeEvents', e.target.checked)
                    }
                    className="w-4 h-4 mt-1"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Include tentative events as busy time
                    </span>
                    <p className="text-xs text-gray-500">
                      When enabled, tentative calendar events will block availability
                    </p>
                  </div>
                </label>
              </div>
            </section>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Reset to Defaults
              </button>

              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
