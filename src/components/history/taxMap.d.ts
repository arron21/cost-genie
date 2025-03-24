/**
 * Calculates the after-tax income for a given state and income.
 * Includes state, federal, and FICA taxes.
 *
 * @param state - The name of the US state.
 * @param income - The gross income.
 * @returns The after-tax income, or null if the state is not found.
 */
export function calculateAfterTaxIncome(state: string, income: number): number | null;

/**
 * Returns an array of all US state names.
 *
 * @returns An array containing all state names.
 */
export function getStateNames(): string[];

