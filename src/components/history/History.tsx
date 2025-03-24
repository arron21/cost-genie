import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, toggleCostFavorite, deleteCostEntry, toggleCostNeed, updateCostEntry } from '../../firebase';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../../firebase';
import { calculateAfterTaxIncome } from '../history/taxMap';

interface CostRecord {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  userId: string;
  favorite?: boolean;
  need?: boolean;
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

// Update the function to optionally use afterTaxIncome
function calculateCost(amount: number, yearlySalary: number, afterTaxIncome?: number): CostAnalysis {
  // Calculate costs for different frequencies
  const oneTimeAmount = amount;
  const weeklyAmount = amount * 52;  // 52 weeks in a year
  const monthlyAmount = amount * 12; // 12 months in a year
  const everyFourMonthsAmount = amount * 3; // 3 times per year (every 4 months)
  const yearlyAmount = monthlyAmount; // Same as monthly amount * 12

  // Use after-tax income for percentage calculations when available
  const incomeForPercentage = typeof afterTaxIncome === 'number' ? afterTaxIncome : yearlySalary;

  // Calculate percentages of income
  const oneTimePercentage = (oneTimeAmount / incomeForPercentage) * 100;
  const weeklyPercentage = (weeklyAmount / incomeForPercentage) * 100;
  const monthlyPercentage = (monthlyAmount / incomeForPercentage) * 100;
  const everyFourMonthsPercentage = (everyFourMonthsAmount / incomeForPercentage) * 100;
  const yearlyPercentage = (yearlyAmount / incomeForPercentage) * 100;

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

const History = () => {
  const [costs, setCosts] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [expandedCostId, setExpandedCostId] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const [editingFrequencyId, setEditingFrequencyId] = useState<string | null>(null);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('');
  const [afterTaxIncome, setAfterTaxIncome] = useState<number | undefined>(undefined);
  const { currentUser } = useAuth();

  useEffect(() => {
    const fetchCosts = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        
        // Fetch user profile to get salary for percentage calculations
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        
        // Calculate after-tax income if state is available
        if (profile && profile.state) {
          const afterTax = calculateAfterTaxIncome(profile.state, profile.yearlySalary);
          setAfterTaxIncome(afterTax ?? undefined);
        }
        
        const costsRef = collection(db, 'costs');
        const q = query(
          costsRef,
          where('userId', '==', currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const costsList: CostRecord[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt.toDate()
        })) as CostRecord[];
        
        setCosts(costsList);
      } catch (error) {
        console.error('Error fetching costs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCosts();
  }, [currentUser]);

  const handleToggleFavorite = async (costId: string, currentFavorite: boolean = false) => {
    if (!currentUser) return;
    
    try {
      await toggleCostFavorite(costId, !currentFavorite);
      // Update local state
      setCosts(prev => 
        prev.map(cost => 
          cost.id === costId ? { ...cost, favorite: !currentFavorite } : cost
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleToggleNeed = async (costId: string, currentNeed: boolean = false) => {
    if (!currentUser) return;
    
    try {
      await toggleCostNeed(costId, !currentNeed);
      // Update local state
      setCosts(prev => 
        prev.map(cost => 
          cost.id === costId ? { ...cost, need: !currentNeed } : cost
        )
      );
    } catch (error) {
      console.error('Error toggling need status:', error);
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
      setCosts(prev => prev.filter(cost => cost.id !== costId));
      
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

  const handleFrequencyEditClick = (costId: string, currentFrequency: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the item
    setEditingFrequencyId(costId);
    setSelectedFrequency(currentFrequency);
  };

  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFrequency(e.target.value);
  };

  const handleFrequencyUpdate = async (costId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the item
    
    if (!currentUser || !selectedFrequency) return;
    
    try {
      await updateCostEntry(costId, { 
        frequency: selectedFrequency as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' 
      });
      
      // Update local state with the new frequency
      setCosts(prev => 
        prev.map(cost => 
          cost.id === costId ? { 
            ...cost, 
            frequency: selectedFrequency as 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly' 
          } : cost
        )
      );
      
      // Exit edit mode
      setEditingFrequencyId(null);
    } catch (error) {
      console.error('Error updating frequency:', error);
      alert('Failed to update frequency. Please try again.');
    }
  };

  const cancelFrequencyEdit = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent expanding the item
    setEditingFrequencyId(null);
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
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Cost History</h1>
      
      {afterTaxIncome !== undefined && (
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-300 bg-blue-50 dark:bg-blue-900 p-2 rounded">
          Percentages are calculated using your after-tax income of ${afterTaxIncome.toLocaleString()} 
          when available.
        </div>
      )}
      
      {costs.length === 0 ? (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
          No costs recorded yet
        </div>
      ) : (
        <div className="space-y-4">
          {costs.map((cost) => {
            const costAnalysis = userProfile ? calculateCost(cost.amount, userProfile.yearlySalary, afterTaxIncome) : null;
            const isExpanded = expandedCostId === cost.id;
            const isDeleting = deleteInProgress === cost.id;
            
            return (
              <div
                key={cost.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 
                  ${cost.favorite ? 'border-l-4 border-yellow-400' : ''}
                  ${cost.need ? 'border-r-4 border-indigo-400' : ''}
                  ${isDeleting ? 'opacity-50' : ''}`}
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
                      {cost.favorite ? (
                        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-yellow-500" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleNeed(cost.id, cost.need);
                      }}
                      className="mr-1 focus:outline-none"
                      disabled={isDeleting}
                    >
                      {cost.need ? (
                        <svg className="w-5 h-5 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 hover:text-indigo-500" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={(e) => handleDelete(cost.id, e)}
                      className="mr-2 focus:outline-none text-gray-400 dark:text-gray-500 hover:text-red-500"
                      disabled={isDeleting}
                      aria-label="Delete"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    
                    <div>
                      <h3 className="font-medium dark:text-white">{cost.description}</h3>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {editingFrequencyId === cost.id ? (
                          <div className="flex items-center" onClick={e => e.stopPropagation()}>
                            <select
                              value={selectedFrequency}
                              onChange={handleFrequencyChange}
                              className="mr-2 text-sm border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 dark:bg-gray-700 dark:text-white"
                            >
                              <option value="once">One-time</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                            <button 
                              onClick={(e) => handleFrequencyUpdate(cost.id, e)}
                              className="text-green-600 dark:text-green-400 text-sm mr-1"
                            >
                              Save
                            </button>
                            <button 
                              onClick={cancelFrequencyEdit}
                              className="text-gray-600 dark:text-gray-400 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <span 
                              className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                              onClick={(e) => handleFrequencyEditClick(cost.id, cost.frequency, e)}
                            >
                              {cost.frequency}
                            </span>
                            <span className="mx-2">•</span>
                            <span>{cost.date.toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-green-600 dark:text-green-400 font-medium mr-2">
                      ${cost.amount.toFixed(2)}
                    </span>
                    <svg 
                      className={`w-5 h-5 text-gray-400 dark:text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                
                {isExpanded && costAnalysis && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Cost Analysis 
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                        (% of {afterTaxIncome !== undefined ? 'after-tax' : 'gross'} income)
                      </span>
                    </h4>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">One-time Cost</p>
                          <p className="text-sm font-semibold dark:text-white">
                            ${costAnalysis.oneTime.amount.toFixed(2)}
                            <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                              ({costAnalysis.oneTime.percentage.toFixed(3)}% of yearly income)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Weekly Cost (yearly)</p>
                          <p className="text-sm font-semibold dark:text-white">
                            ${costAnalysis.weekly.amount.toFixed(2)}
                            <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                              ({costAnalysis.weekly.percentage.toFixed(3)}% of yearly income)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Monthly Cost (yearly)</p>
                          <p className="text-sm font-semibold dark:text-white">
                            ${costAnalysis.monthly.amount.toFixed(2)}
                            <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                              ({costAnalysis.monthly.percentage.toFixed(3)}% of yearly income)
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Every 4 Months Cost (yearly)</p>
                          <p className="text-sm font-semibold dark:text-white">
                            ${costAnalysis.everyFourMonths.amount.toFixed(2)}
                            <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                              ({costAnalysis.everyFourMonths.percentage.toFixed(3)}% of yearly income)
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

export default History;

