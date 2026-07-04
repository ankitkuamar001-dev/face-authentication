import { useState, useCallback, useRef } from 'react';
import { detectFaceWithLandmarks, calculateEAR, estimateHeadPose } from '../utils/faceDetection';
import { LIVENESS_CHALLENGES, EAR_THRESHOLD, HEAD_TURN_THRESHOLD, type LivenessChallenge } from '../utils/constants';

interface UseLivenessReturn {
  challenge: LivenessChallenge | null;
  isVerified: boolean;
  isChecking: boolean;
  progress: number;
  startChallenge: (video: HTMLVideoElement) => void;
  reset: () => void;
}

export function useLiveness(): UseLivenessReturn {
  const [challenge, setChallenge] = useState<LivenessChallenge | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const loopRef = useRef<number | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanup = useCallback(() => {
    if (loopRef.current) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const startChallenge = useCallback(
    (video: HTMLVideoElement) => {
      cleanup();

      // Pick a random challenge
      const idx = Math.floor(Math.random() * LIVENESS_CHALLENGES.length);
      const picked = LIVENESS_CHALLENGES[idx];
      setChallenge(picked);
      setIsVerified(false);
      setIsChecking(true);
      setProgress(0);

      let framesChecked = 0;
      const maxFrames = 50; // ~10 seconds at 200ms intervals
      let consecutiveHits = 0;
      const hitsNeeded = 3; // Need 3 consecutive passes

      const check = async () => {
        if (framesChecked >= maxFrames) {
          setIsChecking(false);
          return; // timeout — challenge failed
        }

        try {
          const result = await detectFaceWithLandmarks(video);
          framesChecked++;
          setProgress(Math.min((framesChecked / maxFrames) * 100, 100));

          if (result) {
            const landmarks = result.landmarks;
            let passed = false;

            if (picked.type === 'blink') {
              const ear = calculateEAR(landmarks);
              passed = ear < EAR_THRESHOLD;
            } else if (picked.type === 'turn-left') {
              const { yaw } = estimateHeadPose(landmarks);
              passed = yaw < -HEAD_TURN_THRESHOLD;
            } else if (picked.type === 'turn-right') {
              const { yaw } = estimateHeadPose(landmarks);
              passed = yaw > HEAD_TURN_THRESHOLD;
            }

            if (passed) {
              consecutiveHits++;
              if (consecutiveHits >= hitsNeeded) {
                setIsVerified(true);
                setIsChecking(false);
                setProgress(100);
                return; // success!
              }
            } else {
              consecutiveHits = 0;
            }
          }
        } catch {
          // detection failed this frame, continue
        }

        // Schedule next check
        timeoutRef.current = setTimeout(() => {
          loopRef.current = requestAnimationFrame(check);
        }, 200);
      };

      loopRef.current = requestAnimationFrame(check);
    },
    [cleanup]
  );

  const reset = useCallback(() => {
    cleanup();
    setChallenge(null);
    setIsVerified(false);
    setIsChecking(false);
    setProgress(0);
  }, [cleanup]);

  return { challenge, isVerified, isChecking, progress, startChallenge, reset };
}
