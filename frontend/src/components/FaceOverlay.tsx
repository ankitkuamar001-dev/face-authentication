import { useEffect, useRef } from 'react';
import { detectFace, drawFaceOverlay } from '../utils/faceDetection';

interface FaceOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isActive: boolean;
}

export function FaceOverlay({ videoRef, isActive }: FaceOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      return;
    }

    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 720;

      const detection = await detectFace(video);
      if (detection) {
        drawFaceOverlay(canvas, detection, '#10b981');
      } else {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          // Draw crosshair
          const cx = canvas.width / 2;
          const cy = canvas.height / 2;
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - 20, cy);
          ctx.lineTo(cx + 20, cy);
          ctx.moveTo(cx, cy - 20);
          ctx.lineTo(cx, cy + 20);
          ctx.stroke();
        }
      }

      // ~15 fps
      await new Promise((r) => setTimeout(r, 66));
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isActive, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      style={{ transform: 'scaleX(-1)' }}
    />
  );
}
