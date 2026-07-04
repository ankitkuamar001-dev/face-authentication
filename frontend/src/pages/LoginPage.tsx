import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, KeyRound } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { WebcamCapture } from '../components/WebcamCapture';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const failedAttempts = useAuthStore((s) => s.failedAttempts);

  const handleFramesCaptured = async (frames: string[]) => {
    setIsProcessing(true);
    const toastId = toast.loading('Verifying identity...');

    const result = await login(frames);

    if (result.success) {
      toast.success('Authentication successful!', { id: toastId });
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Authentication failed', { id: toastId });
    }

    setIsProcessing(false);
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in using facial biometrics">
      {/* Failed attempts warning */}
      {failedAttempts >= 3 && (
        <div className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-amber-300 font-medium">Multiple failed attempts</p>
            <p className="text-amber-300/70 mt-0.5">
              {5 - failedAttempts > 0
                ? `${5 - failedAttempts} attempt(s) remaining before lockout.`
                : 'Account may be locked.'}
            </p>
          </div>
        </div>
      )}

      <WebcamCapture
        onFramesCaptured={handleFramesCaptured}
        isProcessing={isProcessing}
        buttonLabel="Authenticate"
      />

      {/* OTP fallback */}
      {failedAttempts >= 3 && (
        <div className="mt-5 animate-slide-up">
          <button
            id="btn-otp-fallback"
            onClick={() => navigate('/otp')}
            className="w-full btn-ghost flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            Use Email OTP Instead
          </button>
        </div>
      )}

      {/* Register link */}
      <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
        Don&apos;t have an account?{' '}
        <button
          id="link-register"
          onClick={() => navigate('/register')}
          className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
        >
          Register here
        </button>
      </div>
    </AuthLayout>
  );
}
