const usStateIncomeTax = {
    "Alabama": 5.00,
    "Alaska": 0.00, // No state income tax
    "Arizona": 2.50,
    "Arkansas": 4.40,
    "California": 13.30,
    "Colorado": 4.40,
    "Connecticut": 6.99,
    "Delaware": 6.60,
    "Florida": 0.00, // No state income tax
    "Georgia": 5.39,
    "Hawaii": 11.00,
    "Idaho": 5.80,
    "Illinois": 4.95,
    "Indiana": 3.05,
    "Iowa": 6.00,
    "Kansas": 5.70,
    "Kentucky": 5.00,
    "Louisiana": 4.25,
    "Maine": 7.15,
    "Maryland": 5.75,
    "Massachusetts": 5.00,
    "Michigan": 4.25,
    "Minnesota": 9.85,
    "Mississippi": 5.00,
    "Missouri": 5.40,
    "Montana": 6.75,
    "Nebraska": 6.84,
    "Nevada": 0.00, // No state income tax
    "New Hampshire": 0.00, // No state income tax on earned income
    "New Jersey": 10.75,
    "New Mexico": 5.90,
    "New York": 10.90,
    "North Carolina": 4.50,
    "North Dakota": 2.90,
    "Ohio": 3.99,
    "Oklahoma": 5.00,
    "Oregon": 9.90,
    "Pennsylvania": 3.07,
    "Rhode Island": 5.99,
    "South Carolina": 7.00,
    "South Dakota": 0.00, // No state income tax
    "Tennessee": 0.00, // No state income tax
    "Texas": 0.00, // No state income tax
    "Utah": 4.55,
    "Vermont": 8.75,
    "Virginia": 5.75,
    "Washington": 0.00, // No state income tax
    "West Virginia": 6.50,
    "Wisconsin": 7.65,
    "Wyoming": 0.00 // No state income tax
  };

  const federal = 12.00;  // Effective average federal income tax rate
  const fica = 7.65;      // FICA tax rate (Social Security + Medicare)
  
  /**
 * Calculates the after-tax income for a given state and income.
 * Includes state, federal, and FICA taxes.
 *
 * @param {string} state - The name of the US state.
 * @param {number} income - The gross income.
 * @returns {number} The after-tax income, or null if the state is not found.
 */
export function calculateAfterTaxIncome(state, income) {
    const stateTaxRate = usStateIncomeTax[state];

    if (stateTaxRate === undefined) {
        return null; // State not found
    }

    // Calculate tax amounts
    const stateTaxAmount = income * (stateTaxRate / 100);
    const federalTaxAmount = income * (federal / 100);
    const ficaTaxAmount = income * (fica / 100);
    
    // Subtract all taxes from income
    return income - stateTaxAmount - federalTaxAmount - ficaTaxAmount;
}

/**
 * Returns an array of all US state names.
 *
 * @returns {string[]} An array containing all state names.
 */
export function getStateNames() {
  return Object.keys(usStateIncomeTax);
}