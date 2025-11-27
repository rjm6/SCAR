import { GoogleLoginButton } from '../components/GoogleLoginButton';

export const LoginPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <svg
            className="mx-auto h-16 w-16 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Smart Availability Generator
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Generate copy-paste-ready availability text from your Google Calendar
          </p>
        </div>

        <div className="mt-8">
          <div className="flex flex-col items-center gap-4">
            <GoogleLoginButton />
            <p className="text-xs text-gray-500 text-center max-w-sm">
              By signing in, you allow this app to read your Google Calendar events.
              We never write to your calendar or access other data.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            How it works:
          </h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Connect your Google Calendar (read-only access)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Set your working hours and preferences</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Generate formatted availability text in seconds</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>Copy and paste into your emails</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
