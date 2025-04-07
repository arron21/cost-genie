export interface CostAnalysis {
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

// Update the function to optionally use afterTaxIncome
export function calculateCost(amount: number, yearlySalary: number, afterTaxIncome?: number): CostAnalysis {
  // Calculate costs for different frequencies
  const oneTimeAmount = amount;
  const dailyAmount = amount * 365; // 365 days in a year
  const weeklyAmount = amount * 52;  // 52 weeks in a year
  const monthlyAmount = amount * 12; // 12 months in a year
  const everyFourMonthsAmount = amount * 3; // 3 times per year (every 4 months)
  const yearlyAmount = monthlyAmount; // Same as monthly amount * 12

  // Use after-tax income for percentage calculations when available
  const incomeForPercentage = typeof afterTaxIncome === 'number' ? afterTaxIncome : yearlySalary;

  // Calculate percentages of income
  const oneTimePercentage = (oneTimeAmount / incomeForPercentage) * 100;
  const dailyPercentage = (dailyAmount / incomeForPercentage) * 100;
  const weeklyPercentage = (weeklyAmount / incomeForPercentage) * 100;
  const monthlyPercentage = (monthlyAmount / incomeForPercentage) * 100;
  const everyFourMonthsPercentage = (everyFourMonthsAmount / incomeForPercentage) * 100;
  const yearlyPercentage = (yearlyAmount / incomeForPercentage) * 100;

  return {
    oneTime: {
      amount: oneTimeAmount,
      percentage: oneTimePercentage
    },
    daily: {
      amount: dailyAmount,
      percentage: dailyPercentage
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