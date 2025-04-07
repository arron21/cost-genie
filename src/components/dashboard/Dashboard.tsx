import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile, CostEntry, addCostEntry, db } from '../../firebase';
import { calculateAfterTaxIncome } from '../history/taxMap';
import { query, collection, where, getDocs, DocumentData } from 'firebase/firestore';
import FinancialRecommendations from '../recommendations/FinancialRecommendations';
import CostAnalysisDisplay from '../history/CostAnalysisDisplay';
import { calculateCost, CostAnalysis } from '../../utils/costUtils';

export default function Dashboard() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<CostEntry['frequency']>('monthly');
  const [costAnalysis, setCostAnalysis] = useState<CostAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [afterTaxIncome, setAfterTaxIncome] = useState<number | undefined>(undefined);
  const [favorite, setFavorite] = useState(false);
  const [need, setNeed] = useState(false);
  const [needsTotal, setNeedsTotal] = useState(0);
  const [needsCount, setNeedsCount] = useState(0);
  const [favoritesTotal, setFavoritesTotal] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [combinedPercentage, setCombinedPercentage] = useState(0);

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setFrequency('monthly');
    setFavorite(false);
    setNeed(false);
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!currentUser) {
          navigate('/login');
          return;
        }

        const profile = await getUserProfile(currentUser.uid);
        if (!profile) {
          navigate('/profile/setup');
          return;
        }

        setUserProfile(profile);
        setError(null);

        if (profile && profile.state) {
          const afterTax = calculateAfterTaxIncome(profile.state, profile.yearlySalary);
          setAfterTaxIncome(typeof afterTax === 'number' ? afterTax : undefined);
        }
      } catch (error) {
        setError('Unable to load your profile. Please check your internet connection.');
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [currentUser, navigate]);

  useEffect(() => {
    const loadFinancialOverview = async () => {
      if (!currentUser || !userProfile) return;
      
      try {
        // Fetch needs
        const needsQuery = query(
          collection(db, 'costs'),
          where('userId', '==', currentUser.uid),
          where('need', '==', true)
        );
        
        // Fetch favorites
        const favoritesQuery = query(
          collection(db, 'costs'),
          where('userId', '==', currentUser.uid),
          where('favorite', '==', true)
        );
        
        const [needsSnapshot, favoritesSnapshot] = await Promise.all([
          getDocs(needsQuery),
          getDocs(favoritesQuery)
        ]);
        
        const needsList = needsSnapshot.docs.map((doc: DocumentData) => ({
          ...doc.data(),
          id: doc.id
        }));
        
        const favoritesList = favoritesSnapshot.docs.map((doc: DocumentData) => ({
          ...doc.data(),
          id: doc.id
        }));
        
        // Calculate totals
        const calcYearlyTotal = (items: any[]) => {
          return items.reduce((total: number, item: any) => {
            const amount = Number(item.amount);
            switch(item.frequency) {
              case 'daily': return total + (amount * 365);
              case 'weekly': return total + (amount * 52);
              case 'monthly': return total + (amount * 12);
              case 'yearly': return total + amount;
              default: return total + amount;
            }
          }, 0);
        };
        
        const needsYearlyTotal = calcYearlyTotal(needsList);
        const favoritesYearlyTotal = calcYearlyTotal(favoritesList);
        const combinedTotal = needsYearlyTotal + favoritesYearlyTotal;
        
        setNeedsTotal(needsYearlyTotal);
        setNeedsCount(needsList.length);
        setFavoritesTotal(favoritesYearlyTotal);
        setFavoritesCount(favoritesList.length);
        
        // Calculate percentage of income
        const income = typeof afterTaxIncome === 'number' ? afterTaxIncome : userProfile.yearlySalary;
        setCombinedPercentage((combinedTotal / income) * 100);
        
      } catch (error) {
        console.error('Error loading financial overview:', error);
      }
    };
    
    loadFinancialOverview();
  }, [currentUser, userProfile, afterTaxIncome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !userProfile) return;

    try {
      const numAmount = Number(amount);
      // Pass after-tax income to calculateCost
      const analysis = calculateCost(numAmount, userProfile.yearlySalary, afterTaxIncome);
      setCostAnalysis(analysis);

      await addCostEntry({
        userId: currentUser.uid,
        amount: numAmount,
        description,
        frequency,
        favorite,
        need // Include need status
      });
      resetForm();
      setError(null);
    } catch (error) {
      setError('Failed to save cost entry. Please check your internet connection.');
      console.error('Error saving cost entry:', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!userProfile) {
    return <div className="text-center py-8">Profile not found. Please complete your profile setup.</div>;
  }

  // Define FinancialData interface
  interface FinancialData {
    income: {
      yearly: number;
      monthly: number;
      afterTax?: number;
    };
    spending: {
      needs: {
        total: number;
        percentage: number;
        count: number;
      };
      favorites: {
        total: number;
        percentage: number;
        count: number;
      };
      combined: {
        total: number;
        percentage: number;
      };
    };
  }

  // Get financial data for recommendations
  const getRecommendationsData = (): FinancialData | null => {
    if (!userProfile) return null;
    
    const income = typeof afterTaxIncome === 'number' ? afterTaxIncome : userProfile.yearlySalary;
    
    return {
      income: {
        yearly: userProfile.yearlySalary,
        monthly: userProfile.yearlySalary / 12,
        afterTax: afterTaxIncome || undefined
      },
      spending: {
        needs: {
          total: needsTotal,
          percentage: (needsTotal / income) * 100,
          count: needsCount
        },
        favorites: {
          total: favoritesTotal,
          percentage: (favoritesTotal / income) * 100,
          count: favoritesCount
        },
        combined: {
          total: needsTotal + favoritesTotal,
          percentage: combinedPercentage
        }
      }
    };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow px-5 py-6 sm:px-6">
          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}


          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 dark:text-white">Calculate Cost Impact</h2>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What are you spending money on?"
                  className="mt-1 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors duration-200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-7 p-2 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors duration-200"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as CostEntry['frequency'])}
                  className="mt-1 block p-2 w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors duration-200"
                >
                  <option value="once">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="space-y-3 mt-3 pt-4 border-t border-gray-200 dark:border-gray-700">

                
                <div className="flex items-center">
                  <div className=" p-1 rounded">
                    <input
                      type="radio"
                      id="favorite"
                      name="preference"
                      value="favorite"
                      checked={favorite}
                      onChange={() => {
                        setFavorite(true);
                        setNeed(false);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded dark:bg-gray-700 dark:border-transparent transition-colors duration-200"
                    />
                  </div>
                  <label htmlFor="favorite" className="ml-3 block text-sm text-gray-700 dark:text-gray-300">
                    Mark as Want
                  </label>
                </div>

                <div className="flex items-center">
                  <div className="p-1 rounded">
                    <input
                      type="radio"
                      id="need"
                      name="preference"
                      value="need"
                      checked={need}
                      onChange={() => {
                        setFavorite(false);
                        setNeed(true);
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded dark:bg-gray-700 dark:border-transparent transition-colors duration-200"
                    />
                  </div>
                  <label htmlFor="need" className="ml-3 block text-sm text-gray-700 dark:text-gray-300">
                    Mark as Need
                  </label>
                </div>
              </div>
              
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800 transition-colors duration-200"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Calculate Impact
                </button>
              </div>
            </form>
          </div>

          {userProfile && needsCount + favoritesCount > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/30 px-5 py-6 mb-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold mb-4 dark:text-white">Quick Financial Tips</h2>
              {getRecommendationsData() && (
                <FinancialRecommendations 
                  financialData={getRecommendationsData()!} 
                  compact={true}
                  maxRecommendations={3}
                />
              )}
              
              <div className="mt-4 text-right">
                <Link to="/summary" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 text-sm font-medium">
                  View full financial summary →
                </Link>
              </div>
            </div>
          )}

          {costAnalysis && (
            <div className="mt-8">
              <h3 className="text-xl font-bold mb-4 dark:text-white">Cost Analysis</h3>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                  Percentages are calculated based on your {afterTaxIncome !== undefined ? 'after-tax' : 'gross'} income.
                </p>
                <CostAnalysisDisplay
                  frequency={frequency}
                  costAnalysis={costAnalysis}
                  afterTaxIncome={afterTaxIncome}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}