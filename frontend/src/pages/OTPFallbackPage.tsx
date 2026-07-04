import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { OTP_LENGTH, OTP_EXPIRE_SECONDS } from '../utils/constants';

type Step = 'email' | 'otp';

export function OTPFallbackPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { requestOTP, verifyOTP } = useAuth();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);

    const result = await requestOTP(email);
    if (result.success) {
      toast.success('OTP sent to your email');
      setStep('otp');
      setCountdown(OTP_EXPIRE_SECONDS);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      toast.error(result.error || 'Failed to send OTP');
    }
    setSending(false);
  };

  const handleOTPChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    // Handle paste
    if (value.length > 1) {
      const digits = value.slice(0, OTP_LENGTH).split('');
      digits.forEach((d, i) => {
        if (index + i < OTP_LENGTH) newOtp[index + i] = d;
      });
      setOtp(newOtp);
      const nextIdx = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== OTP_LENGTH) {
      toast.error('Please enter the complete OTP');
      return;
    }

    setVerifying(true);
    const result = await verifyOTP(email, otpStr);
    if (result.success) {
      toast.success('Verification successful!');
      navigate('/dashboard');
    } else {
      toast.error(result.error || 'Invalid OTP');
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
    setVerifying(false);
  };

  const handleResend = async () => {
    setSending(true);
    const result = await requestOTP(email);
    if (result.success) {
      toast.success('New OTP sent');
      setCountdown(OTP_EXPIRE_SECONDS);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } else {
      toast.error(result.error || 'Failed to resend');
    }
    setSending(false);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <AuthLayout title="Email Verification" subtitle={step === 'email' ? 'Enter your registered email' : 'Enter the OTP sent to your email'}>
      {/* Email step */}
      {step === 'email' && (
        <form onSubmit={handleSendOTP} className="space-y-4 animate-fade-in">
          <div>
            <label htmlFor="otp-email" className="block text-sm font-medium text-[var(--color-text-muted)] mb-1.5">
              Email Address
            </label>
            <input
              id="otp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="john@example.com"
            />
          </div>
          <button id="btn-send-otp" type="submit" disabled={sending} className="w-full btn-primary py-3">
            {sending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
            ) : (
              <><Mail className="w-4 h-4" /> Send OTP</>
            )}
          </button>
        </form>
      )}

      {/* OTP step */}
      {step === 'otp' && (
        <div className="animate-fade-in">
          {/* OTP digit boxes */}
          <div className="flex justify-center gap-2.5 mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                id={`otp-digit-${i}`}
                type="text"
                inputMode="numeric"
                maxLength={i === 0 ? OTP_LENGTH : 1}
                value={digit}
                onChange={(e) => handleOTPChange(i, e.target.value)}
                onKeyDown={(e) => handleOTPKeyDown(i, e)}
                className="w-12 h-14 text-center text-xl font-bold text-white bg-white/5 border border-white/10 rounded-xl outline-none transition-all duration-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            ))}
          </div>

          {/* Timer */}
          {countdown > 0 && (
            <p className="text-center text-sm text-[var(--color-text-dim)] mb-4">
              Expires in <span className="text-white font-medium tabular-nums">{formatTime(countdown)}</span>
            </p>
          )}

          <button
            id="btn-verify-otp"
            onClick={handleVerify}
            disabled={verifying || otp.join('').length !== OTP_LENGTH}
            className="w-full btn-primary py-3 mb-3"
          >
            {verifying ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
            ) : (
              <><CheckCircle2 className="w-4 h-4" /> Verify OTP</>
            )}
          </button>

          {/* Resend */}
          <div className="text-center">
            <button
              id="btn-resend-otp"
              onClick={handleResend}
              disabled={sending || countdown > OTP_EXPIRE_SECONDS - 30}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:text-[var(--color-text-dim)] disabled:cursor-not-allowed"
            >
              Resend OTP
            </button>
          </div>
        </div>
      )}

      {/* Back to login */}
      <div className="mt-6 text-center">
        <button
          id="link-back-login"
          onClick={() => navigate('/login')}
          className="text-sm text-[var(--color-text-dim)] hover:text-white transition-colors inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to face login
        </button>
      </div>
    </AuthLayout>
  );
}
