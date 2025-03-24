import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/auth/AuthContext';
import { getUserProfile } from '../firebase';

export function useAuthRedirect() {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuthAndProfile = async () => {
      if (loading) return;

      if (!currentUser) {
        navigate('/login');
        return;
      }

      try {
        const profile = await getUserProfile(currentUser.uid);
        if (!profile && window.location.pathname !== '/profile/setup') {
          navigate('/profile/setup');
        }
      } catch (error) {
        console.error('Error checking user profile:', error);
      }
    };

    checkAuthAndProfile();
  }, [currentUser, loading, navigate]);

  return { currentUser, loading };
}

