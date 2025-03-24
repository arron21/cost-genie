import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, toggleCostFavorite, deleteCostEntry } from '../../firebase';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../../firebase';
import { Link } from 'react-router-dom';
import { calculateAfterTaxIncome } from '../history/taxMap';

interface CostRecord {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  userId: string;
  favorite?: boolean;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

interface CostAnalysis {
  oneTime: {
    amount: number;
    percentage: number;
  };
  weekly: {
    amount: number;
    percentage: number;
  };
  monthly: {
    amount: number;
    percentage: number;
  };
  everyFourMonths: {
    amount: number;
    percentage: number;
  };
  yearly: {
    amount: number;
    percentage: number;
  };
}

function calculateCost(amount: number, yearlySalary: number): CostAnalysis {
  // Calculate costs for different frequencies
  const oneTimeAmount = amount;
  const weeklyAmount = amount * 52;  // 52 weeks in a year
  const monthlyAmount = amount * 12; // 12 months in a year
  const everyFourMonthsAmount = amount * 3; // 3 times per year (every 4 months)
  const yearlyAmount = monthlyAmount; // Same as monthly amount * 12

  // Calculate percentages of yearly salary
  const oneTimePercentage = (oneTimeAmount / yearlySalary) * 100;
  const weeklyPercentage = (weeklyAmount / yearlySalary) * 100;
  const monthlyPercentage = (monthlyAmount / yearlySalary) * 100;
  const everyFourMonthsPercentage = (everyFourMonthsAmount / yearlySalary) * 100;
  const yearlyPercentage = (yearlyAmount / yearlySalary) * 100;

  return {
    oneTime: {
      amount: oneTimeAmount,
      percentage: oneTimePercentage
    },
    weekly: {
      amount: weeklyAmount,
      percentage: weeklyPercentage
    },
    monthly: {
      amount: monthlyAmount,
      percentage: monthlyPercentage
    },
    everyFourMonths: {
      amount: everyFourMonthsAmount,
      percentage: everyFourMonthsPercentage
    },
    yearly: {
      amount: yearlyAmount,
      percentage: yearlyPercentage
    }
  };
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [expandedCostId, setExpandedCostId] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const [totalYearlyCost, setTotalYearlyCost] = useState<number>(0);
  const [salaryPercentage, setSalaryPercentage] = useState<number>(0);
  const [afterTaxIncome, setAfterTaxIncome] = useState<number | null>(null);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch user profile to get salary for percentage calculations
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        
        // Calculate after-tax income if state is available
        if (profile && profile.state) {
          const afterTax = calculateAfterTaxIncome(profile.state, profile.yearlySalary);
          setAfterTaxIncome(afterTax);
        }
        
        const costsRef = collection(db, 'costs');
        const q = query(
          costsRef,
          where('userId', '==', currentUser.uid),
          where('favorite', '==', true),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const favoritesList: CostRecord[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt.toDate()
        })) as CostRecord[];
        
        setFavorites(favoritesList);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [currentUser]);

  // Calculate total yearly cost of all favorites
  useEffect(() => {
    if (!userProfile || favorites.length === 0) return;
    
    const calculateTotalYearlyCost = () => {
      let total = 0;
      
      favorites.forEach(cost => {
        switch (cost.frequency) {
          case 'once':
            total += cost.amount;
            break;
          case 'daily':
            total += cost.amount * 365;
            break;
          case 'weekly':
            total += cost.amount * 52;
            break;
          case 'monthly':
            total += cost.amount * 12;
            break;
          case 'yearly':
            total += cost.amount;
            break;
        }
      });
      
      setTotalYearlyCost(total);
    if (afterTaxIncome !== null) {
      setSalaryPercentage((total / afterTaxIncome) * 100);
    }
    };
    
    calculateTotalYearlyCost();
  }, [favorites, userProfile]);

  const handleToggleFavorite = async (costId: string, currentFavorite: boolean = true) => {
    if (!currentUser) return;
    
    try {
      await toggleCostFavorite(costId, !currentFavorite);
      // If unfavorited, remove from favorites list
      if (currentFavorite) {
        setFavorites(prev => prev.filter(cost => cost.id !== costId));
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };
  
  const handleDelete = async (costId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the item when clicking delete
    
    if (!currentUser || deleteInProgress) return;
    
    // Simple confirmation
    if (!window.confirm('Are you sure you want to delete this cost entry?')) {
      return;
    }
    
    try {
      setDeleteInProgress(costId);
      await deleteCostEntry(costId);
      
      // Remove the deleted cost from local state
      setFavorites(prev => prev.filter(cost => cost.id !== costId));
      
      // If the deleted cost was expanded, collapse it
      if (expandedCostId === costId) {
        setExpandedCostId(null);
      }
    } catch (error) {
      console.error('Error deleting cost entry:', error);
      alert('Failed to delete cost entry. Please try again.');
    } finally {
      setDeleteInProgress(null);
    }
  };
  
  const toggleExpand = (costId: string) => {
    if (expandedCostId === costId) {
      setExpandedCostId(null);
    } else {
      setExpandedCostId(costId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Favorites</h1>
      
      {favorites.length > 0 && userProfile && (
        <div className="bg-white rounded-lg shadow p-5 mb-6 border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Total Cost Impact</h2>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div>
              <p className="text-sm text-gray-500">Yearly Total</p>
              <p className="text-xl font-bold text-blue-700">${totalYearlyCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Monthly Average</p>
              <p className="text-xl font-bold text-blue-700">${(totalYearlyCost / 12).toFixed(2)}</p>
            </div>
            {afterTaxIncome !== null && (
              <div>
                <p className="text-sm text-gray-500">After-Tax Income (State)</p>
                <p className="text-xl font-bold text-blue-700">${afterTaxIncome.toLocaleString()}</p>
              </div>
            )}
            <div className="md:ml-auto">
              <p className="text-sm text-gray-500">Percentage of Income</p>
              <div className="flex items-center">
                <p className="text-xl font-bold text-blue-700">{salaryPercentage.toFixed(1)}%</p>
                <div className="ml-2 h-4 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${salaryPercentage > 20 ? 'bg-red-500' : 'bg-green-500'}`} 
                    style={{ width: `${Math.min(100, salaryPercentage)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          {salaryPercentage > 20 && (
            <p className="mt-3 text-sm text-red-600">
              <svg className="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              These favorites represent over 20% of your yearly income
            </p>
          )}
        </div>
      )}
      
      {favorites.length === 0 ? (
        <div className="text-center mt-8">
          <p className="text-gray-500 mb-4">No favorite items yet</p>
          <Link 
            to="/history" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Go to history to mark items as favorites
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((cost) => {
            const costAnalysis = userProfile ? calculateCost(cost.amount, userProfile.yearlySalary) : null;
            const isExpanded = expandedCostId === cost.id;
            const isDeleting = deleteInProgress === cost.id;
            
            return (
              <div
                key={cost.id}
                className={`bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400 ${isDeleting ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(cost.id)}>
                  <div className="flex items-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(cost.id, cost.favorite);
                      }}
                      className="mr-1 focus:outline-none"
                      disabled={isDeleting}
                    >
                      <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(cost.id, e)}
                      className="mr-2 focus:outline-none text-gray-400 hover:text-red-500"
                      disabled={isDeleting}
                      aria-label="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <div>
                      <h3 className="font-medium">{cost.description}</h3>
                      <div className="flex items-center text-sm text-gray-500 mt-1">
                        <span>{cost.frequency}</span>
                        <span className="mx-2">•</span>
                        <span>{cost.date.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 font-medium mr-2">
                      ${cost.amount.toFixed(2)}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {isExpanded && costAnalysis && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Cost Analysis</h4>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">One-time Cost</p>
                          <p className="text-sm font-semibold">
                            ${costAnalysis.oneTime.amount.toFixed(2)}
                            <span className="text-xs text-gray-600 ml-1">
                              ({costAnalysis.oneTime.percentage.toFixed(1)}% of yearly income)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Weekly Cost (yearly)</p>
                          <p className="text-sm font-semibold">
                            ${costAnalysis.weekly.amount.toFixed(2)}
                            <span className="text-xs text-gray-600 ml-1">
                              ({costAnalysis.weekly.percentage.toFixed(1)}% of yearly income)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Monthly Cost (yearly)</p>
                          <p className="text-sm font-semibold">
                            ${costAnalysis.monthly.amount.toFixed(2)}
                            <span className="text-xs text-gray-600 ml-1">
                              ({costAnalysis.monthly.percentage.toFixed(1)}% of yearly income)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Every 4 Months Cost (yearly)</p>
                          <p className="text-sm font-semibold">
                            ${costAnalysis.everyFourMonths.amount.toFixed(2)}
                            <span className="text-xs text-gray-600 ml-1">
                              ({costAnalysis.everyFourMonths.percentage.toFixed(1)}% of yearly income)
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Favorites;
