import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { User, Camera, CheckCircle2, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { WebcamCapture } from '../components/WebcamCapture';
import { useAuth } from '../hooks/useAuth';

type Step = 1 | 2 | 3;

const steps = [
  { num: 1, label: 'Details', icon: User },
  { num: 2, label: 'Face Scan', icon: Camera },
  { num: 3, label: 'Complete', icon: CheckCircle2 },
];

export function RegisterPage() {
  const [step, setStep] = useState<Step>(1);
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();

  const handleDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    setStep(2);
  };

  const handleFramesCaptured = async (frames: string[]) => {
    setIsProcessing(true);
    const toastId = toast.loading('Registering biometrics...');

    const result = await register(formData.name, formData.email, frames);

    if (result.success) {
      toast.success('Registration successful!', { id: toastId });
      setStep(3);
    } else {
      toast.error(result.error || 'Registration failed', { id: toastId });
    }

    setIsProcessing(false);
  };

  return (
    <AuthLayout title="Create Account" subtitle={step === 1 ? 'Enter your details' : step === 2 ? 'Scan your face' : 'All done!'}>
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-0 mb-8">
        {steps.map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300
              ${step >= s.num
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'bg-white/5 text-[var(--color-text-dim)] border border-transparent'}`}
            >
              <s.icon className="w-3.5 h-3.5" />
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px mx-1 transition-colors duration-300 ${step > s.num ? 'bg-blue-500/40' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: User details */}
      {step === 1 && (
        <form onSubmit={handleDetails} className="space-y-4 animate-fade-in">
          <div>
            <label htmlFor="reg-name" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
              Full Name
            </label>
            <input
              id="reg-name"
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
              Email Address
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              placeholder="john@example.com"
            />
          </div>
          <button id="btn-next-step" type="submit" className="w-full btn-primary py-3 mt-2">
            <ArrowRight className="w-4 h-4" /> Continue to Face Scan
          </button>
        </form>
      )}

      {/* Step 2: Face scan */}
      {step === 2 && (
        <div className="animate-fade-in">
          <WebcamCapture
            onFramesCaptured={handleFramesCaptured}
            isProcessing={isProcessing}
            buttonLabel="Register Face"
          />
          <div className="mt-5 text-center">
            <button
              id="btn-back-details"
              onClick={() => setStep(1)}
              disabled={isProcessing}
              className="text-sm text-[var(--color-text-dim)] hover:text-white transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to details
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="text-center py-6 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Registration Complete!</h3>
          <p className="text-sm text-[var(--color-text-muted)] mb-6">
            Your biometric data has been securely stored. You can now sign in with your face.
          </p>
          <button
            id="btn-go-login"
            onClick={() => navigate('/login')}
            className="btn-primary px-8 py-3"
          >
            Sign In Now
          </button>
        </div>
      )}

      {/* Login link */}
      {step !== 3 && (
        <div className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Already have an account?{' '}
          <button
            id="link-login"
            onClick={() => navigate('/login')}
            className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            Sign in
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
