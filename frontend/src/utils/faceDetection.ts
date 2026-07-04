import * as faceapi from 'face-api.js';

let modelsLoaded = false;

/**
 * Load face-api.js TinyFaceDetector + landmark models.
 * Safe to call multiple times — loads once.
 */
export async function loadFaceModels(modelUrl: string): Promise<void> {
  if (modelsLoaded) return;
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
    ]);
    modelsLoaded = true;
  } catch (err) {
    console.warn('Could not load face-api.js models. Client-side detection disabled.', err);
    // Still set true so we don't retry forever
    modelsLoaded = true;
  }
}

/**
 * Detect a single face in the video element.
 */
export async function detectFace(
  video: HTMLVideoElement
): Promise<faceapi.FaceDetection | null> {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const detection = await faceapi.detectSingleFace(video, options);
  return detection ?? null;
}

/**
 * Detect a single face with 68-point landmarks.
 */
export async function detectFaceWithLandmarks(
  video: HTMLVideoElement
): Promise<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68> | null> {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });
  const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks(true);
  return result ?? null;
}

/**
 * Calculate Eye Aspect Ratio (EAR) from 68-point face landmarks.
 * Lower EAR = eyes more closed.
 */
export function calculateEAR(landmarks: faceapi.FaceLandmarks68): number {
  const pts = landmarks.positions;

  // Left eye: points 36-41
  const leftEye = computeEyeAR(pts, [36, 37, 38, 39, 40, 41]);
  // Right eye: points 42-47
  const rightEye = computeEyeAR(pts, [42, 43, 44, 45, 46, 47]);

  return (leftEye + rightEye) / 2;
}

function computeEyeAR(
  pts: faceapi.Point[],
  indices: number[]
): number {
  const [p1, p2, p3, p4, p5, p6] = indices.map((i) => pts[i]);
  const a = Math.hypot(p2.x - p6.x, p2.y - p6.y);
  const b = Math.hypot(p3.x - p5.x, p3.y - p5.y);
  const c = Math.hypot(p1.x - p4.x, p1.y - p4.y);
  return (a + b) / (2.0 * c);
}

/**
 * Rough head-pose estimation from nose tip vs. eye center.
 */
export function estimateHeadPose(landmarks: faceapi.FaceLandmarks68): {
  yaw: number;
  pitch: number;
} {
  const pts = landmarks.positions;
  const noseTip = pts[30];
  const leftEye = pts[36];
  const rightEye = pts[45];

  const eyeCenterX = (leftEye.x + rightEye.x) / 2;
  const eyeCenterY = (leftEye.y + rightEye.y) / 2;
  const eyeWidth = Math.abs(rightEye.x - leftEye.x);

  // Yaw: nose offset from eye center, normalized by eye-to-eye width
  const yaw = ((noseTip.x - eyeCenterX) / (eyeWidth || 1)) * 60;

  // Pitch: nose tip vertical offset from eye center
  const pitch = ((noseTip.y - eyeCenterY) / (eyeWidth || 1)) * 60;

  return { yaw, pitch };
}

/**
 * Draw a rounded face detection box on a canvas overlay.
 */
export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  detection: faceapi.FaceDetection,
  color: string = '#10b981'
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const { x, y, width, height } = detection.box;
  const padding = 20;
  const rx = x - padding;
  const ry = y - padding;
  const rw = width + padding * 2;
  const rh = height + padding * 2;
  const radius = 12;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(rx, ry, rw, rh, radius);
  ctx.stroke();

  // Corner accents
  const accentLen = 16;
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  // top-left
  drawCorner(ctx, rx, ry, accentLen, 1, 1);
  // top-right
  drawCorner(ctx, rx + rw, ry, accentLen, -1, 1);
  // bottom-left
  drawCorner(ctx, rx, ry + rh, accentLen, 1, -1);
  // bottom-right
  drawCorner(ctx, rx + rw, ry + rh, accentLen, -1, -1);

  // Confidence label
  const score = Math.round(detection.score * 100);
  ctx.font = '12px Inter, sans-serif';
  ctx.fillStyle = color;
  ctx.fillText(`${score}%`, rx + rw - 30, ry - 6);
}

function drawCorner(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  dx: number,
  dy: number
): void {
  ctx.beginPath();
  ctx.moveTo(x, y + len * dy);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len * dx, y);
  ctx.stroke();
}
