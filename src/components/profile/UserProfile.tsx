import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { createUserProfile, getUserProfile } from '../../firebase';
import { getStateNames, calculateAfterTaxIncome } from '../history/taxMap';

export default function UserProfileSetup() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [yearlySalary, setYearlySalary] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [afterTaxIncome, setAfterTaxIncome] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const states = getStateNames();

  useEffect(() => {
    const loadProfile = async () => {
      if (!currentUser) return;
      
      try {
        const profile = await getUserProfile(currentUser.uid);
        if (profile) {
          setYearlySalary(profile.yearlySalary.toString());
          setSelectedState(profile.state || '');
          if (profile.state && profile.yearlySalary) {
            const afterTax = calculateAfterTaxIncome(profile.state, profile.yearlySalary);
            setAfterTaxIncome(afterTax);
          }
          navigate('/dashboard');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [currentUser, navigate]);

  // Calculate after-tax income when salary or state changes
  useEffect(() => {
    if (yearlySalary && selectedState) {
      const salary = Number(yearlySalary);
      if (!isNaN(salary) && salary > 0) {
        const afterTax = calculateAfterTaxIncome(selectedState, salary);
        setAfterTaxIncome(afterTax);
      } else {
        setAfterTaxIncome(null);
      }
    } else {
      setAfterTaxIncome(null);
    }
  }, [yearlySalary, selectedState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (!selectedState) {
      setError('Please select your state.');
      return;
    }

    try {
      setError('');
      await createUserProfile(currentUser, Number(yearlySalary), selectedState);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile. Please try again.');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your yearly salary and state to get started
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-600 text-center">{error}</div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="yearly-salary" className="block text-sm font-medium text-gray-700">
                Yearly Salary (Gross)
              </label>
              <input
                id="yearly-salary"
                name="salary"
                type="number"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Enter your yearly salary"
                value={yearlySalary}
                onChange={(e) => setYearlySalary(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State
              </label>
              <select
                id="state"
                name="state"
                required
                className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
              >
                <option value="">Select your state</option>
                {states.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            
            {afterTaxIncome !== null && (
              <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800">Estimated After-Tax Income:</h3>
                <p className="mt-1 text-lg font-bold text-blue-900">${afterTaxIncome.toFixed(2)}</p>
                <p className="mt-1 text-xs text-blue-600">
                  *This is a simplified estimate based on state income tax only.
                  Federal taxes, deductions, and credits are not included.
                </p>
              </div>
            )}
          </div>
          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Save Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

