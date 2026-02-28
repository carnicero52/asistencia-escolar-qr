'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, SwitchCamera, RefreshCw, CheckCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export default function QRScanner({ onScan, isScanning, setIsScanning }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('Listo');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const qrScannerRef = useRef<any>(null);

  // Cargar qr-scanner dinámicamente
  useEffect(() => {
    import('qr-scanner').then((module) => {
      qrScannerRef.current = module.default;
      console.log('✅ qr-scanner cargado');
    }).catch(err => {
      console.error('❌ Error cargando qr-scanner:', err);
    });
  }, []);

  // Detener todo
  const stopScanner = useCallback(() => {
    console.log('🛑 Deteniendo...');
    
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
      videoRef.current.load();
    }
    
    setIsScanning(false);
    setStatus('Detenido');
    setError(null);
  }, [setIsScanning]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Iniciar cámara
  const startScanner = useCallback(async () => {
    console.log('🎬 Iniciando cámara...');
    setStatus('Iniciando...');
    setError(null);

    try {
      // Obtener lista de dispositivos primero
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setCameras(videoDevices);
      console.log('📷 Cámaras:', videoDevices.length);

      // Seleccionar cámara
      let targetDevice = videoDevices[cameraIndex]?.deviceId;
      
      // Si no hay índice, buscar trasera
      if (!targetDevice && videoDevices.length > 0) {
        const backCam = videoDevices.find(d => 
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('trasera') ||
          d.label.toLowerCase().includes('rear')
        );
        targetDevice = backCam?.deviceId || videoDevices[0].deviceId;
      }

      // Obtener stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: targetDevice ? { exact: targetDevice } : undefined,
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      console.log('✅ Stream obtenido:', stream.getTracks()[0].label);

      const video = videoRef.current;
      if (!video) throw new Error('No video element');

      // Asignar stream
      video.srcObject = stream;
      
      // IMPORTANTE: Esperar a que el video tenga datos
      video.onloadeddata = () => {
        console.log('📺 Video data loaded:', video.videoWidth, 'x', video.videoHeight);
        setStatus(`${video.videoWidth}x${video.videoHeight}`);
        
        // Iniciar escaneo con qr-scanner
        if (qrScannerRef.current) {
          startQRScanning();
        }
      };

      video.onerror = (e) => {
        console.error('❌ Video error:', e);
        setError('Error al cargar video');
      };

      // Play
      await video.play();
      console.log('▶️ Video playing');
      setIsScanning(true);

    } catch (err: any) {
      console.error('❌ Error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permiso denegado. Haz clic en el icono de cámara en la barra de direcciones y permite el acceso.');
      } else if (err.name === 'NotFoundError') {
        setError('No se encontró cámara en este dispositivo.');
      } else if (err.name === 'NotReadableError') {
        setError('La cámara está siendo usada por otra aplicación. Cierra otras apps que usen cámara.');
      } else {
        setError(err.message || 'Error desconocido');
      }
      setStatus('Error');
    }
  }, [cameraIndex, setIsScanning]);

  // Escaneo continuo con qr-scanner
  const startQRScanning = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !qrScannerRef.current) return;

    const QrScanner = qrScannerRef.current;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const scanFrame = async () => {
      if (!streamRef.current || !video.videoWidth) {
        animationRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      try {
        // Usar qr-scanner para decodificar
        const result = await QrScanner.scanImage(video, { 
          returnDetailedScanResult: true 
        });
        
        if (result?.data) {
          console.log('✅ QR detectado:', result.data);
          setStatus('¡QR detectado!');
          onScan(result.data);
          return; // Detener escaneo después de detectar
        }
      } catch {
        // No hay QR en este frame, continuar
      }

      // Continuar escaneando
      animationRef.current = requestAnimationFrame(scanFrame);
    };

    scanFrame();
  }, [onScan]);

  // Cambiar cámara
  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;

    stopScanner();
    const nextIndex = (cameraIndex + 1) % cameras.length;
    setCameraIndex(nextIndex);
    
    // Pequeña pausa
    await new Promise(r => setTimeout(r, 200));
    startScanner();
  }, [cameras, cameraIndex, stopScanner, startScanner]);

  return (
    <div className="space-y-3">
      {/* CONTENEDOR VIDEO */}
      <div 
        className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-black"
        style={{ 
          aspectRatio: '3/4',
          maxHeight: '450px'
        }}
      >
        {/* VIDEO - Estilos inline forzados */}
        <video
          ref={videoRef}
          id="qr-video-element"
          autoPlay
          playsInline
          muted
          controls={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#000',
            display: 'block',
            transform: 'scaleX(1)'
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Overlay cuando apagado */}
        {!isScanning && (
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}
          >
            <Camera className="w-16 h-16 text-slate-500 mb-3" />
            <p className="text-slate-400 text-lg">Cámara apagada</p>
          </div>
        )}

        {/* Estado */}
        {isScanning && (
          <div 
            className="absolute top-3 left-3 px-3 py-1.5 rounded-full flex items-center gap-2"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-white text-xs font-medium">Escaneando...</span>
          </div>
        )}

        {/* Info de resolución */}
        {isScanning && status.includes('x') && (
          <div 
            className="absolute bottom-3 left-3 px-2 py-1 rounded text-white text-xs"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            {status}
          </div>
        )}

        {/* QR detectado */}
        {status === '¡QR detectado!' && (
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
          >
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
              <p className="text-white text-lg font-bold">¡QR Detectado!</p>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-100 border border-red-300 rounded-xl p-3 text-center">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* CONTROLES */}
      <div className="flex justify-center gap-3">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="flex items-center gap-2 px-8 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-lg shadow-lg active:scale-95 transition"
          >
            <Camera className="w-6 h-6" />
            Iniciar Cámara
          </button>
        ) : (
          <>
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-medium active:scale-95 transition"
              >
                <SwitchCamera className="w-5 h-5" />
                Cambiar
              </button>
            )}
            
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold active:scale-95 transition"
            >
              <CameraOff className="w-5 h-5" />
              Detener
            </button>
          </>
        )}
      </div>

      {/* Instrucciones */}
      {isScanning && (
        <div className="text-center text-sm text-slate-500 px-4">
          📱 Apunta la cámara al código QR - El escaneo es automático
        </div>
      )}

      {cameras.length > 0 && !isScanning && (
        <p className="text-center text-xs text-slate-400">
          📷 {cameras.length} cámara(s) detectada(s)
        </p>
      )}
    </div>
  );
}
