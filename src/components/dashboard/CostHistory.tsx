import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getUserCostHistory, CostEntry, toggleCostFavorite } from '../../firebase';

export default function CostHistory() {
  const { currentUser } = useAuth();
  const [costHistory, setCostHistory] = useState<CostEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCostHistory = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const history = await getUserCostHistory(currentUser.uid);
        setCostHistory(history);
        setError(null);
      } catch (error) {
        setError('Unable to load cost history. Please check your internet connection.');
        console.error('Error loading cost history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCostHistory();
  }, [currentUser]);

  const handleToggleFavorite = async (costId: string, currentFavorite: boolean) => {
    if (!currentUser) return;
    
    try {
      await toggleCostFavorite(costId, !currentFavorite);
      // Update the local state without refetching from the server
      setCostHistory(prev => 
        prev.map(cost => 
          cost.id === costId ? { ...cost, favorite: !currentFavorite } : cost
        )
      );
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      setError('Failed to update favorite status. Please try again.');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading cost history...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  if (costHistory.length === 0) {
    return <div className="text-center py-4 text-gray-600">No cost entries yet.</div>;
  }

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold mb-4">Cost History</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Favorite</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {costHistory.map((entry) => (
              <tr key={entry.id} className={entry.favorite ? "bg-yellow-50" : ""}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    onClick={() => handleToggleFavorite(entry.id!, entry.favorite || false)}
                    className="focus:outline-none"
                    aria-label={entry.favorite ? "Remove from favorites" : "Add to favorites"}
                  >
                    {entry.favorite ? (
                      <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-gray-400 hover:text-yellow-500" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${entry.amount.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.frequency}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {entry.createdAt.toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

