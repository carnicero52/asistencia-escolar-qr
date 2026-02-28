'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CameraOff, SwitchCamera, RefreshCw, AlertTriangle } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export default function QRScanner({ onScan, isScanning, setIsScanning }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string>('');
  const [qrScanner, setQrScanner] = useState<any>(null);
  const [hasFlash, setHasFlash] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Cargar QRScanner dinámicamente
  useEffect(() => {
    let mounted = true;
    
    import('qr-scanner').then((module) => {
      if (mounted) {
        setQrScanner(() => module.default);
      }
    }).catch((err) => {
      console.error('Error loading qr-scanner:', err);
      setError('Error al cargar el escáner');
    });

    return () => { mounted = false; };
  }, []);

  // Obtener cámaras disponibles
  const getCameras = useCallback(async () => {
    if (!qrScanner) return;
    
    try {
      const devices = await qrScanner.listCameras(true);
      setCameras(devices);
      
      // Buscar cámara trasera
      const backCamera = devices.find((d: any) => 
        d.label?.toLowerCase().includes('back') ||
        d.label?.toLowerCase().includes('trasera') ||
        d.label?.toLowerCase().includes('rear')
      );
      
      setCurrentCamera(backCamera?.id || devices[0]?.id || '');
    } catch (err) {
      console.error('Error listing cameras:', err);
    }
  }, [qrScanner]);

  // Crear escáner
  const scannerRef = useRef<any>(null);

  const startScanner = useCallback(async () => {
    if (!qrScanner || !videoRef.current) {
      setError('Escáner no disponible');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Obtener cámaras
      await getCameras();

      // Crear el escáner
      scannerRef.current = new qrScanner(
        videoRef.current,
        (result: any) => {
          console.log('QR detectado:', result.data);
          onScan(result.data);
          // Opcional: detener después de escanear
          // stopScanner();
        },
        {
          preferredCamera: currentCamera || 'environment',
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
          onDecodeError: (error: any) => {
            // Ignorar errores de decodificación mientras busca
          },
        }
      );

      // Iniciar
      await scannerRef.current.start();
      
      // Verificar si tiene flash
      const hasFlashSupport = await scannerRef.current.hasFlash();
      setHasFlash(hasFlashSupport);

      setIsScanning(true);
      
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      if (err.name === 'NotAllowedError') {
        setError('❌ Permiso denegado. Por favor permite el acceso a la cámara.');
      } else if (err.name === 'NotFoundError') {
        setError('❌ No se encontró cámara en este dispositivo.');
      } else {
        setError('❌ ' + (err.message || 'Error al iniciar cámara'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [qrScanner, currentCamera, getCameras, onScan, setIsScanning]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
    setFlashOn(false);
  }, [setIsScanning]);

  const switchCamera = useCallback(async () => {
    if (!scannerRef.current || cameras.length <= 1) return;

    const currentIndex = cameras.findIndex(c => c.id === currentCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCamera = cameras[nextIndex].id;

    try {
      await scannerRef.current.setCamera(nextCamera);
      setCurrentCamera(nextCamera);
    } catch (err) {
      console.error('Error switching camera:', err);
    }
  }, [cameras, currentCamera]);

  const toggleFlash = useCallback(async () => {
    if (!scannerRef.current || !hasFlash) return;
    
    try {
      await scannerRef.current.toggleFlash();
      setFlashOn(!flashOn);
    } catch (err) {
      console.error('Error toggling flash:', err);
    }
  }, [hasFlash, flashOn]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, []);

  // Actualizar cámaras cuando cambie qrScanner
  useEffect(() => {
    if (qrScanner && !isScanning) {
      getCameras();
    }
  }, [qrScanner, getCameras, isScanning]);

  if (!qrScanner) {
    return (
      <div className="text-center py-8 text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
        Cargando escáner...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video */}
      <div className="relative w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-black shadow-xl">
        <video
          ref={videoRef}
          className="w-full block"
          style={{ 
            minHeight: '280px',
            maxHeight: '400px',
            objectFit: 'cover'
          }}
          playsInline
          muted
        />

        {/* Overlay cuando está apagado */}
        {!isScanning && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
            <Camera className="w-16 h-16 text-slate-500 mb-3" />
            <p className="text-slate-400 text-lg">Cámara apagada</p>
            <p className="text-slate-500 text-sm mt-1">Presiona el botón para iniciar</p>
          </div>
        )}

        {/* Cargando */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
            <RefreshCw className="w-12 h-12 text-amber-500 animate-spin mb-3" />
            <p className="text-white">Iniciando cámara...</p>
          </div>
        )}

        {/* Indicador de cámara activa */}
        {isScanning && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/70 backdrop-blur rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium">Escaneando</span>
            </div>
          </div>
        )}

        {/* Info de cámara */}
        {isScanning && cameras.length > 1 && (
          <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 backdrop-blur rounded text-white text-xs">
            {cameras.find(c => c.id === currentCamera)?.label?.substring(0, 12) || `Cam ${currentCameraIndex + 1}`}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            {error}
          </p>
        </div>
      )}

      {/* Controles */}
      <div className="flex justify-center gap-3 flex-wrap">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isLoading}
            className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {isLoading ? (
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
            {/* Cambiar cámara */}
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 px-4 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-xl font-medium transition active:scale-95"
                title="Cambiar cámara"
              >
                <SwitchCamera className="w-5 h-5" />
                Cambiar
              </button>
            )}

            {/* Flash */}
            {hasFlash && (
              <button
                onClick={toggleFlash}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition active:scale-95 ${
                  flashOn 
                    ? 'bg-yellow-500 hover:bg-yellow-400 text-white' 
                    : 'bg-slate-600 hover:bg-slate-500 text-white'
                }`}
                title={flashOn ? 'Apagar flash' : 'Encender flash'}
              >
                💡 {flashOn ? 'Apagar' : 'Flash'}
              </button>
            )}

            {/* Detener */}
            <button
              onClick={stopScanner}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold transition active:scale-95"
            >
              <CameraOff className="w-5 h-5" />
              Detener
            </button>
          </>
        )}
      </div>

      {/* Instrucciones */}
      {isScanning && (
        <div className="text-center bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
          <p className="text-amber-700 dark:text-amber-300 font-medium">
            📱 Apunta la cámara al código QR
          </p>
          <p className="text-amber-600 dark:text-amber-400 text-sm mt-1">
            El escaneo es automático - no necesitas presionar nada más
          </p>
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

// Helper para el index
let currentCameraIndex = 0;
