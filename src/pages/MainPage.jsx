import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const MainPage = () => {
  const { user, accessToken } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const testCalendarConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const { testCalendarAccess } = await import('../services/googleCalendar');

      if (!accessToken) {
        setTestResult({ success: false, error: 'No access token available' });
        setIsLoading(false);
        return;
      }

      const result = await testCalendarAccess(accessToken);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome, {user?.name}!
            </h2>
            <p className="text-gray-600">
              Your calendar is connected. The availability generator is being built.
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                Test Calendar Connection
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                Click the button below to test if we can access your Google Calendar.
              </p>
              <button
                onClick={testCalendarConnection}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Testing...' : 'Test Calendar Access'}
              </button>

              {testResult && (
                <div className="mt-4 p-4 bg-white rounded border">
                  {testResult.success ? (
                    <div className="text-green-700">
                      <p className="font-semibold">Success!</p>
                      <p className="text-sm mt-1">
                        Found {testResult.calendarsCount} calendar(s)
                      </p>
                      {testResult.calendars && (
                        <ul className="mt-2 text-sm space-y-1">
                          {testResult.calendars.map((cal) => (
                            <li key={cal.id} className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cal.backgroundColor }}
                              />
                              {cal.summary}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-700">
                      <p className="font-semibold">Error</p>
                      <p className="text-sm mt-1">{testResult.error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">
                Coming Soon
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Availability generation form</li>
                <li>• Working hours configuration</li>
                <li>• Buffer settings</li>
                <li>• Timezone conversion</li>
                <li>• Copy-paste output</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
