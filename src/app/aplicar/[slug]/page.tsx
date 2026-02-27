'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { 
  Briefcase, 
  MapPin, 
  Phone, 
  CheckCircle,
  Send,
  User,
  Mail,
  FileText,
  Clock,
  GraduationCap,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/components/ui/toaster';

interface Negocio {
  id: string;
  nombre: string;
  slug: string;
  telefono?: string;
  direccion?: string;
  descripcion?: string;
  puestoBuscado?: string;
  requisitos?: string;
  buscandoPersonal: boolean;
}

export default function AplicarPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    direccion: '',
    fechaNacimiento: '',
    puestoSolicitado: '',
    experiencia: '',
    educacion: '',
    habilidades: '',
    experienciaDetallada: '',
    disponibilidad: '',
    cvUrl: ''
  });

  useEffect(() => {
    loadNegocio();
  }, [slug]);

  const loadNegocio = async () => {
    try {
      const response = await fetch(`/api/negocio/${slug}`);
      const data = await response.json();
      
      if (response.ok) {
        setNegocio(data.negocio);
        if (data.negocio.puestoBuscado) {
          setFormData(prev => ({ ...prev, puestoSolicitado: data.negocio.puestoBuscado }));
        }
      } else {
        setError(data.error || 'Negocio no encontrado');
      }
    } catch (err) {
      setError('Error al cargar la información');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch('/api/candidatos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          ...formData
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.error || 'Error al enviar la aplicación');
      }
    } catch (err) {
      setError('Error al enviar la aplicación');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error && !negocio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-none shadow-lg text-center">
          <CardContent className="pt-8">
            <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Error</h2>
            <p className="text-slate-600">{error}</p>
            <p className="text-sm text-slate-500 mt-4">Verifica que el link sea correcto</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!negocio) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-none shadow-lg text-center">
          <CardContent className="pt-8">
            <AlertCircle className="w-16 h-16 mx-auto text-amber-400 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Negocio no encontrado</h2>
            <p className="text-slate-600">El link que intentas acceder no existe</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!negocio.buscandoPersonal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-none shadow-lg text-center">
          <CardContent className="pt-8">
            <Clock className="w-16 h-16 mx-auto text-amber-400 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">No hay vacantes activas</h2>
            <p className="text-slate-600">{negocio.nombre} no está recibiendo aplicaciones en este momento.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md border-none shadow-lg text-center">
          <CardContent className="pt-8">
            <CheckCircle className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">¡Aplicación enviada!</h2>
            <p className="text-slate-600">
              Gracias por aplicar a <strong>{negocio.nombre}</strong>. 
              Te contactaremos pronto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header del negocio */}
        <Card className="border-none shadow-lg mb-6">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">{negocio.nombre}</CardTitle>
            <CardDescription>Estamos contratando</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {negocio.puestoBuscado && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-4 h-4 text-emerald-600" />
                  <span><strong>Puesto:</strong> {negocio.puestoBuscado}</span>
                </div>
              )}
              {negocio.direccion && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>{negocio.direccion}</span>
                </div>
              )}
              {negocio.telefono && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>{negocio.telefono}</span>
                </div>
              )}
            </div>
            {negocio.requisitos && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h3 className="font-medium text-slate-800 mb-2">Requisitos:</h3>
                <p className="text-sm text-slate-600 whitespace-pre-line">{negocio.requisitos}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulario */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-600" />
              Aplicar a esta vacante
            </CardTitle>
            <CardDescription>Completa tus datos para aplicar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos personales */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Datos personales
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre completo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="tu@email.com"
                      required
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="+52 55 1234 5678"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    placeholder="Tu dirección"
                  />
                </div>
              </div>

              {/* Información profesional */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Información profesional
                </h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="puestoSolicitado">Puesto que solicitas</Label>
                    <Input
                      id="puestoSolicitado"
                      value={formData.puestoSolicitado}
                      onChange={(e) => setFormData({ ...formData, puestoSolicitado: e.target.value })}
                      placeholder="Ej: Cajero, Mesero..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experiencia">Años de experiencia</Label>
                    <Input
                      id="experiencia"
                      value={formData.experiencia}
                      onChange={(e) => setFormData({ ...formData, experiencia: e.target.value })}
                      placeholder="Ej: 2 años"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="educacion">Nivel educativo</Label>
                    <Input
                      id="educacion"
                      value={formData.educacion}
                      onChange={(e) => setFormData({ ...formData, educacion: e.target.value })}
                      placeholder="Ej: Preparatoria, Universidad..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="disponibilidad">Disponibilidad</Label>
                    <Input
                      id="disponibilidad"
                      value={formData.disponibilidad}
                      onChange={(e) => setFormData({ ...formData, disponibilidad: e.target.value })}
                      placeholder="Ej: Tiempo completo, Medio tiempo..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="habilidades">Habilidades</Label>
                  <Input
                    id="habilidades"
                    value={formData.habilidades}
                    onChange={(e) => setFormData({ ...formData, habilidades: e.target.value })}
                    placeholder="Ej: Atención al cliente, Manejo de caja..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experienciaDetallada">Experiencia laboral (opcional)</Label>
                  <Textarea
                    id="experienciaDetallada"
                    value={formData.experienciaDetallada}
                    onChange={(e) => setFormData({ ...formData, experienciaDetallada: e.target.value })}
                    placeholder="Describe tu experiencia laboral anterior..."
                    rows={3}
                  />
                </div>
              </div>

              {/* CV */}
              <div className="space-y-4">
                <h3 className="font-medium text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Currículum
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="cvUrl">Link a tu CV (Google Drive, Dropbox, etc.)</Label>
                  <Input
                    id="cvUrl"
                    type="url"
                    value={formData.cvUrl}
                    onChange={(e) => setFormData({ ...formData, cvUrl: e.target.value })}
                    placeholder="https://drive.google.com/..."
                  />
                  <p className="text-xs text-slate-500">
                    Sube tu CV a Google Drive o similar y pega el link aquí
                  </p>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar aplicación
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Al aplicar, aceptas que {negocio.nombre} pueda contactarte sobre esta vacante.
        </p>
      </div>
    </div>
  );
}
