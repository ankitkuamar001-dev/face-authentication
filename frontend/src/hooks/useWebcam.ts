import { useState, useCallback, useRef, useEffect } from 'react';

interface UseWebcamReturn {
  isReady: boolean;
  error: string | null;
  stream: MediaStream | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: (video: HTMLVideoElement) => string | null;
  captureFrameSequence: (video: HTMLVideoElement, count: number, delayMs: number) => Promise<string[]>;
}

export function useWebcam(): UseWebcamReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 720, height: 720, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsReady(true);
    } catch (err: unknown) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions.'
          : 'Could not access camera. Please check your device.';
      setError(message);
      setIsReady(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setStream(null);
      setIsReady(false);
    }
  }, []);

  const captureFrame = useCallback((video: HTMLVideoElement): string | null => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return dataUrl.split(',')[1]; // strip prefix, return raw base64
  }, []);

  const captureFrameSequence = useCallback(
    async (video: HTMLVideoElement, count: number, delayMs: number): Promise<string[]> => {
      const frames: string[] = [];
      for (let i = 0; i < count; i++) {
        const frame = captureFrame(video);
        if (frame) frames.push(frame);
        if (i < count - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
      return frames;
    },
    [captureFrame]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return { isReady, error, stream, startCamera, stopCamera, captureFrame, captureFrameSequence };
}
