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

  // Función para detener la cámara completamente
  const stopScanner = useCallback(() => {
    console.log('🛑 Stopping scanner...');
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('Track stopped:', track.label);
      });
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }

    setIsScanning(false);
    setCameraReady(false);
    setError(null);
  }, [setIsScanning]);

  // Cleanup cuando el componente se desmonta
  useEffect(() => {
    return () => {
      console.log('🔄 Component unmounting - cleaning up camera');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Cleanup cuando se cambia de módulo (isScanning cambia a false externamente)
  useEffect(() => {
    if (!isScanning && streamRef.current) {
      console.log('📱 External stop detected');
      stopScanner();
    }
  }, [isScanning, stopScanner]);

  const startScanner = useCallback(async () => {
    console.log('🎥 Starting scanner...');
    setIsStarting(true);
    setError(null);
    setCameraReady(false);

    // Limpiar cualquier stream anterior
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a la cámara. Usa Chrome o Safari.');
      }

      // Obtener dispositivos primero
      let devices = await navigator.mediaDevices.enumerateDevices();
      let videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      console.log('📷 Found', videoDevices.length, 'cameras');
      setCameras(videoDevices);

      // Configuración de video
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        },
        audio: false
      };

      // Si hay dispositivos, intentar usar el específico
      if (videoDevices.length > 0) {
        const backCamera = videoDevices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('environment')
        );
        
        if (backCamera) {
          constraints.video = {
            deviceId: { ideal: backCamera.deviceId },
            width: { ideal: 1280, min: 640 },
            height: { ideal: 720, min: 480 }
          };
          const idx = videoDevices.findIndex(d => d.deviceId === backCamera.deviceId);
          if (idx >= 0) setCurrentCameraIndex(idx);
        }
      }

      console.log('📋 Requesting camera with constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      console.log('✅ Got stream:', stream.getTracks().map(t => t.label));

      if (!videoRef.current) {
        throw new Error('Video element no disponible');
      }

      const video = videoRef.current;
      
      // Configurar eventos ANTES de asignar src
      video.onloadedmetadata = () => {
        console.log('📐 Video metadata loaded:', video.videoWidth, 'x', video.videoHeight);
      };

      video.oncanplay = () => {
        console.log('🎬 Video can play');
      };

      video.onplay = () => {
        console.log('▶️ Video playing');
        setCameraReady(true);
        setIsScanning(true);
      };

      video.onerror = (e) => {
        console.error('❌ Video error:', e);
        setError('Error al mostrar video');
      };

      // Asignar stream al video
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      
      // Forzar carga y reproducción
      try {
        await video.load();
        console.log('📥 Video loaded');
      } catch (e) {
        console.log('Load warning:', e);
      }

      // Pequeña pausa antes de play
      await new Promise(r => setTimeout(r, 100));

      try {
        await video.play();
        console.log('🚀 Video play started');
      } catch (playError: any) {
        console.error('Play error:', playError);
        // Intentar reproducir con interacción del usuario
        setError('Toca la pantalla para activar la cámara');
      }

    } catch (err: any) {
      console.error('❌ Scanner error:', err);
      if (err.name === 'NotAllowedError') {
        setError('❌ Permiso denegado. Ve a configuración del navegador y permite el acceso a la cámara.');
      } else if (err.name === 'NotFoundError') {
        setError('❌ No se encontró cámara en este dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('❌ La cámara está siendo usada por otra aplicación.');
      } else {
        setError('❌ Error: ' + (err.message || 'Desconocido'));
      }
    } finally {
      setIsStarting(false);
    }
  }, [setIsScanning]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1 || !streamRef.current) return;
    
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    const nextDevice = cameras[nextIndex];
    
    console.log('🔄 Switching to camera:', nextDevice.label || nextDevice.deviceId);
    
    // Detener stream actual
    streamRef.current.getTracks().forEach(t => t.stop());
    streamRef.current = null;
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
      console.error('Switch error:', err);
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
      setError('Error interno de canvas');
      return;
    }

    setIsDecoding(true);
    setError(null);

    try {
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      
      console.log('📸 Capturing frame:', width, 'x', height);
      
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(video, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });

      if (!blob) {
        throw new Error('Error al capturar imagen');
      }

      console.log('📤 Sending QR for decode, size:', blob.size, 'bytes');

      const formData = new FormData();
      formData.append('file', blob, 'capture.jpg');

      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('📥 QR response:', data);
      
      if (data?.[0]?.symbol?.[0]?.data) {
        const qrData = data[0].symbol[0].data;
        console.log('✅ QR decoded:', qrData);
        onScan(qrData);
      } else if (data?.[0]?.error) {
        setError('Error del servidor: ' + data[0].error);
      } else {
        setError('❌ No se detectó código QR. Asegúrate de que esté bien iluminado y centrado.');
      }
    } catch (err: any) {
      console.error('❌ Decode error:', err);
      setError('Error al procesar: ' + err.message);
    } finally {
      setIsDecoding(false);
    }
  }, [cameraReady, isDecoding, onScan]);

  return (
    <div className="space-y-4">
      {/* Contenedor del video */}
      <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-xl bg-black shadow-2xl" style={{ minHeight: '320px' }}>
        <video 
          ref={videoRef}
          id="qr-video"
          className="w-full h-full block object-cover"
          style={{ 
            minHeight: '320px',
            maxHeight: '400px',
            backgroundColor: '#000'
          }}
          playsInline
          muted
          autoPlay
          controls={false}
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Placeholder cuando no hay cámara */}
        {!isStarting && !isScanning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-6">
            <Camera className="w-20 h-20 text-slate-500 mb-4" />
            <p className="text-lg font-medium text-slate-300">Cámara desactivada</p>
            <p className="text-sm text-slate-500 mt-2 text-center">
              Presiona el botón abajo para iniciar
            </p>
          </div>
        )}

        {/* Cargando */}
        {isStarting && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 p-6">
            <RefreshCw className="w-16 h-16 text-amber-500 animate-spin mb-4" />
            <p className="text-lg font-medium text-white">Iniciando cámara...</p>
            <p className="text-sm text-slate-400 mt-2 text-center">
              Si no funciona, verifica los permisos del navegador
            </p>
          </div>
        )}

        {/* Marco de escaneo - SOLO cuando está lista */}
        {isScanning && cameraReady && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-60 h-60">
              {/* Esquinas */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-amber-400 rounded-tl-2xl" />
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-amber-400 rounded-tr-2xl" />
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-amber-400 rounded-bl-2xl" />
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-amber-400 rounded-br-2xl" />
              {/* Centro */}
              <div className="absolute inset-6 border-2 border-white/20 rounded-lg" />
            </div>
          </div>
        )}

        {/* Indicador de estado */}
        {isScanning && (
          <div className="absolute top-3 left-3 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${cameraReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span className="text-white text-xs font-medium">
              {cameraReady ? 'Cámara lista' : 'Cargando...'}
            </span>
          </div>
        )}

        {/* Nombre de cámara */}
        {isScanning && cameras.length > 1 && (
          <div className="absolute top-3 right-3 px-3 py-1.5 bg-black/70 backdrop-blur-sm rounded-full">
            <span className="text-white text-xs">
              {cameras[currentCameraIndex]?.label?.substring(0, 15) || `Cámara ${currentCameraIndex + 1}`}
            </span>
          </div>
        )}

        {/* Procesando */}
        {isDecoding && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <RefreshCw className="w-16 h-16 text-amber-500 animate-spin mb-3" />
            <p className="text-lg font-medium text-white">Leyendo código QR...</p>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Controles */}
      <div className="flex justify-center gap-3 flex-wrap">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isStarting}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                Iniciando...
              </>
            ) : (
              <>
                <Camera className="w-6 h-6" />
                Iniciar Cámara
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={captureAndDecode}
              disabled={isDecoding || !cameraReady}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
            >
              {isDecoding ? (
                <>
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  Leyendo...
                </>
              ) : (
                <>
                  <Scan className="w-6 h-6" />
                  Escanear QR
                </>
              )}
            </button>
            
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                disabled={isDecoding}
                className="flex items-center justify-center w-14 h-14 bg-slate-600 text-white rounded-2xl font-medium shadow-lg hover:bg-slate-500 transition active:scale-95 disabled:opacity-50"
                title="Cambiar cámara"
              >
                <SwitchCamera className="w-6 h-6" />
              </button>
            )}
            
            <button
              onClick={stopScanner}
              className="flex items-center justify-center w-14 h-14 bg-red-500 text-white rounded-2xl font-medium shadow-lg hover:bg-red-400 transition active:scale-95"
              title="Apagar cámara"
            >
              <CameraOff className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Instrucciones */}
      {isScanning && cameraReady && (
        <div className="text-center space-y-1 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            📱 Centra el código QR dentro del marco
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
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
