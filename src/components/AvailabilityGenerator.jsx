import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { calculateAvailability, formatAvailabilityText } from '../utils/availabilityCalculator';
import { fetchCalendarEvents } from '../services/googleCalendar';
import { addDays } from 'date-fns';

// Timezone options
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

// Time options (every 30 minutes)
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

export const AvailabilityGenerator = () => {
  const { settings } = useSettings();
  const { accessToken } = useAuth();

  // Form state - initialized from settings
  const [formParams, setFormParams] = useState({
    meetingDuration: settings.defaultMeetingDuration,
    daysToShow: settings.defaultDaysToShow,
    daysForward: settings.defaultDaysForward,
    slotSelection: settings.defaultSlotSelection,
    selectedDays: settings.workingDays,
    workingHoursStart: settings.workingHoursStart,
    workingHoursEnd: settings.workingHoursEnd,
    workingHoursTimezone: settings.workingHoursTimezone,
    displayTimezone: settings.displayTimezone,
    preBufferMinutes: settings.preBufferMinutes,
    postBufferMinutes: settings.postBufferMinutes,
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleChange = (key, value) => {
    setFormParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleDayToggle = (day) => {
    setFormParams((prev) => ({
      ...prev,
      selectedDays: {
        ...prev.selectedDays,
        [day]: !prev.selectedDays[day],
      },
    }));
  };

  const setWeekdays = () => {
    setFormParams((prev) => ({
      ...prev,
      selectedDays: {
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
    setFormParams((prev) => ({
      ...prev,
      selectedDays: {
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError('');
    setOutput('');

    try {
      // Validate numeric fields
      if (!formParams.meetingDuration || formParams.meetingDuration <= 0) {
        throw new Error('Meeting duration must be greater than 0');
      }

      if (!formParams.daysToShow || formParams.daysToShow <= 0 || formParams.daysToShow > 20) {
        throw new Error('Days to show must be between 1 and 20');
      }

      if (!formParams.daysForward || formParams.daysForward <= 0 || formParams.daysForward > 90) {
        throw new Error('Days forward to scan must be between 1 and 90');
      }

      const selectedDayCount = Object.values(formParams.selectedDays).filter(Boolean).length;
      if (selectedDayCount === 0) {
        throw new Error('Please select at least one day of the week');
      }

      if (!settings.selectedCalendars || settings.selectedCalendars.length === 0) {
        throw new Error('Please select at least one calendar in Settings');
      }

      // Fetch calendar events
      const startDate = new Date();
      const endDate = addDays(startDate, formParams.daysForward);

      const events = await fetchCalendarEvents(
        accessToken,
        settings.selectedCalendars,
        startDate,
        endDate
      );

      // Calculate availability
      const availableDays = calculateAvailability({
        events,
        settings: {
          ...settings,
          workingHoursStart: formParams.workingHoursStart,
          workingHoursEnd: formParams.workingHoursEnd,
          workingHoursTimezone: formParams.workingHoursTimezone,
          preBufferMinutes: formParams.preBufferMinutes,
          postBufferMinutes: formParams.postBufferMinutes,
        },
        formParams: {
          ...formParams,
        },
      });

      // Format output
      const formattedText = formatAvailabilityText({
        availableDays,
        settings: {
          ...settings,
          displayTimezone: formParams.displayTimezone,
        },
        formParams,
      });

      setOutput(formattedText);

      // Save to history
      saveToHistory(formattedText);

      // Show warning if fewer days found than requested
      if (availableDays.length < formParams.daysToShow && availableDays.length > 0) {
        setError(
          `Only found ${availableDays.length} day(s) with availability in the next ${formParams.daysForward} days. Want to expand the date range?`
        );
      } else if (availableDays.length === 0) {
        setError(
          `No availability found in the next ${formParams.daysForward} days with your current settings. Try increasing "Days forward to scan" or adjusting your working hours.`
        );
      }
    } catch (err) {
      console.error('Error generating availability:', err);
      setError(err.message || 'Failed to generate availability. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveToHistory = (text) => {
    try {
      const history = JSON.parse(localStorage.getItem('availability_history') || '[]');
      const newEntry = {
        timestamp: new Date().toISOString(),
        text,
        preview: text.substring(0, 50),
      };

      // Keep only last 5
      const updated = [newEntry, ...history].slice(0, 5);
      localStorage.setItem('availability_history', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save to history:', error);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = output;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Generation Parameters
        </h3>

        {/* Meeting Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Duration (minutes) *
          </label>
          <input
            type="number"
            value={formParams.meetingDuration}
            onChange={(e) => handleChange('meetingDuration', e.target.value === '' ? '' : parseInt(e.target.value))}
            min="1"
            className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Days to Show & Days Forward */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Days to Show *
            </label>
            <input
              type="number"
              value={formParams.daysToShow}
              onChange={(e) => handleChange('daysToShow', e.target.value === '' ? '' : parseInt(e.target.value))}
              min="1"
              max="20"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days Forward to Scan *
            </label>
            <input
              type="number"
              value={formParams.daysForward}
              onChange={(e) => handleChange('daysForward', e.target.value === '' ? '' : parseInt(e.target.value))}
              min="1"
              max="90"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
        </div>

        {/* Slot Selection Method */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Slot Selection Method *
          </label>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="soonest"
                checked={formParams.slotSelection === 'soonest'}
                onChange={(e) => handleChange('slotSelection', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Show soonest available days</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="every-other"
                checked={formParams.slotSelection === 'every-other'}
                onChange={(e) => handleChange('slotSelection', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">
                Show every other day (skip one calendar day between selections)
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="random"
                checked={formParams.slotSelection === 'random'}
                onChange={(e) => handleChange('slotSelection', e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">
                Show random selection across date range
              </span>
            </label>
          </div>
        </div>

        {/* Working Days */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Which Days of Week *
          </label>

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
                    formParams.selectedDays[day]
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formParams.selectedDays[day]}
                    onChange={() => handleDayToggle(day)}
                    className="hidden"
                  />
                  {day.charAt(0).toUpperCase()}
                </label>
              )
            )}
          </div>
        </div>

        {/* Working Hours */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Your Working Hours *
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start Time</label>
              <select
                value={formParams.workingHoursStart}
                onChange={(e) => handleChange('workingHoursStart', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">End Time</label>
              <select
                value={formParams.workingHoursEnd}
                onChange={(e) => handleChange('workingHoursEnd', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time.value} value={time.value}>
                    {time.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Timezone</label>
              <select
                value={formParams.workingHoursTimezone}
                onChange={(e) => handleChange('workingHoursTimezone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Display Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Display Times In *
          </label>
          <select
            value={formParams.displayTimezone}
            onChange={(e) => handleChange('displayTimezone', e.target.value)}
            className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-md"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>

        {/* Meeting Buffers */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Meeting Buffers
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Pre-Meeting Buffer
              </label>
              <select
                value={formParams.preBufferMinutes}
                onChange={(e) =>
                  handleChange('preBufferMinutes', parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {[0, 15, 30, 45, 60, 90, 120].map((min) => (
                  <option key={min} value={min}>
                    {min} minutes
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Post-Meeting Buffer
              </label>
              <select
                value={formParams.postBufferMinutes}
                onChange={(e) =>
                  handleChange('postBufferMinutes', parseInt(e.target.value))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {[0, 15, 30, 45, 60, 90, 120].map((min) => (
                  <option key={min} value={min}>
                    {min} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="border-t pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <svg
              className={`w-4 h-4 transition-transform ${
                showAdvanced ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            Advanced Options
          </button>

          {showAdvanced && (
            <div className="mt-4 pl-6 space-y-4">
              <p className="text-sm text-gray-600">
                Advanced options are configured in Settings. These include:
              </p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Full-day availability display</li>
                <li>• Tentative event handling</li>
                <li>• Intro text customization</li>
                <li>• Calendar link footer</li>
              </ul>
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div>
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isGenerating ? 'Generating...' : 'Generate Availability'}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">{error}</p>
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Availability
            </h3>
            <button
              onClick={handleCopy}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              {copySuccess ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>

          <textarea
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            rows={12}
            className="w-full px-4 py-3 border border-gray-300 rounded-md font-mono text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your availability will appear here..."
          />
        </div>
      )}
    </div>
  );
};
