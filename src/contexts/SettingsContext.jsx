import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext(null);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
};

// Default settings based on PRD
const DEFAULT_SETTINGS = {
  // Working hours
  workingHoursStart: '09:00',
  workingHoursEnd: '17:00',
  workingHoursTimezone: 'America/New_York',

  // Working days (true = working day)
  workingDays: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  },

  // Display settings
  displayTimezone: 'America/New_York',
  showDualTimezone: false,

  // Meeting settings
  defaultMeetingDuration: 30,
  preBufferMinutes: 15,
  postBufferMinutes: 15,

  // Generation defaults
  defaultDaysToShow: 5,
  defaultDaysForward: 14,
  defaultSlotSelection: 'soonest', // soonest, every-other, random

  // Advanced options
  showFullDayAvailability: true,
  limitBlocksWhenNotFullDay: 3,

  // Calendar settings
  selectedCalendars: [], // Array of calendar IDs to scan
  includeTentativeEvents: false,

  // Output customization
  introText: "How's your schedule in the coming weeks? Let me know if any of the times below work for you:",
  calendarLinkFooter: "Here's my calendar link if that works better for you.",
  includeCalendarLink: true,
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('availability_generator_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save settings to localStorage whenever they change
  const updateSettings = (newSettings) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    try {
      localStorage.setItem('availability_generator_settings', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('availability_generator_settings');
  };

  const value = {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};
