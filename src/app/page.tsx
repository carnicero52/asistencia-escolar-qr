'use client';

import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Clock, QrCode, CheckCircle, XCircle, Camera, LogIn, LogOut,
  Settings, RefreshCw, Volume2, VolumeX
} from 'lucide-react';

interface Empleado {
  id: string;
  codigo: string;
  nombre: string;
  apellido: string;
  qrCodigo: string;
  puesto?: string;
}

interface Empresa {
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  toleranciaMinutos: number;
}

export default function EscanerQR() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [scanResult, setScanResult] = useState<{
    success: boolean; 
    message: string; 
    detalle?: string;
    empleado?: Empleado; 
    hora?: string;
    tipo?: string;
  } | null>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mode, setMode] = useState<'entrada' | 'salida'>('entrada');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef<string>('qr-reader');

  const [currentTime, setCurrentTime] = useState(new Date());
  const [today] = useState(new Date().toLocaleDateString('es-ES', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  }));

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    cargarConfig();
    return () => {
      stopScanner();
    };
  }, []);

  const cargarConfig = async () => {
    try {
      const res = await fetch('/api/asistencia/config');
      const data = await res.json();
      setEmpresa(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const playSound = (success: boolean) => {
    if (!soundEnabled) return;
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (success) {
        oscillator.frequency.value = 880;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
      } else {
        oscillator.frequency.value = 220;
        oscillator.type = 'square';
        gainNode.gain.value = 0.2;
      }
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, success ? 150 : 300);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  const startScanner = async () => {
    try {
      const html5QrCode = new Html5Qrcode(scannerIdRef.current);
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 300, height: 300 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        onScanFailure
      );
      
      setIsScanning(true);
    } catch (error) {
      console.error('Error starting scanner:', error);
      alert('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    // Evitar escaneos duplicados (mínimo 3 segundos entre escaneos)
    const now = Date.now();
    if (now - lastScanTime < 3000) return;
    setLastScanTime(now);

    // Buscar empleado por código QR
    try {
      const res = await fetch(`/api/asistencia/empleados/buscar?qr=${decodedText}`);
      const data = await res.json();
      
      if (!data.empleado) {
        playSound(false);
        setScanResult({
          success: false,
          message: 'Código QR no reconocido'
        });
        return;
      }

      const empleado = data.empleado;
      
      // Registrar entrada o salida
      const fecha = new Date().toISOString().split('T')[0];
      const regRes = await fetch('/api/asistencia/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          empleadoId: empleado.id, 
          tipo: mode.toUpperCase(), 
          fecha 
        })
      });
      
      const regData = await regRes.json();
      
      if (regData.error) {
        playSound(false);
        setScanResult({
          success: false,
          message: regData.error,
          detalle: regData.detalle
        });
        return;
      }

      playSound(true);
      const hora = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', minute: '2-digit' 
      });
      
      setScanResult({
        success: true,
        message: `${mode === 'entrada' ? 'Entrada' : 'Salida'} registrada`,
        empleado,
        hora,
        tipo: mode
      });

      // Auto-ocultar después de 4 segundos
      setTimeout(() => {
        setScanResult(null);
      }, 4000);

    } catch (error) {
      playSound(false);
      setScanResult({
        success: false,
        message: 'Error al procesar el código'
      });
    }
  };

  const onScanFailure = (error: string) => {
    // No mostrar errores de escaneo continuo
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p>Cargando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{empresa?.nombre || 'Control de Asistencia'}</h1>
                <p className="text-emerald-400 text-xs">Escáner QR</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white transition"
              >
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <a
                href="/admin"
                className="p-2 rounded-lg bg-white/10 text-white/70 hover:text-white transition"
              >
                <Settings className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {/* Hora */}
        <div className="text-center mb-6">
          <p className="text-5xl font-bold text-white font-mono">{formatTime(currentTime)}</p>
          <p className="text-slate-400 capitalize mt-1">{today}</p>
        </div>

        {/* Mode Selector */}
        <div className="flex bg-black/30 rounded-2xl p-1.5 mb-6">
          <button
            onClick={() => setMode('entrada')}
            className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
              mode === 'entrada'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-5 h-5" />
            ENTRADA
          </button>
          <button
            onClick={() => setMode('salida')}
            className={`flex-1 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
              mode === 'salida'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogOut className="w-5 h-5" />
            SALIDA
          </button>
        </div>

        {/* Scan Result */}
        {scanResult && (
          <div className={`mb-6 p-6 rounded-2xl text-center ${
            scanResult.success 
              ? 'bg-emerald-500/20 border-2 border-emerald-500' 
              : 'bg-red-500/20 border-2 border-red-500'
          }`}>
            {scanResult.success ? (
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
            ) : (
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-3" />
            )}
            
            <p className="text-2xl font-bold text-white mb-1">
              {scanResult.success ? '¡Registrado!' : 'Error'}
            </p>
            
            {scanResult.empleado && (
              <div className="mb-2">
                <p className="text-xl text-white font-medium">
                  {scanResult.empleado.nombre} {scanResult.empleado.apellido}
                </p>
                <p className="text-slate-300">
                  {scanResult.tipo === 'entrada' ? 'Entrada' : 'Salida'} - {scanResult.hora}
                </p>
              </div>
            )}
            
            <p className="text-slate-300">{scanResult.message}</p>
            {scanResult.detalle && (
              <p className="text-slate-400 text-sm mt-1">{scanResult.detalle}</p>
            )}
          </div>
        )}

        {/* Scanner Area */}
        <div className="relative">
          {!isScanning ? (
            <div className="aspect-square bg-black/50 rounded-3xl border-2 border-dashed border-slate-600 flex flex-col items-center justify-center">
              <Camera className="w-20 h-20 text-slate-500 mb-4" />
              <p className="text-slate-400 text-center px-8">
                Presiona el botón para activar la cámara
              </p>
              <button
                onClick={startScanner}
                className="mt-6 px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-semibold text-lg shadow-lg shadow-emerald-500/30 transition transform hover:scale-105"
              >
                <Camera className="w-6 h-6 inline mr-2" />
                Activar Escáner
              </button>
            </div>
          ) : (
            <div className="relative">
              <div 
                id={scannerIdRef.current}
                className="w-full aspect-square rounded-3xl overflow-hidden"
              />
              
              {/* Overlay con instrucciones */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-4 left-4 right-4 bg-black/50 rounded-xl p-3 text-center">
                  <p className="text-white font-medium">
                    {mode === 'entrada' ? '📍 Escanea para ENTRADA' : '🚪 Escanea para SALIDA'}
                  </p>
                </div>
                
                {/* Esquinas decorativas */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>
                </div>
              </div>
              
              <button
                onClick={stopScanner}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 px-6 py-3 bg-red-500/90 hover:bg-red-500 text-white rounded-xl font-medium transition"
              >
                Detener Escáner
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-black/30 rounded-xl p-4 border border-white/10">
          <div className="flex items-center justify-between text-sm">
            <div className="text-center">
              <p className="text-slate-400">Entrada</p>
              <p className="text-white font-semibold">{empresa?.horaEntrada || '09:00'}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400">Salida</p>
              <p className="text-white font-semibold">{empresa?.horaSalida || '18:00'}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-400">Tolerancia</p>
              <p className="text-white font-semibold">{empresa?.toleranciaMinutos || 15} min</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-xs mt-6">
          Presenta tu código QR personal frente a la cámara
        </p>
      </main>
    </div>
  );
}
