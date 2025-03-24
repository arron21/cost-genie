import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { FcGoogle } from 'react-icons/fc';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Cost Genie
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Track your expenses and understand their impact on your income
          </p>
        </div>
        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <FcGoogle className="h-5 w-5 mr-2" />
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

