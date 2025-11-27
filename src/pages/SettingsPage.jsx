import { Link } from 'react-router-dom';

export const SettingsPage = () => {
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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-900 mb-2">
              Settings Coming Soon
            </h3>
            <p className="text-sm text-yellow-700">
              Settings configuration will be implemented in the next phase.
              This will include:
            </p>
            <ul className="text-sm text-yellow-700 mt-2 space-y-1 ml-4">
              <li>• Default working hours</li>
              <li>• Working days selection</li>
              <li>• Default timezone</li>
              <li>• Meeting buffers</li>
              <li>• Calendar link footer</li>
              <li>• And more...</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
