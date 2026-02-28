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
  const [videoWidth, setVideoWidth] = useState(0);
  const [videoHeight, setVideoHeight] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const qrScannerRef = useRef<any>(null);
  const scanningRef = useRef<boolean>(false);

  // Cargar qr-scanner
  useEffect(() => {
    import('qr-scanner').then((module) => {
      qrScannerRef.current = module.default;
    });
  }, []);

  // Detener cámara
  const stopScanner = useCallback(() => {
    scanningRef.current = false;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setVideoWidth(0);
    setVideoHeight(0);
    setStatus('');
    setError(null);
  }, [setIsScanning]);

  // Cleanup
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Función de escaneo continuo
  const startScanning = useCallback(async () => {
    if (!videoRef.current || !qrScannerRef.current || !scanningRef.current) return;

    const video = videoRef.current;
    const QrScanner = qrScannerRef.current;

    try {
      const result = await QrScanner.scanImage(video, { returnDetailedScanResult: true });
      if (result?.data) {
        console.log('✅ QR:', result.data);
        setStatus('¡QR detectado!');
        onScan(result.data);
        return;
      }
    } catch {
      // No QR en este frame
    }

    // Continuar escaneando
    if (scanningRef.current) {
      requestAnimationFrame(startScanning);
    }
  }, [onScan]);

  // Iniciar cámara
  const startScanner = useCallback(async () => {
    console.log('🎬 Iniciando...');
    setError(null);
    setStatus('Solicitando permisos...');

    try {
      // Obtener stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      
      console.log('📷 Track:', track.label);
      console.log('📐 Settings:', settings);
      
      setStatus('Stream obtenido');

      // Obtener elemento video
      const video = videoRef.current;
      if (!video) {
        throw new Error('No video element');
      }

      // ASIGNAR STREAM AL VIDEO
      video.srcObject = stream;
      
      // IMPORTANTE: Esperar a que el video pueda reproducirse
      const waitForVideo = () => {
        return new Promise<void>((resolve) => {
          const checkReady = () => {
            if (video.readyState >= 2) {
              console.log('✅ Video ready:', video.readyState);
              resolve();
            } else {
              setTimeout(checkReady, 50);
            }
          };
          checkReady();
        });
      };

      // Reproducir
      await video.play();
      await waitForVideo();
      
      console.log('📺 Video dimensions:', video.videoWidth, 'x', video.videoHeight);
      setVideoWidth(video.videoWidth);
      setVideoHeight(video.videoHeight);
      setStatus('Cámara activa');
      setIsScanning(true);
      scanningRef.current = true;
      
      // Iniciar escaneo
      startScanning();

    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Error');
      setStatus('Error');
    }
  }, [setIsScanning, startScanning]);

  return (
    <div className="space-y-3">
      {/* ===== VIDEO CONTAINER - LO MÁS SIMPLE POSIBLE ===== */}
      <div 
        className="relative mx-auto rounded-xl overflow-hidden"
        style={{ 
          width: '100%',
          maxWidth: '320px',
          aspectRatio: '4/3',
          backgroundColor: '#000'
        }}
      >
        {/* VIDEO ELEMENT - Solo atributos esenciales */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            backgroundColor: '#000'
          }}
        />

        {/* Overlay solo cuando está APAGADO */}
        {!isScanning && videoWidth === 0 && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          >
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Presiona Iniciar</p>
            </div>
          </div>
        )}

        {/* Estado de éxito */}
        {status === '¡QR detectado!' && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          >
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
              <p className="text-white font-bold">¡QR Detectado!</p>
            </div>
          </div>
        )}
      </div>

      {/* INFO DE DEBUG */}
      {isScanning && videoWidth > 0 && (
        <div className="text-center text-xs text-green-600 font-medium">
          ✓ Cámara activa: {videoWidth}x{videoHeight}
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-xl text-sm text-center">
          {error}
        </div>
      )}

      {/* CONTROLES */}
      <div className="flex justify-center gap-3">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg transition active:scale-95"
          >
            <Camera className="w-5 h-5" />
            Iniciar Cámara
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition active:scale-95"
          >
            <CameraOff className="w-5 h-5" />
            Detener
          </button>
        )}
      </div>

      {/* INSTRUCCIONES */}
      {isScanning && (
        <p className="text-center text-sm text-slate-500">
          📱 Apunta al código QR - Escaneo automático
        </p>
      )}
    </div>
  );
}
