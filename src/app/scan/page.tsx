'use client';

import { useEffect, useRef, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  QrCode, 
  ShoppingBag, 
  CheckCircle, 
  Gift, 
  Store, 
  Camera,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import jsQR from 'jsqr';

interface Negocio {
  id: string;
  nombre: string;
  direccion?: string;
}

interface CompraResult {
  compra: {
    id: string;
    compraNumero: number;
    esRecompensa: boolean;
  };
  cliente: {
    id: string;
    nombre: string;
    email: string;
    comprasTotal: number;
    recompensasPendientes: number;
    recompensaAlcanzada: boolean;
  };
}

function ScanContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const negocioId = searchParams.get('negocio');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [compraResult, setCompraResult] = useState<CompraResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  
  useEffect(() => {
    if (negocioId) {
      fetchNegocio();
    } else {
      setIsLoading(false);
    }
    
    return () => {
      stopCamera();
    };
  }, [negocioId]);
  
  useEffect(() => {
    if (cameraActive && !compraResult) {
      startScanning();
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [cameraActive, compraResult]);

  const fetchNegocio = async () => {
    try {
      const response = await fetch(`/api/negocio?id=${negocioId}`);
      const data = await response.json();
      
      if (response.ok) {
        setNegocio(data.negocio);
      }
    } catch (error) {
      console.error('Error fetching negocio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const startScanning = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(startScanning);
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    
    if (code) {
      handleQRCode(code.data);
    } else {
      animationRef.current = requestAnimationFrame(startScanning);
    }
  };

  const handleQRCode = async (qrData: string) => {
    console.log('QR detectado:', qrData);
    setScanError(null);
    
    // El QR del cliente contiene su qrCodigo único
    // Puede venir como URL o solo el código
    let qrCodigo = qrData;
    
    // Si es una URL, extraer el parámetro
    if (qrData.includes('cliente=')) {
      const url = new URL(qrData, window.location.origin);
      qrCodigo = url.searchParams.get('cliente') || qrData;
    }
    
    stopCamera();
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocioId: negocio?.id,
          qrCodigo: qrCodigo,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.cooldown) {
          setScanError(data.error);
          // Reactivar cámara después de mostrar error
          setTimeout(() => {
            setScanError(null);
            startCamera();
          }, 3000);
        } else {
          throw new Error(data.error || 'Error al registrar compra');
        }
        return;
      }
      
      setCompraResult(data);
      
    } catch (error: unknown) {
      setScanError(error instanceof Error ? error.message : 'Error desconocido');
      // Permitir reintentar
      setTimeout(() => {
        setScanError(null);
        startCamera();
      }, 3000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetScan = () => {
    setCompraResult(null);
    setScanError(null);
    startCamera();
  };

  const calculateProgress = (total: number) => {
    return (total % 10) * 10;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!negocioId || !negocio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-background p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acceso no válido</h2>
            <p className="text-muted-foreground mb-4">
              Debes acceder desde el panel de administración.
            </p>
            <Link href="/admin">
              <Button className="bg-violet-600 hover:bg-violet-700">
                Ir al panel
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-violet-50 to-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">{negocio.nombre}</h1>
              <p className="text-xs text-muted-foreground">Escanear QR del cliente</p>
            </div>
          </div>
          <Link href="/admin">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {compraResult ? (
            // Resultado de la compra
            <Card className="border-none shadow-lg">
              <CardHeader className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${
                  compraResult.cliente.recompensaAlcanzada 
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500' 
                    : 'bg-violet-100'
                }`}>
                  {compraResult.cliente.recompensaAlcanzada ? (
                    <Gift className="w-8 h-8 text-white" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-violet-600" />
                  )}
                </div>
                <CardTitle className="text-2xl">
                  {compraResult.cliente.recompensaAlcanzada 
                    ? '¡Recompensa!' 
                    : 'Compra Registrada'}
                </CardTitle>
                <CardDescription>
                  {compraResult.cliente.nombre}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-4xl font-bold text-violet-600">
                    #{compraResult.compra.compraNumero}
                  </p>
                  <p className="text-sm text-muted-foreground">compra total</p>
                </div>
                
                {compraResult.cliente.recompensaAlcanzada && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                    <p className="text-amber-800 font-medium">
                      🎁 Este cliente tiene una recompensa pendiente
                    </p>
                    <p className="text-amber-600 text-sm mt-1">
                      Total: {compraResult.cliente.recompensasPendientes} recompensas
                    </p>
                  </div>
                )}
                
                <div className="bg-muted rounded-xl p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Próxima recompensa</span>
                    <span className="font-medium">
                      {compraResult.cliente.comprasTotal % 10}/10
                    </span>
                  </div>
                  <Progress value={calculateProgress(compraResult.cliente.comprasTotal)} />
                </div>
                
                <Button 
                  onClick={resetScan}
                  className="w-full bg-violet-600 hover:bg-violet-700 gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Escanear otro cliente
                </Button>
              </CardContent>
            </Card>
          ) : (
            // Escáner
            <Card className="border-none shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-8 h-8 text-violet-600" />
                </div>
                <CardTitle>Escanear QR del Cliente</CardTitle>
                <CardDescription>
                  Apunta la cámara al código QR personal del cliente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Video y Canvas para escaneo */}
                <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
                  {!cameraActive && !cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Button onClick={startCamera} className="bg-violet-600 hover:bg-violet-700 gap-2">
                        <Camera className="w-4 h-4" />
                        Activar Cámara
                      </Button>
                    </div>
                  )}
                  
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                      <XCircle className="w-12 h-12 text-red-500 mb-2" />
                      <p className="text-white text-sm">{cameraError}</p>
                      <Button onClick={startCamera} variant="outline" size="sm" className="mt-4">
                        Reintentar
                      </Button>
                    </div>
                  )}
                  
                  <video 
                    ref={videoRef} 
                    className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Marco de escaneo */}
                      <div className="absolute inset-8 border-2 border-violet-500 rounded-xl">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-violet-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-violet-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-violet-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-violet-400 rounded-br-lg" />
                      </div>
                    </div>
                  )}
                  
                  {isSubmitting && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
                        <p className="text-white">Registrando...</p>
                      </div>
                    </div>
                  )}
                </div>
                
                {scanError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                    <p className="text-red-800 text-sm">{scanError}</p>
                  </div>
                )}
                
                {cameraActive && (
                  <div className="text-center text-sm text-muted-foreground">
                    <ShoppingBag className="w-4 h-4 inline mr-2" />
                    Esperando código QR del cliente...
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-violet-50 to-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
