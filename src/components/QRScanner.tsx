'use client';

import { useState, useRef, useCallback } from 'react';
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startScanner = useCallback(async () => {
    setIsStarting(true);
    setError(null);

    try {
      // Primero pedir permisos y obtener dispositivos
      const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
      tempStream.getTracks().forEach(t => t.stop());
      
      // Obtener lista de cámaras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      
      if (videoDevices.length === 0) {
        setError('No se encontraron cámaras en este dispositivo');
        setIsStarting(false);
        return;
      }

      // Iniciar con la cámara seleccionada (preferir trasera)
      const backCamera = videoDevices.find(d => 
        d.label.toLowerCase().includes('back') || 
        d.label.toLowerCase().includes('trasera') ||
        d.label.toLowerCase().includes('rear') ||
        d.label.toLowerCase().includes('environment')
      );
      
      const targetDevice = backCamera || videoDevices[currentCameraIndex] || videoDevices[0];
      const targetIndex = videoDevices.indexOf(targetDevice);
      if (targetIndex >= 0) setCurrentCameraIndex(targetIndex);

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: targetDevice.deviceId ? { exact: targetDevice.deviceId } : undefined,
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        
        // Esperar a que el video esté listo
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }
          
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play()
              .then(() => resolve())
              .catch(reject);
          };
          
          videoRef.current.onerror = () => {
            reject(new Error('Error loading video'));
          };
        });
      }

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permiso denegado. Por favor permite el acceso a la cámara en tu navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró ninguna cámara en este dispositivo.');
      } else {
        setError(err.message || 'Error al iniciar la cámara');
      }
    } finally {
      setIsStarting(false);
    }
  }, [currentCameraIndex, setIsScanning]);

  const stopScanner = useCallback(() => {
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
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    
    // Pequeña pausa antes de reiniciar
    await new Promise(r => setTimeout(r, 300));
    
    // Reiniciar con nueva cámara
    try {
      const targetDevice = cameras[nextIndex];
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: { exact: targetDevice.deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsScanning(true);
    } catch (err) {
      console.error('Error switching camera:', err);
      setError('Error al cambiar de cámara');
    }
  }, [cameras, currentCameraIndex, stopScanner, setIsScanning]);

  const captureAndDecode = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isDecoding) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      setError('Error al crear contexto de canvas');
      return;
    }
    
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      setError('La cámara aún no está lista. Espera un momento.');
      return;
    }

    setIsDecoding(true);
    setError(null);

    try {
      // Capturar imagen del video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convertir a blob
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png', 0.9);
      });

      if (!blob) {
        setError('Error al capturar imagen');
        return;
      }

      // Enviar a API de QR
      const formData = new FormData();
      formData.append('file', blob, 'capture.png');

      const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      console.log('QR decode response:', data);
      
      if (data && data[0] && data[0].symbol && data[0].symbol[0] && data[0].symbol[0].data) {
        const qrData = data[0].symbol[0].data;
        onScan(qrData);
      } else {
        setError('No se detectó código QR. Asegúrate de que el QR esté bien iluminado y centrado.');
      }
    } catch (err: any) {
      console.error('Error decoding QR:', err);
      setError('Error al procesar el QR. Intenta de nuevo.');
    } finally {
      setIsDecoding(false);
    }
  }, [isDecoding, onScan]);

  return (
    <div className="space-y-4">
      {/* Video de la cámara */}
      <div className="relative w-full max-w-md mx-auto overflow-hidden rounded-xl bg-black" style={{ minHeight: '300px' }}>
        <video 
          ref={videoRef}
          className="w-full h-auto block"
          style={{ maxHeight: '400px', objectFit: 'cover' }}
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Placeholder cuando no hay cámara */}
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <div className="text-center text-slate-400 p-4">
              <Camera className="w-16 h-16 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">Cámara desactivada</p>
              <p className="text-sm mt-1">Presiona "Iniciar Cámara" para comenzar</p>
            </div>
          </div>
        )}
        
        {/* Marco de escaneo */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-52 h-52">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
            </div>
          </div>
        )}

        {/* Indicador de decodificación */}
        {isDecoding && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <RefreshCw className="w-10 h-10 mx-auto animate-spin mb-2" />
              <p>Procesando QR...</p>
            </div>
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
      <div className="flex justify-center gap-3 flex-wrap">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isStarting}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50"
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
              disabled={isDecoding}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50"
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
                className="flex items-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-xl font-medium shadow-lg hover:bg-slate-500 transition"
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
      {isScanning && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400 space-y-1">
          <p>📌 Centra el código QR dentro del marco</p>
          <p>👆 Presiona <strong>"Escanear QR"</strong> para capturar</p>
        </div>
      )}

      {cameras.length > 1 && !isScanning && (
        <div className="text-center text-xs text-slate-400">
          📷 {cameras.length} cámara(s) disponibles
        </div>
      )}
    </div>
  );
}
