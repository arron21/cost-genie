import React from 'react';

interface CostAnalysis {
  oneTime: {
    amount: number;
    percentage: number;
  };
  daily: {
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

interface CostAnalysisDisplayProps {
  costAnalysis: CostAnalysis;
  afterTaxIncome?: number;
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'yearly';
}

const CostAnalysisDisplay: React.FC<CostAnalysisDisplayProps> = ({ costAnalysis, afterTaxIncome, frequency }) => {
  const getHighlightClass = (freq: string) => {
    return frequency === freq ? 'bg-blue-100 dark:bg-blue-900/40 border border-blue-500 dark:border-blue-400' : '';
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        Cost Analysis 
        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
          (% of {afterTaxIncome !== undefined ? 'after-tax' : 'gross'} income)
        </span>
      </h4>
      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className={getHighlightClass('once')}>
            <p className="text-xs text-gray-500 dark:text-gray-400">One-time Cost</p>
            <p className="text-sm font-semibold dark:text-white">
              ${costAnalysis.oneTime.amount.toFixed(2)}
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                ({costAnalysis.oneTime.percentage.toFixed(3)}% of yearly income)
              </span>
            </p>
          </div>
          <div className={getHighlightClass('weekly')}>
            <p className="text-xs text-gray-500 dark:text-gray-400">Every Week</p>
            <p className="text-sm font-semibold dark:text-white">
              ${costAnalysis.weekly.amount.toFixed(2)}
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                ({costAnalysis.weekly.percentage.toFixed(3)}% of yearly income)
              </span>
            </p>
          </div>
          <div className={getHighlightClass('monthly')}>
            <p className="text-xs text-gray-500 dark:text-gray-400">Every Month</p>
            <p className="text-sm font-semibold dark:text-white">
              ${costAnalysis.monthly.amount.toFixed(2)}
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                ({costAnalysis.monthly.percentage.toFixed(3)}% of yearly income)
              </span>
            </p>
          </div>
          <div className={getHighlightClass('daily')}>
            <p className="text-xs text-gray-500 dark:text-gray-400">Every Day</p>
            <p className="text-sm font-semibold dark:text-white">
              ${costAnalysis.daily.amount.toFixed(2)}
              <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
                ({costAnalysis.daily.percentage.toFixed(3)}% of yearly income)
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostAnalysisDisplay;
