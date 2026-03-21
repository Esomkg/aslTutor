import { useEffect, useRef, useState, useCallback } from "react";

const TARGET_FPS = 15;
const FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  error: string | null;
  isReady: boolean;
  captureFrame: () => string | null; // returns base64 JPEG or null
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, frameRate: { ideal: TARGET_FPS } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setIsReady(true);
        }
      } catch {
        setError("No camera detected. Please allow camera access.");
      }
    }

    startCamera();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
      setIsReady(false);
    };
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isReady) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    // Returns base64 string without the data:image/jpeg;base64, prefix
    return canvas.toDataURL("image/jpeg", 0.7).split(",")[1];
  }, [isReady]);

  return { videoRef, canvasRef, error, isReady, captureFrame };
}

export { FRAME_INTERVAL_MS };
