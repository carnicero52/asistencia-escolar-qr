'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, CameraOff, SwitchCamera, Scan } from 'lucide-react';

interface QRScannerProps {
  onScan: (data: string) => void;
  isScanning: boolean;
  setIsScanning: (value: boolean) => void;
}

export default function QRScanner({ onScan, isScanning, setIsScanning }: QRScannerProps) {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentCamera, setCurrentCamera] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [Html5Qrcode, setHtml5Qrcode] = useState<any>(null);

  // Solo ejecutar en cliente
  useEffect(() => {
    setIsClient(true);
    
    // Importar dinámicamente html5-qrcode solo en cliente
    import('html5-qrcode').then((module) => {
      setHtml5Qrcode(() => module.Html5Qrcode);
      
      // Obtener lista de cámaras
      module.Html5Qrcode.getCameras()
        .then((devices: any[]) => {
          if (devices && devices.length > 0) {
            setCameras(devices);
            // Preferir cámara trasera
            const backCamera = devices.find(d => 
              d.label.toLowerCase().includes('back') || 
              d.label.toLowerCase().includes('trasera') ||
              d.label.toLowerCase().includes('rear')
            );
            setCurrentCamera(backCamera?.id || devices[0].id);
          }
        })
        .catch((err: Error) => {
          console.error('Error getting cameras:', err);
          setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
        });
    }).catch((err) => {
      console.error('Error loading html5-qrcode:', err);
      setError('Error al cargar el escáner de QR');
    });

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  const startScanner = useCallback(async () => {
    if (!Html5Qrcode || !currentCamera) return;
    
    setIsStarting(true);
    setError(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      await scannerRef.current.start(
        currentCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          // QR escaneado exitosamente
          onScan(decodedText);
        },
        (errorMessage: string) => {
          // Ignorar errores de escaneo continuo
          console.debug('Scan error:', errorMessage);
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error starting scanner:', err);
      setError(err.message || 'Error al iniciar la cámara');
    } finally {
      setIsStarting(false);
    }
  }, [Html5Qrcode, currentCamera, onScan, setIsScanning]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  }, [isScanning, setIsScanning]);

  const switchCamera = useCallback(async () => {
    if (cameras.length <= 1) return;
    
    await stopScanner();
    
    const currentIndex = cameras.findIndex(c => c.id === currentCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setCurrentCamera(cameras[nextIndex].id);
    
    // Reiniciar con la nueva cámara
    setTimeout(() => startScanner(), 300);
  }, [cameras, currentCamera, stopScanner, startScanner]);

  // No renderizar nada en SSR
  if (!isClient) {
    return (
      <div className="text-center py-8 text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2" />
        Cargando escáner...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Contenedor del scanner */}
      <div 
        id="qr-reader" 
        className={`w-full max-w-md mx-auto overflow-hidden rounded-xl border-2 ${
          isScanning ? 'border-amber-400' : 'border-slate-200 dark:border-slate-600'
        } bg-slate-100 dark:bg-slate-700`}
        style={{ minHeight: isScanning ? '300px' : '100px' }}
      >
        {!isScanning && (
          <div className="flex items-center justify-center h-24 text-slate-400">
            <Camera className="w-8 h-8 mr-2" />
            <span>Cámara desactivada</span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-sm text-red-700 dark:text-red-300">
            <strong>Error:</strong> {error}
          </p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Asegúrate de permitir el acceso a la cámara en tu navegador y que estás usando HTTPS.
          </p>
        </div>
      )}

      {/* Controles */}
      <div className="flex justify-center gap-3">
        {!isScanning ? (
          <button
            onClick={startScanner}
            disabled={isStarting || cameras.length === 0 || !Html5Qrcode}
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
              onClick={stopScanner}
              className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
            >
              <CameraOff className="w-5 h-5" />
              Detener
            </button>
            
            {cameras.length > 1 && (
              <button
                onClick={switchCamera}
                className="flex items-center gap-2 px-4 py-3 bg-slate-500 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
              >
                <SwitchCamera className="w-5 h-5" />
                Cambiar
              </button>
            )}
          </>
        )}
      </div>

      {/* Instrucciones */}
      {isScanning && (
        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
          <Scan className="w-5 h-5 inline-block mr-1 animate-pulse" />
          Apunta la cámara al código QR del estudiante
        </div>
      )}

      {/* Lista de cámaras disponibles */}
      {cameras.length > 1 && !isScanning && (
        <div className="text-center text-xs text-slate-400">
          {cameras.length} cámara(s) detectada(s)
        </div>
      )}
    </div>
  );
}
