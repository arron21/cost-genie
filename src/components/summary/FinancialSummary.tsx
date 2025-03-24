import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../auth/AuthContext';
import { getUserProfile, UserProfile } from '../../firebase';
import { Link } from 'react-router-dom';
import { calculateAfterTaxIncome } from '../history/taxMap';
import FinancialRecommendations from '../recommendations/FinancialRecommendations';

interface CostRecord {
  id: string;
  amount: number;
  description: string;
  date: Date;
  userId: string;
  favorite?: boolean;
  need?: boolean;
  frequency: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

interface FinancialSummaryData {
  favorites: {
    items: CostRecord[];
    yearlyTotal: number;
    monthlyAverage: number;
    percentageOfIncome: number;
  };
  needs: {
    items: CostRecord[];
    yearlyTotal: number;
    monthlyAverage: number;
    percentageOfIncome: number;
  };
  combined: {
    yearlyTotal: number;
    monthlyAverage: number;
    percentageOfIncome: number;
  };
}

const FinancialSummary = () => {
  const [financialData, setFinancialData] = useState<FinancialSummaryData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [afterTaxIncome, setAfterTaxIncome] = useState<number | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    const loadFinancialData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch user profile for income data
        const profile = await getUserProfile(currentUser.uid);
        setUserProfile(profile);
        
        // Calculate after-tax income if state is available
        if (profile && profile.state) {
          const afterTax = calculateAfterTaxIncome(profile.state, profile.yearlySalary);
          setAfterTaxIncome(afterTax);
        }
        
        // Fetch favorites
        const favoritesQuery = query(
          collection(db, 'costs'),
          where('userId', '==', currentUser.uid),
          where('favorite', '==', true),
          orderBy('createdAt', 'desc')
        );
        
        // Fetch needs
        const needsQuery = query(
          collection(db, 'costs'),
          where('userId', '==', currentUser.uid),
          where('need', '==', true),
          orderBy('createdAt', 'desc')
        );
        
        const [favoritesSnapshot, needsSnapshot] = await Promise.all([
          getDocs(favoritesQuery),
          getDocs(needsQuery)
        ]);
        
        const favorites = favoritesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt.toDate()
        })) as CostRecord[];
        
        const needs = needsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt.toDate()
        })) as CostRecord[];
        
        // Calculate yearly costs for favorites
        const favoritesYearlyTotal = calculateYearlyCost(favorites);
        
        // Calculate yearly costs for needs
        const needsYearlyTotal = calculateYearlyCost(needs);
        
        // Calculate combined total
        const combinedYearlyTotal = favoritesYearlyTotal + needsYearlyTotal;
        
        // Calculate percentages based on after-tax income or gross income
        const incomeForPercentage = afterTaxIncome || (profile ? profile.yearlySalary : 1);
        
        const summary: FinancialSummaryData = {
          favorites: {
            items: favorites,
            yearlyTotal: favoritesYearlyTotal,
            monthlyAverage: favoritesYearlyTotal / 12,
            percentageOfIncome: (favoritesYearlyTotal / incomeForPercentage) * 100
          },
          needs: {
            items: needs,
            yearlyTotal: needsYearlyTotal,
            monthlyAverage: needsYearlyTotal / 12,
            percentageOfIncome: (needsYearlyTotal / incomeForPercentage) * 100
          },
          combined: {
            yearlyTotal: combinedYearlyTotal,
            monthlyAverage: combinedYearlyTotal / 12,
            percentageOfIncome: (combinedYearlyTotal / incomeForPercentage) * 100
          }
        };
        
        setFinancialData(summary);
      } catch (err) {
        console.error('Error loading financial data:', err);
        setError('Failed to load your financial summary. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadFinancialData();
  }, [currentUser]);
  
  const calculateYearlyCost = (items: CostRecord[]): number => {
    return items.reduce((total, cost) => {
      switch (cost.frequency) {
        case 'once':
          return total + cost.amount;
        case 'daily':
          return total + (cost.amount * 365);
        case 'weekly':
          return total + (cost.amount * 52);
        case 'monthly':
          return total + (cost.amount * 12);
        case 'yearly':
          return total + cost.amount;
        default:
          return total;
      }
    }, 0);
  };
  
  // Construct the financial data object for recommendations
  const getFinancialDataForRecommendations = () => {
    if (!financialData || !userProfile) return null;
    
    const { favorites, needs, combined } = financialData;
    const incomeValue = afterTaxIncome || userProfile.yearlySalary;
    
    return {
      income: {
        yearly: userProfile.yearlySalary,
        monthly: userProfile.yearlySalary / 12,
        afterTax: afterTaxIncome
      },
      spending: {
        needs: {
          total: needs.yearlyTotal,
          percentage: needs.percentageOfIncome,
          count: needs.items.length
        },
        favorites: {
          total: favorites.yearlyTotal,
          percentage: favorites.percentageOfIncome,
          count: favorites.items.length
        },
        combined: {
          total: combined.yearlyTotal,
          percentage: combined.percentageOfIncome
        }
      }
    };
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!financialData) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Financial Summary</h1>
        <p className="text-gray-600">No financial data available. Start by adding some favorites or needs.</p>
      </div>
    );
  }
  
  const { favorites, needs, combined } = financialData;
  const recommendationsData = getFinancialDataForRecommendations();
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Financial Summary</h1>
      
      {/* User Income Info */}
      {userProfile && (
        <div className="bg-white rounded-lg shadow p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3">Income Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Yearly Salary</p>
              <p className="text-xl font-bold">${userProfile.yearlySalary.toLocaleString()}</p>
            </div>
            {afterTaxIncome !== null && (
              <div>
                <p className="text-sm text-gray-500">After-Tax Income (Est.)</p>
                <p className="text-xl font-bold">${afterTaxIncome.toLocaleString()}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Monthly Income</p>
              <p className="text-xl font-bold">
                ${(afterTaxIncome !== null ? afterTaxIncome / 12 : userProfile.yearlySalary / 12).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Combined Summary Card */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow p-5 mb-6 text-white">
        <h2 className="text-lg font-semibold mb-3">Total Financial Commitments</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm opacity-80">Yearly Total</p>
            <p className="text-2xl font-bold">${combined.yearlyTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Monthly Average</p>
            <p className="text-2xl font-bold">${combined.monthlyAverage.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</p>
          </div>
          <div>
            <p className="text-sm opacity-80">Percentage of Income</p>
            <div className="flex items-center">
              <p className="text-2xl font-bold">{combined.percentageOfIncome.toFixed(1)}%</p>
              <div className="ml-2 h-4 w-24 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    combined.percentageOfIncome > 80 ? 'bg-red-500' : 
                    combined.percentageOfIncome > 50 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`} 
                  style={{ width: `${Math.min(100, combined.percentageOfIncome)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        
        {combined.percentageOfIncome > 80 && (
          <div className="mt-4 p-3 bg-red-500/30 rounded-md text-white">
            <p className="font-medium flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Your combined commitments exceed 80% of your income. Consider reviewing your expenses.
            </p>
          </div>
        )}
      </div>
      
      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Favorites Summary */}
        <div className="bg-white rounded-lg shadow p-5 border-l-4 border-yellow-400">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Favorites</h2>
            <Link to="/favorites" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Yearly Total</p>
            <p className="text-xl font-bold text-gray-800">${favorites.yearlyTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</p>
          </div>
          
          <div className="mt-3">
            <p className="text-sm text-gray-500">Monthly Average</p>
            <p className="text-xl font-bold text-gray-800">${favorites.monthlyAverage.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</p>
          </div>
          
          <div className="mt-3">
            <p className="text-sm text-gray-500">Percentage of Income</p>
            <div className="flex items-center">
              <p className="text-xl font-bold text-gray-800">{favorites.percentageOfIncome.toFixed(1)}%</p>
              <div className="ml-2 h-3 w-24 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full bg-yellow-500" 
                  style={{ width: `${Math.min(100, favorites.percentageOfIncome)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">{favorites.items.length} favorite items</p>
          </div>
        </div>
        
        {/* Needs Summary */}
        <div className="bg-white rounded-lg shadow p-5 border-r-4 border-indigo-400">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">Essential Needs</h2>
            <Link to="/needs" className="text-sm text-indigo-600 hover:text-indigo-800">
              View all
            </Link>
          </div>
          
          <div>
            <p className="text-sm text-gray-500">Yearly Total</p>
            <p className="text-xl font-bold text-gray-800">${needs.yearlyTotal.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</p>
          </div>
          
          <div className="mt-3">
            <p className="text-sm text-gray-500">Monthly Average</p>
            <p className="text-xl font-bold text-gray-800">${needs.monthlyAverage.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}</p>
          </div>
          
          <div className="mt-3">
            <p className="text-sm text-gray-500">Percentage of Income</p>
            <div className="flex items-center">
              <p className="text-xl font-bold text-gray-800">{needs.percentageOfIncome.toFixed(1)}%</p>
              <div className="ml-2 h-3 w-24 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    needs.percentageOfIncome > 50 ? 'bg-red-500' : 
                    needs.percentageOfIncome > 30 ? 'bg-yellow-500' : 
                    'bg-green-500'
                  }`} 
                  style={{ width: `${Math.min(100, needs.percentageOfIncome)}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">{needs.items.length} essential items</p>
          </div>
        </div>
      </div>
      
      {/* Recommendations */}
      {recommendationsData && (
        <div className="bg-white rounded-lg shadow p-5">
          <FinancialRecommendations financialData={recommendationsData} />
        </div>
      )}
    </div>
  );
};

export default FinancialSummary;
