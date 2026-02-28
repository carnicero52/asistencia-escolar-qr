'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, SwitchCamera, Scan } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export default function QRScanner({ onScan, isScanning, setIsScanning }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanningRef = useRef(false);

  // Obtener lista de cámaras
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter(d => d.kind === 'videoinput');
          setCameras(videoDevices);
          // Preferir cámara trasera
          const backCamera = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('trasera') ||
            d.label.toLowerCase().includes('rear')
          );
          setCurrentCamera(backCamera?.deviceId || videoDevices[0]?.deviceId || '');
        })
        .catch((err) => {
          console.error('Error getting cameras:', err);
          setError('No se pudo acceder a la lista de cámaras');
        });
    }
  }, []);

  // Función para escanear QR usando API externa (más confiable)
  const scanQRCode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !scanningRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      if (scanningRef.current) {
        requestAnimationFrame(scanQRCode);
      }
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = canvas.toDataURL('image/png');
      
      // Usar API externa para decodificar QR
      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: new URLSearchParams({
          'fileurl': '',
          'file': imageData.split(',')[1] || ''
        })
      });

      // Por ahora, usar método simple de captura manual
    } catch (err) {
      // Ignorar errores de escaneo continuo
    }

    if (scanningRef.current) {
      setTimeout(() => scanQRCode(), 500);
    }
  }, []);

  const startScanner = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: currentCamera 
          ? { deviceId: { exact: currentCamera } }
          : { facingMode: 'environment' }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      scanningRef.current = true;
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Error al iniciar la cámara. Verifica los permisos.');
    } finally {
      setIsStarting(false);
    }
  }, [currentCamera, setIsScanning]);

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
  }, [setIsScanning]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;
    
    stopScanner();
    
    const currentIndex = cameras.findIndex(c => c.deviceId === currentCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setCurrentCamera(cameras[nextIndex].deviceId);
    
    setTimeout(() => startScanner(), 300);
  }, [cameras, currentCamera, stopScanner, startScanner]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Capturar frame para QR manual
  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError('La cámara no está lista');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      // Convertir a blob y enviar a API de QR
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const formData = new FormData();
      formData.append('file', blob, 'qr.png');

      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data && data[0] && data[0].symbol && data[0].symbol[0]) {
        const qrData = data[0].symbol[0].data;
        if (qrData) {
          onScan(qrData);
          return;
        }
      }
      
      setError('No se detectó código QR. Intenta de nuevo.');
    } catch (err) {
      console.error('Error decoding QR:', err);
      setError('Error al procesar el QR');
    }
  }, [onScan]);

  return (
    <div className="space-y-4">
      {/* Video de la cámara */}
      <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-xl border-2 border-amber-400 bg-black">
        <video 
          ref={videoRef}
          className="w-full"
          style={{ maxHeight: '300px' }}
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
            <div className="text-center text-slate-400">
              <Camera className="w-12 h-12 mx-auto mb-2" />
              <p>Cámara desactivada</p>
            </div>
          </div>
        )}
        
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-white/50 rounded-lg" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Controles */}
      <div className="flex justify-center gap-3">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isStarting}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Camera className="w-5 h-5" />
                Iniciar Cámara
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={captureAndDecode}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
            >
              <Scan className="w-5 h-5" />
              Escanear QR
            </button>
            
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 px-4 py-3 bg-slate-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
            >
              <CameraOff className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Instrucciones */}
      {isScanning && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          Centra el QR en el cuadro y presiona <strong>"Escanear QR"</strong>
        </div>
      )}

      {cameras.length > 1 && !isScanning && (
        <div className="text-center text-xs text-slate-400">
          {cameras.length} cámara(s) detectada(s)
        </div>
      )}
    </div>
  );
}
