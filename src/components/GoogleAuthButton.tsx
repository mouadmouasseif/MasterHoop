import { loginWithGoogle } from '@/src/lib/firebase';

export default function GoogleAuthButton({ onSuccess }: { onSuccess?: () => void }) {
  const handleLogin = async () => {
    try {
      await loginWithGoogle();
      onSuccess?.();
    } catch (error) {
      console.error('Google Login Failed', error);
    }
  };

  return (
    <button
      onClick={handleLogin}
      className="w-full px-10 py-5 bg-white text-black rounded-2xl font-bold flex items-center justify-center gap-4 hover:scale-105 transition-all shadow-xl"
    >
      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="google" />
      Se connecter avec Google
    </button>
  );
}
