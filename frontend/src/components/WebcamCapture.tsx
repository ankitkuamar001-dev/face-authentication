import { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, Loader2 } from 'lucide-react';
import { FRAME_CAPTURE_DELAY, MAX_FRAMES } from '../utils/constants';

interface WebcamCaptureProps {
  onFramesCaptured: (frames: string[]) => void;
  isProcessing: boolean;
  maxFrames?: number;
  buttonLabel?: string;
}

export function WebcamCapture({
  onFramesCaptured,
  isProcessing,
  maxFrames = MAX_FRAMES,
  buttonLabel = 'Scan Face',
}: WebcamCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [capturing, setCapturing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [webcamReady, setWebcamReady] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!webcamRef.current || capturing || isProcessing) return;

    setCapturing(true);
    setProgress(0);
    const frames: string[] = [];

    for (let i = 0; i < maxFrames; i++) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        frames.push(imageSrc.split(',')[1]);
      }
      setProgress(((i + 1) / maxFrames) * 100);
      if (i < maxFrames - 1) {
        await new Promise((r) => setTimeout(r, FRAME_CAPTURE_DELAY));
      }
    }

    setCapturing(false);
    setProgress(0);
    if (frames.length > 0) {
      onFramesCaptured(frames);
    }
  }, [webcamRef, maxFrames, onFramesCaptured, capturing, isProcessing]);

  // SVG ring for progress
  const radius = 130;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Camera viewport */}
      <div className="relative w-[280px] h-[280px]">
        {/* Progress ring */}
        {(capturing || isProcessing) && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90 z-20"
            viewBox="0 0 280 280"
          >
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="rgba(59,130,246,0.15)"
              strokeWidth="4"
            />
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-300"
            />
          </svg>
        )}

        {/* Circular mask */}
        <div className="absolute inset-2 rounded-full overflow-hidden border-2 border-white/10 z-10">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ width: 720, height: 720, facingMode: 'user' }}
            className="w-full h-full object-cover scale-[1.15]"
            mirrored
            onUserMedia={() => setWebcamReady(true)}
          />

          {/* Scan line animation */}
          {capturing && (
            <div className="absolute inset-0 overflow-hidden z-20">
              <div className="scan-line" />
            </div>
          )}
        </div>

        {/* Corner decorations */}
        <CornerBrackets active={capturing || isProcessing} />
      </div>

      {/* Status text */}
      <p className="text-sm text-[var(--color-text-muted)] h-5">
        {!webcamReady
          ? 'Initializing camera...'
          : isProcessing
          ? 'Processing biometrics...'
          : capturing
          ? 'Scanning your face...'
          : 'Position your face in the circle'}
      </p>

      {/* Capture button */}
      <button
        id="btn-scan-face"
        onClick={handleCapture}
        disabled={isProcessing || capturing || !webcamReady}
        className="btn-primary px-8 py-3 text-base"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
          </>
        ) : capturing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Scanning...
          </>
        ) : (
          <>
            <Camera className="w-4 h-4" /> {buttonLabel}
          </>
        )}
      </button>
    </div>
  );
}

function CornerBrackets({ active }: { active: boolean }) {
  const color = active ? 'border-blue-400' : 'border-white/20';
  const base = `absolute w-6 h-6 transition-colors duration-300 ${color}`;
  return (
    <>
      <div className={`${base} top-0 left-0 border-t-2 border-l-2 rounded-tl-lg`} />
      <div className={`${base} top-0 right-0 border-t-2 border-r-2 rounded-tr-lg`} />
      <div className={`${base} bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg`} />
      <div className={`${base} bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg`} />
    </>
  );
}
