import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStateNames, calculateAfterTaxIncome } from '../history/taxMap';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, updateUserProfile, UserProfile } from '../../firebase';
import { auth } from '../../firebase'; // Import Firebase auth directly

const Settings = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    defaultState: '',
    theme: 'light',
    showTaxDetails: true,
    saveHistory: true
  });
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedState, setSelectedState] = useState('');
  const [afterTaxIncome, setAfterTaxIncome] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const states = getStateNames();

  useEffect(() => {
    // Load user profile from Firebase
    const loadUserProfile = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        
        if (profile && profile.state) {
          setSelectedState(profile.state);
          
          if (profile.yearlySalary) {
            const afterTax = calculateAfterTaxIncome(profile.state, profile.yearlySalary);
            setAfterTaxIncome(afterTax);
          }
        }
        
        // Load local settings from localStorage
        const savedSettings = localStorage.getItem('costGenieSettings');
        if (savedSettings) {
          setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Failed to load your profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadUserProfile();
  }, [currentUser]);
  
  // Update after-tax income when state changes
  useEffect(() => {
    if (userProfile && selectedState && userProfile.yearlySalary) {
      const afterTax = calculateAfterTaxIncome(selectedState, userProfile.yearlySalary);
      setAfterTaxIncome(afterTax);
    }
  }, [selectedState, userProfile]);

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings({
      ...settings,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleStateChange = (e) => {
    setSelectedState(e.target.value);
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
    // Save to localStorage
    localStorage.setItem('costGenieSettings', JSON.stringify(settings));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };
  
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;
    
    try {
      setLoading(true);
      setSaveSuccess(false);
      setError(null);
      
      // Update user state in Firebase
      await updateUserProfile(currentUser.uid, {
        state: selectedState
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update your profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // First, try to use the contextual logout
      if (logout) {
        await logout();
      }
      
      // Then explicitly sign out with Firebase auth as a fallback
      await auth.signOut();
      
      // Navigate to login page
      navigate('/login');
    } catch (err) {
      setError('Failed to log out. Please try again.');
      console.error('Error logging out:', err);
    }
  };

  if (loading && !userProfile) {
    return <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>;
  }

  // Calculate tax savings and percentage
  const taxSavings = userProfile && afterTaxIncome ? userProfile.yearlySalary - afterTaxIncome : null;
  const taxPercentage = taxSavings && userProfile ? (taxSavings / userProfile.yearlySalary) * 100 : null;

  return (
    <div className="max-w-3xl mx-auto p-5 bg-gray-100 rounded-lg shadow-md dark:bg-gray-800 dark:text-gray-200">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Settings</h2>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition duration-300"
          aria-label="Log out from your account"
        >
          Logout
        </button>
      </div>
      
      {saveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">Settings saved successfully!</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Income Summary Card */}
      {userProfile && (
        <div className="mb-8 p-5 bg-white rounded-lg shadow-sm dark:bg-gray-700">
          <h3 className="text-xl font-semibold mb-4 dark:text-gray-300">Your Income Summary</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg dark:bg-gray-800">
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400">Gross Yearly Income</h4>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${userProfile.yearlySalary.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                ${(userProfile.yearlySalary / 12).toLocaleString()} monthly
              </p>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg dark:bg-blue-900">
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">
                After-Tax Income ({userProfile.state || "No state selected"})
              </h4>
              {afterTaxIncome ? (
                <>
                  <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                    ${afterTaxIncome.toLocaleString()}
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
                    ${(afterTaxIncome / 12).toLocaleString()} monthly
                  </p>
                </>
              ) : (
                <p className="text-lg font-medium text-blue-700 dark:text-blue-300">
                  Select a state to calculate
                </p>
              )}
            </div>
          </div>
          
          {taxSavings && taxPercentage && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md text-gray-800 dark:bg-gray-800 dark:text-gray-200">
              <p className="text-sm">
                <span className="font-medium">State Tax Impact:</span> You pay approximately ${taxSavings.toLocaleString()} 
                in state taxes ({taxPercentage.toFixed(1)}% of your income)
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                *Estimate based on state income tax only. Federal taxes and other deductions not included.
              </p>
            </div>
          )}
        </div>
      )}
      
      {/* Profile Update Section */}
      <div className="mb-8 p-5 bg-white rounded-lg shadow-sm dark:bg-gray-700">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-300">Update Your State</h3>
        
        <form onSubmit={handleProfileSubmit}>
          <div className="mb-4">
            <label htmlFor="userState" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your State
            </label>
            <select 
              id="userState" 
              name="userState" 
              value={selectedState} 
              onChange={handleStateChange}
              className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select a state</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          
          <button 
            type="submit" 
            className="mt-4 bg-blue-600 text-white py-2 px-4 rounded cursor-pointer text-base transition duration-300 hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save State Change'}
          </button>
        </form>
      </div>
      
      {/* Application Settings Section */}
      <div className="mb-8 border-b border-gray-200 pb-5 dark:border-gray-700">
        <h3 className="text-xl font-semibold mb-4 dark:text-gray-300">Application Preferences</h3>
        
        <form onSubmit={handleSettingsSubmit}>
          <div className="flex items-center mb-4">
            <label htmlFor="defaultState" className="w-36 font-medium dark:text-gray-300">Default State:</label>
            <select 
              id="defaultState" 
              name="defaultState" 
              value={settings.defaultState} 
              onChange={handleSettingsChange}
              className="p-2 border border-gray-300 rounded w-64 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
            >
              <option value="">Select a default state</option>
              {states.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center mb-4">
            <label htmlFor="theme" className="w-36 font-medium dark:text-gray-300">Theme:</label>
            <select 
              id="theme" 
              name="theme" 
              value={settings.theme} 
              onChange={handleSettingsChange}
              className="p-2 border border-gray-300 rounded w-64 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System Default</option>
            </select>
          </div>
          
          <div className="flex items-center mb-4">
            <input 
              type="checkbox" 
              id="showTaxDetails" 
              name="showTaxDetails" 
              checked={settings.showTaxDetails} 
              onChange={handleSettingsChange}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="showTaxDetails" className="font-medium dark:text-gray-300">Show detailed tax breakdown</label>
          </div>
          
          <div className="flex items-center mb-4">
            <input 
              type="checkbox" 
              id="saveHistory" 
              name="saveHistory" 
              checked={settings.saveHistory} 
              onChange={handleSettingsChange}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="saveHistory" className="font-medium dark:text-gray-300">Save calculation history</label>
          </div>
          
          <button 
            type="submit" 
            className="bg-green-500 text-white py-2 px-4 rounded cursor-pointer text-base transition duration-300 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
          >
            Save App Settings
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
