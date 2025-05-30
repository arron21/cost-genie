import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, deleteCostEntry, toggleCostNeed } from '../../firebase';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../../firebase';
import { Link } from 'react-router-dom';
import { calculateAfterTaxIncome } from '../history/taxMap';
import CostAnalysisDisplay from '../history/CostAnalysisDisplay';
import { calculateCost } from '../../utils/costUtils';

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

const Needs: React.FC = () => {
  const [needs, setNeeds] = useState<CostRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [expandedCostId, setExpandedCostId] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState<string | null>(null);
  const { currentUser } = useAuth();
  const [totalYearlyCost, setTotalYearlyCost] = useState<number>(0);
  const [salaryPercentage, setSalaryPercentage] = useState<number>(0);
  const [afterTaxIncome, setAfterTaxIncome] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchNeeds = async () => {
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
          where('need', '==', true),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const needsList: CostRecord[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt.toDate()
        })) as CostRecord[];
        
        setNeeds(needsList);
      } catch (error) {
        console.error('Error fetching needs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNeeds();
  }, [currentUser]);

  // Calculate total yearly cost of all needs
  useEffect(() => {
    if (!userProfile || needs.length === 0) return;
    
    const calculateTotalYearlyCost = () => {
      let total = 0;
      
      needs.forEach(cost => {
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
      if (afterTaxIncome !== undefined) {
        setSalaryPercentage((total / afterTaxIncome) * 100);
      }
    };
    
    calculateTotalYearlyCost();
  }, [needs, userProfile, afterTaxIncome]);

  const toggleNeed = async (costId: string, currentNeed: boolean = true) => {
    if (!currentUser) return;
    
    try {
      // Use the imported toggleCostNeed function instead
      await toggleCostNeed(costId, !currentNeed);
      
      // If unmarked as need, remove from needs list
      if (currentNeed) {
        setNeeds(prev => prev.filter(cost => cost.id !== costId));
      }
    } catch (error) {
      console.error('Error toggling need status:', error);
    }
  };
  
  const handleDelete = async (costId: string, e: React.MouseEvent<HTMLButtonElement>) => {
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
      setNeeds(prev => prev.filter(cost => cost.id !== costId));
      
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
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Essential Needs</h1>
      
      {afterTaxIncome !== undefined && (
        <div className="mb-4 text-sm bg-blue-50 dark:bg-blue-900 p-2 rounded border-l-2 border-blue-300 dark:border-blue-700">
          <p className="text-gray-700 dark:text-gray-200">
            Note: Percentages are calculated based on your after-tax income of <strong>${afterTaxIncome.toLocaleString()}</strong>.
          </p>
        </div>
      )}
      
      {needs.length > 0 && userProfile && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 mb-6 border-l-4 border-indigo-500">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Essential Costs Summary</h2>
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Yearly Essentials</p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">${totalYearlyCost.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Average</p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">${(totalYearlyCost / 12).toFixed(2)}</p>
            </div>
            {afterTaxIncome !== undefined && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">After-Tax Income</p>
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">${afterTaxIncome.toLocaleString()}</p>
              </div>
            )}
            <div className="md:ml-auto">
              <p className="text-sm text-gray-500 dark:text-gray-400">Percentage of Income</p>
              <div className="flex items-center">
                <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{salaryPercentage.toFixed(3)}%</p>
                <div className="ml-2 h-4 w-24 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${salaryPercentage > 50 ? 'bg-red-500' : salaryPercentage > 30 ? 'bg-yellow-500' : 'bg-green-500'}`} 
                    style={{ width: `${Math.min(100, salaryPercentage)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          {salaryPercentage > 50 && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">
              <svg className="inline-block w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Your essential costs are over 50% of your yearly income
            </p>
          )}
        </div>
      )}
      
      {needs.length === 0 ? (
        <div className="text-center mt-8">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No essential needs yet</p>
          <Link 
            to="/history" 
            className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 underline"
          >
            Go to history to mark items as essential needs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {needs.map((cost) => {
            const costAnalysis = userProfile ? calculateCost(cost.amount, userProfile.yearlySalary, afterTaxIncome) : null;
            const isExpanded = expandedCostId === cost.id;
            const isDeleting = deleteInProgress === cost.id;
            
            return (
              <div
                key={cost.id}
                className={`bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 border-indigo-400 ${isDeleting ? 'opacity-50' : ''}`}
              >
                <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleExpand(cost.id)}>
                  <div className="flex items-center">
                    <button
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        toggleNeed(cost.id, cost.need);
                      }}
                      className="mr-1 focus:outline-none"
                      disabled={isDeleting}
                    >
                      <svg className="w-5 h-5 text-indigo-500 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => handleDelete(cost.id, e)}
                      className="mr-2 focus:outline-none text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
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
                        <span>{cost.frequency}</span>
                        <span className="mx-2">•</span>
                        <span>{cost.date.toLocaleDateString()}</span>
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
                  <CostAnalysisDisplay
                  frequency={cost.frequency}
                    costAnalysis={costAnalysis}
                    afterTaxIncome={afterTaxIncome}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Needs;