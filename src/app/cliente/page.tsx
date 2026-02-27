'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  QrCode,
  Search,
  Gift,
  ShoppingBag,
  ArrowLeft,
  Download,
  CheckCircle,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';

interface ClienteData {
  id: string;
  nombre: string;
  email: string;
  telefono: string | null;
  comprasTotal: number;
  recompensasPendientes: number;
  recompensasCanjeadas: number;
  qrCodigo: string;
  negocio: {
    nombre: string;
  };
}

export default function ClientePage() {
  const [email, setEmail] = useState('');
  const [cliente, setCliente] = useState<ClienteData | null>(null);
  const [qrDataURL, setQrDataURL] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  // Generar QR cuando cambia el cliente
  useEffect(() => {
    if (cliente) {
      generateQR(cliente.qrCodigo);
    }
  }, [cliente]);

  const generateQR = async (codigo: string) => {
    try {
      // El QR contiene el código único del cliente
      // El negocio lo escanea y el sistema lo reconoce
      const qrData = codigo;
      const dataUrl = await QRCode.toDataURL(qrData, {
        width: 256,
        margin: 2,
        color: {
          dark: '#7c3aed',
          light: '#ffffff'
        }
      });
      setQrDataURL(dataUrl);
    } catch (error) {
      console.error('Error generating QR:', error);
    }
  };

  const buscarCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setNotFound(false);
    setCliente(null);
    setQrDataURL(null);

    try {
      const response = await fetch(`/api/cliente/qr?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setNotFound(true);
        } else {
          throw new Error(data.error || 'Error al buscar');
        }
        return;
      }

      setCliente(data.cliente);
    } catch (error: unknown) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al buscar cliente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const descargarQR = () => {
    if (!cliente || !qrDataURL) return;

    // Crear canvas con QR completo
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 380;

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header con gradiente
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 60);
    gradient.addColorStop(0, '#7c3aed');
    gradient.addColorStop(1, '#9333ea');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, 60);

    // Nombre del negocio
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(cliente.negocio.nombre, canvas.width / 2, 25);

    // Nombre del cliente
    ctx.font = 'bold 14px Arial';
    ctx.fillText(cliente.nombre, canvas.width / 2, 48);

    // QR Image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 22, 70, 256, 256);

      // Título
      ctx.fillStyle = '#7c3aed';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Mi QR Personal', canvas.width / 2, 355);

      // Código
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px monospace';
      ctx.fillText(cliente.qrCodigo.substring(0, 20) + '...', canvas.width / 2, 372);

      // Descargar
      const link = document.createElement('a');
      link.download = `qr-${cliente.nombre.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    img.src = qrDataURL;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-violet-50 to-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold">FideliQR</span>
              <span className="text-violet-600 text-sm ml-1">v2</span>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          {!cliente ? (
            <Card className="border-none shadow-lg">
              <CardHeader className="text-center">
                <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-violet-600" />
                </div>
                <CardTitle className="text-2xl">Mi QR Personal</CardTitle>
                <CardDescription>
                  Ingresa tu email para ver tu código QR de fidelización
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={buscarCliente} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Tu email</Label>
                    <div className="relative">
                      <Input
                        id="email"
                        type="email"
                        placeholder="tu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="pr-10"
                      />
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-violet-600 hover:bg-violet-700"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : 'Buscar mi QR'}
                  </Button>
                </form>

                {notFound && (
                  <div className="mt-6 p-4 bg-amber-50 rounded-lg text-center">
                    <p className="text-amber-700 text-sm">
                      No encontramos un cliente con ese email.
                    </p>
                    <p className="text-amber-600 text-xs mt-1">
                      Pide al negocio que te registre para obtener tu QR personal.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* QR Card */}
              <Card className="border-none shadow-lg overflow-hidden">
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-6 text-white text-center">
                  <p className="text-sm opacity-80">{cliente.negocio.nombre}</p>
                  <h2 className="text-2xl font-bold mt-1">{cliente.nombre}</h2>
                </div>
                <CardContent className="pt-6 text-center">
                  {/* QR Real */}
                  <div className="w-48 h-48 mx-auto bg-white border-2 border-violet-200 rounded-xl flex items-center justify-center mb-4 overflow-hidden">
                    {qrDataURL ? (
                      <img 
                        src={qrDataURL} 
                        alt="Mi QR" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Presenta este código en cada compra
                  </p>
                  <Button
                    onClick={descargarQR}
                    variant="outline"
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Descargar QR
                  </Button>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="text-center">
                  <CardContent className="pt-4">
                    <ShoppingBag className="w-6 h-6 text-violet-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{cliente.comprasTotal}</p>
                    <p className="text-xs text-muted-foreground">Compras</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-4">
                    <Gift className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{cliente.recompensasPendientes}</p>
                    <p className="text-xs text-muted-foreground">Premios</p>
                  </CardContent>
                </Card>
                <Card className="text-center">
                  <CardContent className="pt-4">
                    <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold">{cliente.recompensasCanjeadas}</p>
                    <p className="text-xs text-muted-foreground">Canjeados</p>
                  </CardContent>
                </Card>
              </div>

              {/* Progreso */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Próxima recompensa</span>
                    <span className="text-sm text-muted-foreground">
                      {cliente.comprasTotal % 10}/10 compras
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all"
                      style={{ width: `${(cliente.comprasTotal % 10) * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {10 - (cliente.comprasTotal % 10)} compras más para tu próximo premio
                  </p>
                </CardContent>
              </Card>

              {/* Volver */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setCliente(null);
                  setQrDataURL(null);
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Buscar otro cliente
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          FideliQR v2 - Sistema de Fidelización Digital
        </div>
      </footer>
    </div>
  );
}
