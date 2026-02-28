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

  const stopScanner = useCallback(() => {
    console.log('Stopping scanner...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }

    setIsScanning(false);
    setCameraReady(false);
  }, [setIsScanning]);

  const startScanner = useCallback(async () => {
    setIsStarting(true);
    setError(null);
    setCameraReady(false);

    console.log('Starting scanner...');

    try {
      // Verificar soporte de mediaDevices
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara');
      }

      // Primero obtener permisos con una solicitud básica
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' },
          audio: false 
        });
      } catch (permErr: any) {
        console.error('Permission error:', permErr);
        if (permErr.name === 'NotAllowedError') {
          throw new Error('Permiso denegado. Por favor permite el acceso a la cámara en la configuración de tu navegador.');
        }
        throw permErr;
      }

      // Obtener lista de cámaras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      console.log('Found cameras:', videoDevices.length);
      setCameras(videoDevices);
      
      if (videoDevices.length === 0) {
        stream.getTracks().forEach(t => t.stop());
        throw new Error('No se encontraron cámaras');
      }

      // Si hay múltiples cámaras, intentar usar la trasera
      if (videoDevices.length > 1) {
        // Detener stream inicial
        stream.getTracks().forEach(t => t.stop());
        
        // Buscar cámara trasera
        const backCamera = videoDevices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('camera 2')
        );
        
        const targetDeviceId = backCamera?.deviceId || videoDevices[0].deviceId;
        const targetIndex = videoDevices.findIndex(d => d.deviceId === targetDeviceId);
        setCurrentCameraIndex(targetIndex >= 0 ? targetIndex : 0);

        // Crear nuevo stream con el dispositivo específico
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: targetDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      }

      streamRef.current = stream;

      // Configurar video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // IMPORTANTE: Forzar reproducción
        videoRef.current.onloadedmetadata = async () => {
          console.log('Video metadata loaded');
          if (videoRef.current) {
            try {
              await videoRef.current.play();
              console.log('Video playing');
              setCameraReady(true);
              setIsScanning(true);
            } catch (playErr) {
              console.error('Play error:', playErr);
              setError('Error al reproducir video');
            }
          }
        };

        videoRef.current.onerror = (e) => {
          console.error('Video error:', e);
          setError('Error al cargar video');
        };
      }

    } catch (err: any) {
      console.error('Scanner error:', err);
      setError(err.message || 'Error al iniciar la cámara');
      setIsScanning(false);
    } finally {
      setIsStarting(false);
    }
  }, [setIsScanning]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1 || !streamRef.current) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    const nextDevice = cameras[nextIndex];
    
    console.log('Switching to camera:', nextDevice.label);
    
    // Detener stream actual
    streamRef.current.getTracks().forEach(t => t.stop());
    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: nextDevice.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      setCurrentCameraIndex(nextIndex);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: any) {
      console.error('Switch camera error:', err);
      setError('Error al cambiar cámara');
    }
  }, [cameras, currentCameraIndex]);

  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady || isDecoding) {
      setError('La cámara no está lista');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setError('Error de canvas');
      return;
    }

    setIsDecoding(true);
    setError(null);

    try {
      // Usar dimensiones reales del video
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      
      canvas.width = width;
      canvas.height = height;
      
      // Dibujar frame actual
      ctx.drawImage(video, 0, 0, width, height);

      // Convertir a blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) {
        throw new Error('Error al capturar');
      }

      console.log('Sending QR for decode, size:', blob.size);

      // Enviar a API de QR
      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('QR response:', data);
      
      if (data?.[0]?.symbol?.[0]?.data) {
        const qrData = data[0].symbol[0].data;
        console.log('QR decoded:', qrData);
        onScan(qrData);
      } else {
        setError('No se detectó código QR. Asegúrate de que esté bien iluminado y centrado.');
      }
    } catch (err: any) {
      console.error('Decode error:', err);
      setError('Error al procesar QR: ' + err.message);
    } finally {
      setIsDecoding(false);
    }
  }, [cameraReady, isDecoding, onScan]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Contenedor del video */}
      <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-xl bg-black shadow-xl">
        <video 
          ref={videoRef}
          className="w-full block"
          style={{ 
            minHeight: '300px',
            maxHeight: '400px',
            objectFit: 'cover',
            backgroundColor: '#000'
          }}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay cuando no hay cámara */}
        {!isScanning && !isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center text-white p-6">
              <Camera className="w-16 h-16 mx-auto mb-4 opacity-60" />
              <p className="text-lg font-medium">Cámara desactivada</p>
              <p className="text-sm text-slate-400 mt-2">Presiona "Iniciar Cámara"</p>
            </div>
          </div>
        )}

        {/* Cargando */}
        {isStarting && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center text-white p-6">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 animate-spin" />
              <p>Iniciando cámara...</p>
              <p className="text-sm text-slate-400 mt-2">Permite el acceso cuando el navegador lo solicite</p>
            </div>
          </div>
        )}

        {/* Marco de escaneo */}
        {isScanning && cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-56 h-56">
              <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-amber-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-amber-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-amber-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-amber-400 rounded-br-xl" />
              <div className="absolute inset-4 border-2 border-white/30 rounded-lg" />
            </div>
          </div>
        )}

        {/* Indicador de cámara lista */}
        {isScanning && (
          <div className="absolute top-3 left-3 px-3 py-1 bg-black/60 rounded-full flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-white text-xs">{cameraReady ? 'Cámara lista' : 'Cargando...'}</span>
          </div>
        )}

        {/* Procesando */}
        {isDecoding && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center text-white p-6">
              <RefreshCw className="w-12 h-12 mx-auto mb-3 animate-spin" />
              <p className="font-medium">Leyendo código QR...</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">⚠️ {error}</p>
        </div>
      )}

      {/* Controles */}
      <div className="flex justify-center gap-3 flex-wrap">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isStarting}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {isDecoding ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Procesando
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
                disabled={isDecoding}
                className="flex items-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-xl font-medium shadow-lg hover:bg-slate-500 transition disabled:opacity-50"
                title="Cambiar cámara"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-4 py-3 bg-red-500 text-white rounded-xl font-medium shadow-lg hover:bg-red-400 transition"
              title="Detener cámara"
            >
              <CameraOff className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Instrucciones */}
      {isScanning && cameraReady && (
        <div className="text-center space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            📱 Centra el código QR dentro del marco amarillo
          </p>
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            👆 Presiona "Escanear QR" para capturar
          </p>
        </div>
      )}

      {cameras.length > 1 && !isScanning && !isStarting && (
        <p className="text-center text-xs text-slate-400">
          📷 {cameras.length} cámaras detectadas
        </p>
      )}
    </div>
  );
}
