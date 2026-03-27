import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SilentCameraProps {
  /** Called with the uploaded photo URL, or null on failure */
  onCapture: (url: string | null) => void;
  /** When true, takes a snapshot immediately */
  trigger: boolean;
}

/**
 * Invisible component that keeps a camera stream running
 * and captures a single frame on demand (no visible UI).
 */
export function SilentCamera({ onCapture, trigger }: SilentCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  // Start camera stream on mount
  useEffect(() => {
    let cancelled = false;

    async function startStream() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setReady(true);
        }
      } catch {
        console.warn('Silent camera: could not start stream');
        setReady(false);
      }
    }

    startStream();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setReady(false);
    };
  }, []);

  const capture = useCallback(async (): Promise<string | null> => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !ready) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.7)
    );
    if (!blob) return null;

    const filename = `time-clock/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await supabase.storage
      .from('control-photos')
      .upload(filename, blob, { contentType: 'image/jpeg', upsert: false });

    if (error) {
      console.error('Silent camera upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('control-photos')
      .getPublicUrl(filename);

    return urlData.publicUrl;
  }, [ready]);

  // React to trigger changes
  useEffect(() => {
    if (trigger) {
      capture().then(onCapture);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none', overflow: 'hidden' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </>
  );
}
