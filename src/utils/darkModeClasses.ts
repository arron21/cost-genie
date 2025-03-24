/**
 * Common class combinations for dark mode support
 */

export const darkModeClasses = {
  // Background classes
  card: "bg-white dark:bg-gray-800",
  container: "bg-gray-50 dark:bg-gray-900",
  highlight: "bg-gray-50 dark:bg-gray-700",
  accent: "bg-blue-50 dark:bg-blue-900",
  
  // Text classes
  header: "text-gray-800 dark:text-white",
  subheader: "text-gray-700 dark:text-gray-300", // Updated for better contrast
  body: "text-gray-600 dark:text-gray-300",
  muted: "text-gray-500 dark:text-gray-400",
  
  // Border classes
  border: "border-gray-200 dark:border-gray-700",
  separator: "border-gray-100 dark:border-gray-700",
  
  // Form elements
  input: "border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
  button: {
    primary: "bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
  }
};
