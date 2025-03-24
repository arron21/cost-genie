import React from 'react';

export interface FinancialData {
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

// Recommendation object structure
interface Recommendation {
  id: string;
  type: 'success' | 'warning' | 'danger' | 'info';
  title: string;
  description: string;
  action?: string;
}

export interface FinancialRecommendationsProps {
  financialData: FinancialData;
  compact?: boolean;
  maxRecommendations?: number;
}

const FinancialRecommendations: React.FC<FinancialRecommendationsProps> = ({
  financialData,
  compact = false,
  maxRecommendations
}) => {
  // Generate recommendations based on financial data
  const generateRecommendations = (): Recommendation[] => {
    const { spending } = financialData;
    const recommendations: Recommendation[] = [];
    
    // Analyze overall financial health
    if (spending.combined.percentage > 90) {
      recommendations.push({
        id: 'critical-spending',
        type: 'danger',
        title: 'Critical spending level',
        description: 'Your expenses are extremely high relative to your income, leaving little room for savings or emergencies.',
        action: 'Look for immediate ways to reduce expenses or increase income.'
      });
    } else if (spending.combined.percentage > 80) {
      recommendations.push({
        id: 'high-spending',
        type: 'danger',
        title: 'High spending level',
        description: 'Your expenses are very high relative to your income.',
        action: 'Consider reducing non-essential spending and creating a budget.'
      });
    } else if (spending.combined.percentage < 50) {
      recommendations.push({
        id: 'healthy-saving',
        type: 'success',
        title: 'Healthy saving habits',
        description: 'Your spending is below 50% of your income, which is great for saving and investing!',
        action: 'Consider putting the extra money into emergency funds, retirement accounts, or investments.'
      });
    }
    
    // Analyze essential spending
    if (spending.needs.percentage > 50) {
      recommendations.push({
        id: 'high-essentials',
        type: 'warning',
        title: 'High essential costs',
        description: 'Essential needs exceed 50% of your income.',
        action: 'Look for ways to reduce essential costs where possible, such as refinancing, finding better deals, or downsizing.'
      });
    } else if (spending.needs.percentage < 20 && spending.needs.count > 0) {
      recommendations.push({
        id: 'low-essentials',
        type: 'success',
        title: 'Low essential costs',
        description: 'Your essential costs are well-managed at less than 20% of your income.',
        action: 'Great job keeping essentials low! This gives you flexibility for other financial goals.'
      });
    }
    
    // Analyze discretionary spending
    if (spending.favorites.percentage > 30) {
      recommendations.push({
        id: 'high-discretionary',
        type: 'warning',
        title: 'High discretionary spending',
        description: 'Your favorite expenses take up a significant portion of your income.',
        action: 'Consider prioritizing which favorite expenses are most important to you.'
      });
    }
    
    // Missing data recommendations
    if (spending.needs.count === 0) {
      recommendations.push({
        id: 'track-essentials',
        type: 'info',
        title: 'Track essential expenses',
        description: 'You haven\'t marked any expenses as essential needs.',
        action: 'Mark your regular essential expenses like rent, utilities, and groceries as needs for better tracking.'
      });
    }
    
    // 50/30/20 rule recommendation
    if (spending.needs.count > 0 && spending.favorites.count > 0) {
      recommendations.push({
        id: 'budget-rule',
        type: 'info',
        title: 'Consider the 50/30/20 budget rule',
        description: 'Financial experts often recommend spending 50% on needs, 30% on wants, and saving 20% of your income.',
        action: 'Compare your spending patterns to this guideline to see if adjustments would help.'
      });
    }
    
    // Limit the number of recommendations if maxRecommendations is provided
    if (maxRecommendations && recommendations.length > maxRecommendations) {
      // Sort by priority (danger first, then warning, then info, then success)
      const priorityOrder = { danger: 0, warning: 1, info: 2, success: 3 };
      recommendations.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);
      
      return recommendations.slice(0, maxRecommendations);
    }
    
    return recommendations;
  };
  
  const recommendations = generateRecommendations();
  
  // Return early if no recommendations
  if (recommendations.length === 0) {
    return null;
  }
  
  // Icon components for different recommendation types
  const getIcon = (type: Recommendation['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'danger':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };
  
  // Get background color for recommendation cards
  const getBackgroundColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50';
      case 'warning':
        return 'bg-orange-50';
      case 'danger':
        return 'bg-red-50';
      case 'info':
      default:
        return 'bg-blue-50';
    }
  };
  
  // Get border color for recommendation cards
  const getBorderColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-400';
      case 'warning':
        return 'border-orange-400';
      case 'danger':
        return 'border-red-400';
      case 'info':
      default:
        return 'border-blue-400';
    }
  };
  
  // Get text color for titles
  const getTitleColor = (type: Recommendation['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'warning':
        return 'text-orange-800';
      case 'danger':
        return 'text-red-800';
      case 'info':
      default:
        return 'text-blue-800';
    }
  };
  
  // Render compact version
  if (compact) {
    return (
      <div className="space-y-2">
        {recommendations.map((rec) => (
          <div key={rec.id} className="flex items-start">
            <div className="mt-0.5 mr-2">{getIcon(rec.type)}</div>
            <p className="text-sm text-gray-700 dark:text-gray-300">{rec.description}</p>
          </div>
        ))}
      </div>
    );
  }
  
  // Render full version
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Financial Recommendations</h2>
      
      {recommendations.map((rec) => (
        <div 
          key={rec.id} 
          className={`p-4 rounded-lg border-l-4 ${getBackgroundColor(rec.type)} ${getBorderColor(rec.type)}`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {getIcon(rec.type)}
            </div>
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${getTitleColor(rec.type)}`}>{rec.title}</h3>
              <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                <p>{rec.description}</p>
              </div>
              {rec.action && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="font-semibold">Suggestion:</span> {rec.action}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FinancialRecommendations;
