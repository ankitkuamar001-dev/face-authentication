import { useEffect, useRef } from 'react';
import { Eye, ArrowLeft, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useLiveness } from '../hooks/useLiveness';

interface LivenessChallengeProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onComplete: (passed: boolean) => void;
  onSkip?: () => void;
}

export function LivenessChallenge({ videoRef, onComplete, onSkip }: LivenessChallengeProps) {
  const { challenge, isVerified, isChecking, progress, startChallenge, reset } = useLiveness();
  const completedRef = useRef(false);

  // Auto-start challenge when component mounts
  useEffect(() => {
    if (videoRef.current) {
      startChallenge(videoRef.current);
    }
    return () => reset();
  }, []);

  // Notify parent on completion
  useEffect(() => {
    if (isVerified && !completedRef.current) {
      completedRef.current = true;
      const timer = setTimeout(() => onComplete(true), 800);
      return () => clearTimeout(timer);
    }
    if (!isChecking && !isVerified && challenge && !completedRef.current) {
      // Timed out
      completedRef.current = true;
      const timer = setTimeout(() => onComplete(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isVerified, isChecking, challenge, onComplete]);

  const ChallengeIcon = challenge?.type === 'blink' ? Eye : challenge?.type === 'turn-left' ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        {isVerified ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        ) : isChecking ? (
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400" />
        )}
        <span className={`text-sm font-medium ${isVerified ? 'text-emerald-400' : isChecking ? 'text-blue-400' : 'text-red-400'}`}>
          {isVerified ? 'Liveness verified!' : isChecking ? 'Verifying...' : 'Challenge failed'}
        </span>
      </div>

      {/* Challenge instruction */}
      {challenge && isChecking && (
        <div className="glass-card-light px-5 py-3 flex items-center gap-3">
          <ChallengeIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />
          <span className="text-sm text-white">{challenge.instruction}</span>
        </div>
      )}

      {/* Progress bar */}
      {isChecking && (
        <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Retry / Skip */}
      {!isChecking && !isVerified && (
        <div className="flex gap-3 mt-2">
          <button
            id="btn-retry-liveness"
            onClick={() => {
              completedRef.current = false;
              if (videoRef.current) startChallenge(videoRef.current);
            }}
            className="btn-ghost text-sm px-4 py-2"
          >
            Retry
          </button>
          {onSkip && (
            <button
              id="btn-skip-liveness"
              onClick={onSkip}
              className="text-sm text-[var(--color-text-dim)] hover:text-white transition-colors"
            >
              Skip
            </button>
          )}
        </div>
      )}
    </div>
  );
}
