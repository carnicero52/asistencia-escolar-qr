'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, CheckCircle, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export default function QRScanner({ onScan, isScanning, setIsScanning }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [frameCount, setFrameCount] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);

  // Cargar qr-scanner
  useEffect(() => {
    import('qr-scanner').then((module) => {
      qrScannerRef.current = module.default;
    });
  }, []);

  // Detener cámara
  const stopScanner = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setFrameCount(0);
    setStatus('');
    setError(null);
  }, [setIsScanning]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Renderizar video en canvas y escanear
  const renderAndScan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState < 2) {
      animationRef.current = requestAnimationFrame(renderAndScan);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dibujar frame del video en canvas
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    
    canvas.width = vw;
    canvas.height = vh;
    ctx.drawImage(video, 0, 0, vw, vh);
    
    // Contador de frames para verificar que está funcionando
    setFrameCount(prev => prev + 1);

    // Escanear QR cada 5 frames
    if (frameCount % 5 === 0 && qrScannerRef.current) {
      qrScannerRef.current.scanImage(canvas, { returnDetailedScanResult: true })
        .then((result: any) => {
          if (result?.data) {
            console.log('✅ QR:', result.data);
            setStatus('¡QR detectado!');
            onScan(result.data);
            return;
          }
        })
        .catch(() => {});
    }

    // Continuar loop
    animationRef.current = requestAnimationFrame(renderAndScan);
  }, [frameCount, onScan]);

  // Iniciar cámara
  const startScanner = useCallback(async () => {
    console.log('🎬 Iniciando cámara...');
    setError(null);
    setStatus('Iniciando...');

    try {
      // Obtener stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      streamRef.current = stream;
      console.log('✅ Stream obtenido');
      setStatus('Stream listo');

      // Video oculto (solo para capturar datos)
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play();
      }

      // Esperar a que el video esté listo
      await new Promise<void>((resolve) => {
        const check = () => {
          if (video && video.readyState >= 2) {
            console.log('📺 Video ready:', video.videoWidth, 'x', video.videoHeight);
            resolve();
          } else {
            setTimeout(check, 100);
          }
        };
        check();
      });

      setIsScanning(true);
      setStatus('Escaneando...');
      
      // Iniciar renderizado en canvas
      renderAndScan();

    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message);
      setStatus('Error');
    }
  }, [setIsScanning, renderAndScan]);

  // Captura manual
  const captureNow = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError('Video no listo');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      if (qrScannerRef.current) {
        const result = await qrScannerRef.current.scanImage(canvas, { returnDetailedScanResult: true });
        if (result?.data) {
          setStatus('¡QR detectado!');
          onScan(result.data);
          return;
        }
      }
      setStatus('No se detectó QR');
      setTimeout(() => setStatus('Escaneando...'), 2000);
    } catch (e) {
      setStatus('Error al escanear');
    }
  }, [onScan]);

  return (
    <div className="space-y-3">
      {/* VIDEO OCULTO */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{ display: 'none' }}
      />

      {/* CANVAS VISIBLE - Aquí se muestra la imagen */}
      <div 
        className="relative mx-auto rounded-xl overflow-hidden border-4 border-amber-400"
        style={{ 
          width: '100%',
          maxWidth: '320px',
          aspectRatio: '4/3',
          backgroundColor: '#000'
        }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />

        {/* Overlay cuando apagado */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Cámara apagada</p>
            </div>
          </div>
        )}

        {/* Indicador de estado */}
        {isScanning && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/70 rounded-full flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white text-xs">{status}</span>
          </div>
        )}

        {/* Frame counter - para verificar que el video está funcionando */}
        {isScanning && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded text-white text-xs">
            Frame: {frameCount}
          </div>
        )}

        {/* QR detectado */}
        {status === '¡QR detectado!' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
              <p className="text-white font-bold text-lg">¡QR Detectado!</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {/* Controles */}
      <div className="flex justify-center gap-3">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition active:scale-95"
          >
            <Camera className="w-5 h-5" />
            Iniciar Cámara
          </button>
        ) : (
          <>
            <button
              onClick={captureNow}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition active:scale-95"
            >
              📷 Capturar QR
            </button>
            
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold transition active:scale-95"
            >
              <CameraOff className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Instrucciones */}
      {isScanning && (
        <p className="text-center text-sm text-slate-500">
          El contador "Frame" debe incrementar → La cámara funciona
        </p>
      )}
    </div>
  );
}
