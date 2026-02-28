'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, SwitchCamera, Scan, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export default function QRScanner({ onScan, isScanning, setIsScanning }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isDecoding, setIsDecoding] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Detener cámara
  const stopScanner = useCallback(() => {
    console.log('🛑 Stopping scanner');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
    setCameraReady(false);
    setError(null);
  }, [setIsScanning]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Iniciar cámara
  const startScanner = useCallback(async () => {
    console.log('🎥 Starting scanner');
    setIsStarting(true);
    setError(null);
    setCameraReady(false);

    // Limpiar anterior
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Navegador no soporta cámara');
      }

      // Obtener dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      console.log('📷 Cameras:', videoDevices.length);
      setCameras(videoDevices);

      // Constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      };

      // Obtener stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.log('✅ Got stream');

      // Asignar al video
      const video = videoRef.current;
      if (!video) {
        throw new Error('No video element');
      }

      // IMPORTANTE: Asignar srcObject y forzar play
      video.srcObject = stream;
      
      // Esperar a que el video esté listo
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = () => {
          console.log('📺 Video data loaded');
          resolve();
        };
        video.onerror = (e) => {
          console.error('❌ Video error:', e);
          reject(e);
        };
        // Timeout por si acaso
        setTimeout(() => resolve(), 3000);
      });

      // Play
      await video.play();
      console.log('▶️ Video playing');
      
      setCameraReady(true);
      setIsScanning(true);

    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.message || 'Error al iniciar cámara');
    } finally {
      setIsStarting(false);
    }
  }, [setIsScanning]);

  // Cambiar cámara
  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1 || !streamRef.current) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    const nextDevice = cameras[nextIndex];
    
    streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: nextDevice.deviceId } },
        audio: false
      });

      streamRef.current = stream;
      setCurrentCameraIndex(nextIndex);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setError('Error al cambiar cámara');
    }
  }, [cameras, currentCameraIndex]);

  // Capturar y decodificar QR
  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady || isDecoding) {
      setError('Cámara no lista');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    setIsDecoding(true);
    setError(null);

    try {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      ctx.drawImage(video, 0, 0);

      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.8));
      if (!blob) throw new Error('Error al capturar');

      console.log('📤 Sending QR...');

      const formData = new FormData();
      formData.append('file', blob, 'qr.jpg');

      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data?.[0]?.symbol?.[0]?.data) {
        console.log('✅ QR:', data[0].symbol[0].data);
        onScan(data[0].symbol[0].data);
      } else {
        setError('No se detectó QR. Intenta de nuevo.');
      }
    } catch (err: any) {
      setError('Error: ' + err.message);
    } finally {
      setIsDecoding(false);
    }
  }, [cameraReady, isDecoding, onScan]);

  return (
    <div className="space-y-4">
      {/* VIDEO - Simple y directo */}
      <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-black shadow-xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: 'auto',
            minHeight: '280px',
            maxHeight: '350px',
            display: 'block',
            objectFit: 'cover',
            backgroundColor: '#000',
            transform: 'scaleX(-1)' // Efecto espejo para cámara frontal
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        
        {/* Overlay cuando no hay cámara */}
        {(!isScanning && !isStarting) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
            <Camera className="w-16 h-16 text-slate-500 mb-3" />
            <p className="text-slate-400">Cámara apagada</p>
          </div>
        )}
        
        {/* Cargando */}
        {isStarting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
            <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mb-3" />
            <p className="text-white">Iniciando...</p>
          </div>
        )}
        
        {/* Marco cuando está lista */}
        {isScanning && cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border-4 border-amber-400 rounded-2xl opacity-70" />
          </div>
        )}
        
        {/* Procesando */}
        {isDecoding && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <RefreshCw className="w-12 h-12 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-300 rounded-xl p-3 text-center">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Botones */}
      <div className="flex justify-center gap-3">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isStarting}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-lg transition active:scale-95 disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
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
              disabled={isDecoding || !cameraReady}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition active:scale-95 disabled:opacity-50"
            >
              {isDecoding ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Scan className="w-5 h-5" />
                  Escanear QR
                </>
              )}
            </button>
            
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="p-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl transition"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={stopScanner}
              className="p-3 bg-red-500 hover:bg-red-400 text-white rounded-xl transition"
            >
              <CameraOff className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Instrucciones */}
      {isScanning && cameraReady && (
        <p className="text-center text-sm text-slate-500">
          Centra el QR y presiona <strong>Escanear QR</strong>
        </p>
      )}
    </div>
  );
}
