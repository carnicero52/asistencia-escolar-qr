'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, Scan, RefreshCw, Video } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export default function QRScanner({ onScan, isScanning, setIsScanning }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Listo');
  const [videoInfo, setVideoInfo] = useState('');
  const [isDecoding, setIsDecoding] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detener cámara
  const stopScanner = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setStatus('Cámara apagada');
    setVideoInfo('');
  }, [setIsScanning]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Iniciar cámara - MÉTODO ALTERNATIVO
  const startScanner = useCallback(async () => {
    setStatus('Iniciando...');
    setError(null);

    try {
      // Método 1: getUserMedia directo
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });
      
      streamRef.current = stream;
      setStatus('Stream obtenido');
      
      const track = stream.getVideoTracks()[0];
      console.log('Track:', track.label, track.getSettings());
      
      // Crear URL del stream (método alternativo)
      const video = videoRef.current;
      if (!video) {
        throw new Error('No video element');
      }

      // IMPORTANTE: Usar ambos métodos
      video.srcObject = stream;
      
      // Forzar play con interacción
      const playPromise = video.play();
      
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      // Verificar que el video tiene dimensiones
      const checkVideo = () => {
        if (video.videoWidth > 0) {
          setVideoInfo(`${video.videoWidth}x${video.videoHeight}`);
          setStatus('Video activo');
          setIsScanning(true);
        } else {
          setTimeout(checkVideo, 100);
        }
      };
      checkVideo();

    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message);
      setStatus('Error');
    }
  }, [setIsScanning]);

  // Capturar
  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDecoding(true);

    try {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.9));
      if (!blob) throw new Error('No blob');

      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      const res = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (data?.[0]?.symbol?.[0]?.data) {
        onScan(data[0].symbol[0].data);
      } else {
        setError('No se detectó QR');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsDecoding(false);
    }
  }, [onScan]);

  return (
    <div className="space-y-4">
      {/* Video container con fondo visible */}
      <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden border-4 border-slate-300 bg-slate-800">
        {/* Video element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          controls={false}
          className="w-full block"
          style={{
            minHeight: '300px',
            maxHeight: '400px',
            backgroundColor: '#1a1a2e',
            objectFit: 'cover'
          }}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Debug info */}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          {status} {videoInfo && `(${videoInfo})`}
        </div>
        
        {/* Mensaje cuando está apagado */}
        {!isScanning && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-slate-400">
              <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Cámara apagada</p>
            </div>
          </div>
        )}
        
        {/* Procesando */}
        {isDecoding && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <RefreshCw className="w-10 h-10 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-center gap-3">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition"
          >
            <Camera className="w-5 h-5" />
            Iniciar Cámara
          </button>
        ) : (
          <>
            <button
              onClick={captureAndDecode}
              disabled={isDecoding}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition disabled:opacity-50"
            >
              {isDecoding ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Scan className="w-5 h-5" />
              )}
              Escanear QR
            </button>
            
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition"
            >
              <CameraOff className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Debug: mostrar imagen de prueba */}
      <div className="text-center text-xs text-slate-400 mt-2">
        Si la imagen está oscura, intenta recargar la página (F5)
      </div>
    </div>
  );
}
