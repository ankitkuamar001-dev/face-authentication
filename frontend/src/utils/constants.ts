export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const FACE_API_MODEL_URL = '/models';

export const LIVENESS_CHALLENGES = [
  { id: 'blink', instruction: 'Blink your eyes slowly', type: 'blink' as const },
  { id: 'turn-left', instruction: 'Turn your head slightly left', type: 'turn-left' as const },
  { id: 'turn-right', instruction: 'Turn your head slightly right', type: 'turn-right' as const },
] as const;

export type LivenessChallenge = (typeof LIVENESS_CHALLENGES)[number];

export const MAX_FRAMES = 5;
export const MIN_FRAMES = 3;
export const FRAME_CAPTURE_DELAY = 300; // ms between frame captures
export const EAR_THRESHOLD = 0.21; // eye aspect ratio for blink detection
export const HEAD_TURN_THRESHOLD = 15; // degrees for head turn detection
export const OTP_LENGTH = 6;
export const OTP_EXPIRE_SECONDS = 300; // 5 minutes
export const AUTH_STORAGE_KEY = 'face-auth-storage';
export const REFRESH_TOKEN_KEY = 'face-auth-refresh-token';
