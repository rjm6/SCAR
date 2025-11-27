import { useAuth } from '../contexts/AuthContext';
import { AvailabilityGenerator } from '../components/AvailabilityGenerator';

export const MainPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Generate Availability
          </h2>
          <p className="text-gray-600">
            Configure your parameters and generate copy-paste-ready availability text
          </p>
        </div>

        <AvailabilityGenerator />
      </div>
    </div>
  );
};
