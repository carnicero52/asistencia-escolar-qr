'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  QrCode, Users, BookOpen, Calendar, Settings, Plus, Search, X, Save,
  CheckCircle, AlertTriangle, Clock, User, Mail, Phone, Hash,
  Download, Printer, Eye, Trash2, Edit, RefreshCw, Moon, Sun,
  BarChart3, TrendingUp, UserCheck, UserX, Camera, Scan, Upload, FileText,
  Link, Send, Bot, Check, ExternalLink
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Importar QRScanner dinámicamente (sin SSR)
const QRScanner = dynamic(() => import('@/components/QRScanner'), { ssr: false });

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface Estudiante {
  id: string;
  matricula: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  grupo?: string;
  qrToken: string;
  activo: boolean;
  fotoUrl?: string;
  // Contactos de padres
  nombrePadre?: string;
  emailPadre?: string;
  telefonoPadre?: string;
  telegramPadre?: string;
  nombreMadre?: string;
  emailMadre?: string;
  telefonoMadre?: string;
  telegramMadre?: string;
  // Telegram linking
  telegramChatIdPadre?: string;
  telegramChatIdMadre?: string;
  padreVinculado?: boolean;
  madreVinculada?: boolean;
  _count?: { asistencias: number };
  asistenciaHoy?: { estado: string; horaRegistro: string } | null;
}

interface Clase {
  id: string;
  codigo: string;
  nombre: string;
  profesor?: string;
  salon?: string;
  diaSemana: number;
  diaNombre: string;
  horaInicio: string;
  horaFin: string;
  toleranciaMinutos: number;
  activa: boolean;
  _count?: { asistencias: number };
}

interface Asistencia {
  id: string;
  estudianteId: string;
  claseId: string;
  fecha: string;
  horaRegistro: string;
  estado: 'PRESENTE' | 'RETARDO' | 'AUSENTE';
  minutosRetraso: number;
  estudiante: Estudiante;
  clase: Clase;
}

interface Config {
  id: string;
  nombreInstitucion: string;
  logo?: string;
  horaInicioGeneral: string;
  toleranciaMinutos: number;
  diasClase: string;
  // Notificaciones Email
  enviarNotificaciones: boolean;
  emailAdmin?: string;
  emailRemitente?: string;
  nombreRemitente?: string;
  // Notificaciones Telegram
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramBotUsername?: string;
  telegramWebhookUrl?: string;
  enviarTelegram: boolean;
  enviarTelegramPadres: boolean;
  // Qué notificar
  notificarRetardo: boolean;
  notificarAusencia: boolean;
  notificarEntrada: boolean;
  colorPrimario: string;
  mensajeBienvenida: string;
}

interface Notificacion {
  id: string;
  estudianteId: string;
  tipo: string;
  canal: string;
  destino: string;
  asunto?: string;
  mensaje: string;
  enviado: boolean;
  error?: string;
  fechaEnvio?: string;
  createdAt: string;
  estudiante: {
    nombre: string;
    apellido: string;
    matricula: string;
    grupo?: string;
  };
}

interface DashboardData {
  fecha: string;
  resumen: {
    totalEstudiantes: number;
    totalClases: number;
    asistenciasHoy: number;
    presentesHoy: number;
    retardosHoy: number;
    asistenciasMes: number;
  };
  ultimasAsistencias: Asistencia[];
}

interface PadreVinculado {
  id: string;
  telegramUsername?: string;
  telegramChatId: string;
  tipo: 'PADRE' | 'MADRE';
  estudianteId: string;
  estudiante: {
    nombre: string;
    apellido: string;
    matricula: string;
    grupo?: string;
  };
  fechaVinculacion: string;
  codigoVinculacion?: string;
}

// ─────────────────────────────────────────────────────────────
// COLORES POR MÓDULO
// ─────────────────────────────────────────────────────────────

const moduleColors = {
  dashboard: { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-100', text: 'text-emerald-600' },
  estudiantes: { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-100', text: 'text-violet-600' },
  clases: { bg: 'from-cyan-500 to-blue-600', light: 'bg-cyan-100', text: 'text-cyan-600' },
  scanner: { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-100', text: 'text-amber-600' },
  manual: { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-100', text: 'text-rose-600' },
  notificaciones: { bg: 'from-pink-500 to-rose-600', light: 'bg-pink-100', text: 'text-pink-600' },
  reportes: { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-100', text: 'text-rose-600' },
  config: { bg: 'from-slate-500 to-gray-600', light: 'bg-slate-100', text: 'text-slate-600' },
  padres: { bg: 'from-indigo-500 to-blue-600', light: 'bg-indigo-100', text: 'text-indigo-600' },
};

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function SistemaAsistenciaQR() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  
  // Data states
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [clases, setClases] = useState<Clase[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [selectedEstudiante, setSelectedEstudiante] = useState<Estudiante | null>(null);
  const [selectedClase, setSelectedClase] = useState<Clase | null>(null);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [padresVinculados, setPadresVinculados] = useState<PadreVinculado[]>([]);
  
  // Form states
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // QR Scanner state
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Manual registration state
  const [manualBusqueda, setManualBusqueda] = useState('');
  const [manualEstudiantes, setManualEstudiantes] = useState<Estudiante[]>([]);
  const [manualClaseId, setManualClaseId] = useState('');
  const [manualTipo, setManualTipo] = useState('ENTRADA');
  
  // Telegram linking state
  const [linkingCode, setLinkingCode] = useState<string | null>(null);
  const [linkingType, setLinkingType] = useState<'PADRE' | 'MADRE'>('PADRE');
  const [botConfigLoading, setBotConfigLoading] = useState(false);
  
  // Logo upload ref
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  // Config
  const [config, setConfig] = useState<Config>({
    id: 'default',
    nombreInstitucion: 'Instituto Educativo',
    horaInicioGeneral: '08:00',
    toleranciaMinutos: 5,
    diasClase: '1,2,3,4,5',
    enviarNotificaciones: true,
    enviarTelegram: false,
    enviarTelegramPadres: false,
    notificarRetardo: true,
    notificarAusencia: true,
    notificarEntrada: false,
    colorPrimario: '#10b981',
    mensajeBienvenida: '¡Bienvenido! Tu asistencia ha sido registrada.'
  });

  // Cargar tema desde localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('asistencia_dark_mode');
    if (savedTheme !== null) {
      setDarkMode(savedTheme === 'true');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Aplicar clase dark al documento
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('asistencia_dark_mode', String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  // Utilidades
  const formatDate = (date: string) => new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const formatTime = (time: string) => time?.substring(0, 5) || '';

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─────────────────────────────────────────────────────────────
  // CARGAR DATOS DE LA API
  // ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setInitialLoading(true);
    try {
      const [configRes, estudiantesRes, clasesRes, dashboardRes, notifRes, padresRes] = await Promise.all([
        fetch('/api/asistencia/config'),
        fetch('/api/asistencia/estudiantes'),
        fetch('/api/asistencia/clases'),
        fetch('/api/asistencia/reporte'),
        fetch('/api/asistencia/notificaciones?limite=20'),
        fetch('/api/asistencia/padres'),
      ]);

      if (configRes.ok) setConfig(await configRes.json());
      if (estudiantesRes.ok) setEstudiantes(await estudiantesRes.json());
      if (clasesRes.ok) setClases(await clasesRes.json());
      if (dashboardRes.ok) setDashboardData(await dashboardRes.json());
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotificaciones(notifData.notificaciones || []);
      }
      if (padresRes.ok) {
        setPadresVinculados(await padresRes.json());
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error al cargar datos', 'error');
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─────────────────────────────────────────────────────────────
  // CRUD ESTUDIANTES
  // ─────────────────────────────────────────────────────────────

  const handleSaveEstudiante = async () => {
    if (!formData.matricula || !formData.nombre || !formData.apellido || !formData.email) {
      showToast('Matrícula, nombre, apellido y email son requeridos', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/asistencia/estudiantes/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const actualizado = await res.json();
          setEstudiantes(estudiantes.map(e => e.id === editingItem.id ? actualizado : e));
          showToast('Estudiante actualizado');
        } else {
          const err = await res.json();
          showToast(err.error || 'Error al actualizar', 'error');
        }
      } else {
        const res = await fetch('/api/asistencia/estudiantes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const nuevo = await res.json();
          setEstudiantes([...estudiantes, nuevo]);
          showToast('Estudiante registrado exitosamente');
        } else {
          const err = await res.json();
          showToast(err.error || 'Error al registrar estudiante', 'error');
        }
      }
      setShowModal(null);
      setFormData({});
      setEditingItem(null);
    } catch {
      showToast('Error al guardar estudiante', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditEstudiante = (est: Estudiante) => {
    setEditingItem(est);
    setFormData({
      matricula: est.matricula,
      nombre: est.nombre,
      apellido: est.apellido,
      email: est.email,
      telefono: est.telefono,
      grupo: est.grupo,
      nombrePadre: est.nombrePadre,
      emailPadre: est.emailPadre,
      telegramPadre: est.telegramPadre,
      nombreMadre: est.nombreMadre,
      emailMadre: est.emailMadre,
      telegramMadre: est.telegramMadre,
    });
    setShowModal('nuevo-estudiante');
  };

  const handleDeleteEstudiante = async (id: string) => {
    if (!confirm('¿Eliminar este estudiante?')) return;
    try {
      const res = await fetch(`/api/asistencia/estudiantes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.desactivado) {
          setEstudiantes(estudiantes.map(e => e.id === id ? { ...e, activo: false } : e));
          showToast('Estudiante desactivado (tiene registros)');
        } else {
          setEstudiantes(estudiantes.filter(e => e.id !== id));
          showToast('Estudiante eliminado');
        }
      }
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD CLASES
  // ─────────────────────────────────────────────────────────────

  const handleSaveClase = async () => {
    if (!formData.nombre || !formData.diaSemana || !formData.horaInicio || !formData.horaFin) {
      showToast('Nombre, día, hora inicio y hora fin son requeridos', 'error');
      return;
    }
    setLoading(true);
    try {
      if (editingItem) {
        const res = await fetch(`/api/asistencia/clases/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            diaSemana: parseInt(formData.diaSemana)
          }),
        });
        if (res.ok) {
          const actualizada = await res.json();
          setClases(clases.map(c => c.id === editingItem.id ? actualizada : c));
          showToast('Clase actualizada');
        } else {
          const err = await res.json();
          showToast(err.error || 'Error al actualizar', 'error');
        }
      } else {
        const res = await fetch('/api/asistencia/clases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...formData,
            diaSemana: parseInt(formData.diaSemana)
          }),
        });
        if (res.ok) {
          const nueva = await res.json();
          setClases([...clases, nueva]);
          showToast('Clase creada exitosamente');
        } else {
          const err = await res.json();
          showToast(err.error || 'Error al crear clase', 'error');
        }
      }
      setShowModal(null);
      setFormData({});
      setEditingItem(null);
    } catch {
      showToast('Error al guardar clase', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClase = (clase: Clase) => {
    setEditingItem(clase);
    setFormData({
      nombre: clase.nombre,
      profesor: clase.profesor,
      salon: clase.salon,
      diaSemana: clase.diaSemana.toString(),
      horaInicio: clase.horaInicio,
      horaFin: clase.horaFin,
      toleranciaMinutos: clase.toleranciaMinutos,
      activa: clase.activa
    });
    setShowModal('nueva-clase');
  };

  const handleDeleteClase = async (id: string) => {
    if (!confirm('¿Eliminar esta clase?')) return;
    try {
      const res = await fetch(`/api/asistencia/clases/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.desactivada) {
          setClases(clases.map(c => c.id === id ? { ...c, activa: false } : c));
          showToast('Clase desactivada (tiene registros)');
        } else {
          setClases(clases.filter(c => c.id !== id));
          showToast('Clase eliminada');
        }
      }
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  // ─────────────────────────────────────────────────────────────
  // REGISTRO DE ASISTENCIA POR QR
  // ─────────────────────────────────────────────────────────────

  const handleRegistrarAsistencia = async (scannedQr?: string) => {
    const token = scannedQr || qrInput;
    if (!token?.trim()) {
      showToast('Ingresa el código QR', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/asistencia/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrToken: token.trim() }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setScanResult(data);
        showToast(data.message, 'success');
        setQrInput('');
        loadData();
      } else {
        setScanResult({ error: data.error, ...data });
        showToast(data.error || 'Error al registrar', 'error');
      }
    } catch {
      showToast('Error al registrar asistencia', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // REGISTRO MANUAL DE ASISTENCIA
  // ─────────────────────────────────────────────────────────────

  const buscarEstudiantesManual = async () => {
    if (!manualBusqueda.trim()) return;
    try {
      const res = await fetch(`/api/asistencia/manual?busqueda=${encodeURIComponent(manualBusqueda)}&claseId=${manualClaseId}`);
      if (res.ok) {
        setManualEstudiantes(await res.json());
      }
    } catch {
      showToast('Error al buscar estudiantes', 'error');
    }
  };

  const handleRegistroManual = async (estudianteId: string) => {
    if (!manualClaseId) {
      showToast('Selecciona una clase', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/asistencia/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudianteId,
          claseId: manualClaseId,
          tipo: manualTipo,
          notas: 'Registro manual - caso excepcional'
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast(data.message, 'success');
        loadData();
        buscarEstudiantesManual();
      } else {
        showToast(data.error || 'Error al registrar', 'error');
      }
    } catch {
      showToast('Error al registrar asistencia manual', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // GUARDAR CONFIGURACIÓN
  // ─────────────────────────────────────────────────────────────

  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/asistencia/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const updated = await res.json();
        setConfig(updated);
        showToast('Configuración guardada');
        setShowModal(null);
        setFormData({});
      }
    } catch {
      showToast('Error al guardar configuración', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CONFIGURAR BOT TELEGRAM
  // ─────────────────────────────────────────────────────────────

  const handleConfigureBot = async () => {
    if (!formData.telegramBotToken && !config.telegramBotToken) {
      showToast('Ingresa el Bot Token primero', 'error');
      return;
    }
    setBotConfigLoading(true);
    try {
      const res = await fetch('/api/asistencia/telegram/configure-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: formData.telegramBotToken || config.telegramBotToken
        }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setConfig(prev => ({ 
          ...prev, 
          telegramBotUsername: data.botUsername,
          telegramWebhookUrl: data.webhookUrl
        }));
        showToast(`Bot configurado: @${data.botUsername}`);
      } else {
        showToast(data.error || 'Error al configurar bot', 'error');
      }
    } catch {
      showToast('Error al configurar bot', 'error');
    } finally {
      setBotConfigLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // GENERAR CÓDIGO DE VINCULACIÓN
  // ─────────────────────────────────────────────────────────────

  const handleGenerateLinkingCode = async (estudianteId: string, tipo: 'PADRE' | 'MADRE') => {
    setLoading(true);
    try {
      const res = await fetch('/api/asistencia/telegram/linking-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudianteId, tipo }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setLinkingCode(data.codigo);
        setLinkingType(tipo);
        showToast('Código de vinculación generado');
      } else {
        showToast(data.error || 'Error al generar código', 'error');
      }
    } catch {
      showToast('Error al generar código', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // REGENERAR CÓDIGO DE VINCULACIÓN
  // ─────────────────────────────────────────────────────────────

  const handleRegenerateLinkingCode = async (padreId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/asistencia/padres/${padreId}/regenerate-code`, {
        method: 'POST',
      });
      const data = await res.json();
      
      if (res.ok) {
        showToast('Código regenerado');
        loadData();
      } else {
        showToast(data.error || 'Error al regenerar código', 'error');
      }
    } catch {
      showToast('Error al regenerar código', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // SUBIR LOGO
  // ─────────────────────────────────────────────────────────────

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('logo', file);

    setLoading(true);
    try {
      const res = await fetch('/api/asistencia/upload-logo', {
        method: 'POST',
        body: uploadFormData,
      });
      const data = await res.json();
      
      if (res.ok) {
        setConfig(prev => ({ ...prev, logo: data.logo }));
        showToast('Logo actualizado correctamente');
      } else {
        showToast(data.error || 'Error al subir logo', 'error');
      }
    } catch {
      showToast('Error al subir logo', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // GENERAR QR URL
  // ─────────────────────────────────────────────────────────────

  const generateQRUrl = (qrToken: string, size: number = 200) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(qrToken)}`;
  };

  // ─────────────────────────────────────────────────────────────
  // IMPRIMIR CARNET
  // ─────────────────────────────────────────────────────────────

  const handlePrintCarnet = () => {
    window.print();
  };

  // ─────────────────────────────────────────────────────────────
  // MÓDULOS DE NAVEGACIÓN
  // ─────────────────────────────────────────────────────────────

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: moduleColors.dashboard.bg },
    { id: 'scanner', label: 'Escanear QR', icon: Scan, color: moduleColors.scanner.bg },
    { id: 'manual', label: 'Registro Manual', icon: FileText, color: moduleColors.manual.bg },
    { id: 'estudiantes', label: 'Estudiantes', icon: Users, color: moduleColors.estudiantes.bg },
    { id: 'clases', label: 'Clases', icon: BookOpen, color: moduleColors.clases.bg },
    { id: 'padres', label: 'Padres Vinculados', icon: Link, color: moduleColors.padres.bg },
    { id: 'reportes', label: 'Reportes', icon: Calendar, color: moduleColors.reportes.bg },
    { id: 'notificaciones', label: 'Notificaciones', icon: AlertTriangle, color: moduleColors.notificaciones.bg },
    { id: 'config', label: 'Config', icon: Settings, color: moduleColors.config.bg },
  ];

  // ─────────────────────────────────────────────────────────────
  // COMPONENTES REUTILIZABLES
  // ─────────────────────────────────────────────────────────────

  const Modal = ({ title, children, size = 'md' }: { title: string; children: React.ReactNode; size?: 'sm' | 'md' | 'lg' }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto ${size === 'lg' ? 'max-w-4xl' : size === 'sm' ? 'max-w-sm' : 'max-w-lg'} w-full`}>
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800 z-10">
          <h3 className="text-xl font-bold text-slate-800 dark:text-white">{title}</h3>
          <button onClick={() => { setShowModal(null); setFormData({}); setSelectedEstudiante(null); setEditingItem(null); setLinkingCode(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
    />
  );

  const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
      {...props}
      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
    />
  );

  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  );

  const TableHead = ({ children, colorClass }: { children: React.ReactNode; colorClass: string }) => {
    const bgClasses: Record<string, string> = {
      violet: 'bg-violet-50 dark:bg-violet-900/20',
      cyan: 'bg-cyan-50 dark:bg-cyan-900/20',
      amber: 'bg-amber-50 dark:bg-amber-900/20',
      rose: 'bg-rose-50 dark:bg-rose-900/20',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
    };
    return <thead className={`${bgClasses[colorClass] || 'bg-slate-50'} sticky top-0`}>{children}</thead>;
  };

  const Badge = ({ estado }: { estado: string }) => {
    const colors: Record<string, string> = {
      PRESENTE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      RETARDO: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      AUSENTE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    const icons: Record<string, any> = {
      PRESENTE: CheckCircle,
      RETARDO: Clock,
      AUSENTE: X,
    };
    const Icon = icons[estado] || CheckCircle;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${colors[estado] || colors.PRESENTE}`}>
        <Icon className="w-4 h-4" />
        {estado}
      </span>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <QrCode className="w-16 h-16 animate-pulse text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg">Cargando Sistema de Asistencia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-violet-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-right ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-800 dark:via-teal-800 dark:to-cyan-800 text-white shadow-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {config.logo ? (
                <img src={config.logo} alt="Logo" className="w-12 h-12 rounded-2xl object-cover bg-white/20" />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <QrCode className="w-7 h-7" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{config.nombreInstitucion}</h1>
                <p className="text-emerald-100 dark:text-emerald-200 text-sm">Sistema de Asistencia con QR - Estudiantes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:block text-sm bg-white/20 px-3 py-1 rounded-lg">
                {formatDate(new Date().toISOString())}
              </span>
              <button 
                onClick={toggleDarkMode}
                className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition"
                title={darkMode ? 'Modo claro' : 'Modo oscuro'}
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <button 
                onClick={loadData}
                className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition"
                title="Actualizar datos"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-r border-white/50 dark:border-slate-700 min-h-[calc(100vh-80px)] sticky top-20 shadow-xl">
          <nav className="p-4 space-y-2">
            {modules.map((mod) => {
              const Icon = mod.icon;
              const isActive = activeModule === mod.id;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all transform hover:scale-[1.02] ${
                    isActive
                      ? `bg-gradient-to-r ${mod.color} text-white shadow-lg`
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {mod.label}
                </button>
              );
            })}
          </nav>
          
          {/* Quick Stats */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 mt-4">
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-2">Estadísticas Rápidas</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Estudiantes:</span>
                <span className="font-semibold text-slate-800 dark:text-white">{estudiantes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Clases:</span>
                <span className="font-semibold text-slate-800 dark:text-white">{clases.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Hoy:</span>
                <span className="font-semibold text-emerald-600">{dashboardData?.resumen.asistenciasHoy || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Padres vinculados:</span>
                <span className="font-semibold text-indigo-600">{padresVinculados.length}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          
          {/* Dashboard Module */}
          {activeModule === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Panel de Control</h2>
              
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100 text-sm">Asistencias Hoy</p>
                      <p className="text-3xl font-bold mt-1">{dashboardData?.resumen.asistenciasHoy || 0}</p>
                    </div>
                    <UserCheck className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm">Estudiantes</p>
                      <p className="text-3xl font-bold mt-1">{dashboardData?.resumen.totalEstudiantes || estudiantes.length}</p>
                    </div>
                    <Users className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm">Clases Activas</p>
                      <p className="text-3xl font-bold mt-1">{dashboardData?.resumen.totalClases || clases.length}</p>
                    </div>
                    <BookOpen className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Retardos Hoy</p>
                      <p className="text-3xl font-bold mt-1">{dashboardData?.resumen.retardosHoy || 0}</p>
                    </div>
                    <Clock className="w-10 h-10 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveModule('scanner')}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-[1.02]"
                >
                  <Scan className="w-8 h-8 mb-2" />
                  <p className="font-bold text-lg">Escanear QR</p>
                  <p className="text-amber-100 text-sm">Registrar asistencia</p>
                </button>
                
                <button
                  onClick={() => setActiveModule('manual')}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-[1.02]"
                >
                  <FileText className="w-8 h-8 mb-2" />
                  <p className="font-bold text-lg">Registro Manual</p>
                  <p className="text-rose-100 text-sm">Sin QR (excepciones)</p>
                </button>
                
                <button
                  onClick={() => { setFormData({}); setShowModal('nuevo-estudiante'); }}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-[1.02]"
                >
                  <User className="w-8 h-8 mb-2" />
                  <p className="font-bold text-lg">Nuevo Estudiante</p>
                  <p className="text-violet-100 text-sm">Registrar estudiante</p>
                </button>
              </div>

              {/* Recent Activity */}
              <Card>
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="font-bold text-slate-800 dark:text-white">Últimas Asistencias de Hoy</h3>
                </div>
                <div className="overflow-x-auto max-h-64">
                  {dashboardData?.ultimasAsistencias && dashboardData.ultimasAsistencias.length > 0 ? (
                    <table className="w-full">
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {dashboardData.ultimasAsistencias.map((asist) => (
                          <tr key={asist.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold">
                                  {asist.estudiante.nombre?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-white">{asist.estudiante.nombre} {asist.estudiante.apellido}</p>
                                  <p className="text-xs text-slate-500">{asist.clase.nombre}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatTime(asist.horaRegistro)}</td>
                            <td className="px-4 py-3"><Badge estado={asist.estado} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                      <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      No hay registros hoy
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Scanner Module */}
          {activeModule === 'scanner' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.scanner.bg} flex items-center justify-center`}>
                  <Scan className="w-5 h-5 text-white" />
                </div>
                Registrar Asistencia por QR
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Escáner de Cámara
                  </h3>
                  
                  <QRScanner 
                    onScan={(data) => {
                      setQrInput(data);
                      // Auto-registrar al escanear
                      handleRegistrarAsistencia(data);
                    }}
                    isScanning={isScanning}
                    setIsScanning={setIsScanning}
                  />
                </Card>

                <Card className="p-6">
                  <h3 className="font-bold text-slate-800 dark:text-white mb-4">Otras Opciones</h3>
                  
                  <div className="space-y-4">
                    {/* Opción 1: Subir imagen */}
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">
                        📷 Subir imagen del QR
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          const formData = new FormData();
                          formData.append('file', file);
                          
                          try {
                            const res = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
                              method: 'POST',
                              body: formData
                            });
                            const data = await res.json();
                            if (data?.[0]?.symbol?.[0]?.data) {
                              setQrInput(data[0].symbol[0].data);
                              handleRegistrarAsistencia(data[0].symbol[0].data);
                            } else {
                              showToast('No se detectó QR en la imagen', 'error');
                            }
                          } catch {
                            showToast('Error al leer QR', 'error');
                          }
                        }}
                        className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-medium file:bg-amber-100 file:text-amber-700 hover:file:bg-amber-200 cursor-pointer"
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200 dark:border-slate-600"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">O pegar código</span>
                      </div>
                    </div>

                    {/* Opción 2: Pegar código */}
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Código QR</label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Pega el código aquí..."
                          value={qrInput}
                          onChange={(e) => setQrInput(e.target.value)}
                          className="font-mono text-sm"
                        />
                        <button
                          onClick={() => handleRegistrarAsistencia()}
                          disabled={loading}
                          className={`px-4 py-3 bg-gradient-to-r ${moduleColors.scanner.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 whitespace-nowrap`}
                        >
                          {loading ? '...' : 'Registrar'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Resultado</h4>
                    
                    {scanResult ? (
                      <div className={`p-4 rounded-xl ${scanResult.success ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                        {scanResult.success ? (
                          <div className="text-center">
                            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                            <p className="font-bold text-emerald-700 dark:text-emerald-300">{scanResult.message}</p>
                            {scanResult.asistencia && (
                              <div className="mt-3 text-left bg-white dark:bg-slate-800 rounded-xl p-3 text-sm">
                                <p><strong>Estudiante:</strong> {scanResult.asistencia.estudiante.nombre} {scanResult.asistencia.estudiante.apellido}</p>
                                <p><strong>Clase:</strong> {scanResult.asistencia.clase.nombre}</p>
                                <p><strong>Hora:</strong> {formatTime(scanResult.asistencia.horaRegistro)}</p>
                                <p><strong>Estado:</strong> <Badge estado={scanResult.asistencia.estado} /></p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center">
                            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                            <p className="font-bold text-red-700 dark:text-red-300">{scanResult.error}</p>
                            {scanResult.estudiante && (
                              <p className="text-sm text-red-600 mt-2">Estudiante: {scanResult.estudiante.nombre} {scanResult.estudiante.apellido}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <Scan className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                        <p className="text-sm">Escanea o ingresa un código QR</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Manual Registration Module */}
          {activeModule === 'manual' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.manual.bg} flex items-center justify-center`}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                Registro Manual de Asistencia
              </h2>

              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4">
                <p className="text-sm text-rose-800 dark:text-rose-200">
                  <strong>Casos excepcionales:</strong> Usa este módulo cuando el alumno haya extraviado su ficha con QR. 
                  Busca por nombre, matrícula o email y registra la asistencia manualmente.
                </p>
              </div>

              <Card className="p-6">
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Clase</label>
                    <Select
                      value={manualClaseId}
                      onChange={(e) => setManualClaseId(e.target.value)}
                    >
                      <option value="">Seleccionar clase...</option>
                      {clases.filter(c => c.activa).map(clase => (
                        <option key={clase.id} value={clase.id}>
                          {clase.nombre} - {clase.diaNombre} ({formatTime(clase.horaInicio)})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Tipo</label>
                    <Select
                      value={manualTipo}
                      onChange={(e) => setManualTipo(e.target.value)}
                    >
                      <option value="ENTRADA">Entrada</option>
                      <option value="SALIDA">Salida</option>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => { setManualBusqueda(''); setManualEstudiantes([]); }}
                      className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Buscar por nombre, matrícula o email..."
                    value={manualBusqueda}
                    onChange={(e) => setManualBusqueda(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && buscarEstudiantesManual()}
                  />
                  <button
                    onClick={buscarEstudiantesManual}
                    className={`px-6 py-3 bg-gradient-to-r ${moduleColors.manual.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition`}
                  >
                    <Search className="w-5 h-5" />
                  </button>
                </div>

                {manualEstudiantes.length > 0 && (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {manualEstudiantes.map((est) => (
                      <div key={est.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                            {est.nombre?.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-slate-800 dark:text-white">{est.nombre} {est.apellido}</p>
                            <p className="text-xs text-slate-500">{est.matricula} - {est.grupo || 'Sin grupo'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {est.asistenciaHoy ? (
                            <span className="text-xs text-emerald-600">Ya registró: {formatTime(est.asistenciaHoy.horaRegistro)}</span>
                          ) : (
                            <button
                              onClick={() => handleRegistroManual(est.id)}
                              disabled={loading || !manualClaseId}
                              className={`px-4 py-2 bg-gradient-to-r ${moduleColors.manual.bg} text-white rounded-lg text-sm font-medium disabled:opacity-50`}
                            >
                              Registrar
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* Estudiantes Module */}
          {activeModule === 'estudiantes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.estudiantes.bg} flex items-center justify-center`}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  Estudiantes ({estudiantes.length})
                </h2>
                <button
                  onClick={() => { setFormData({}); setEditingItem(null); setShowModal('nuevo-estudiante'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.estudiantes.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Estudiante
                </button>
              </div>

              <Card className="overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, matrícula o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <TableHead colorClass="violet">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800 dark:text-violet-300">Estudiante</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800 dark:text-violet-300">Matrícula</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800 dark:text-violet-300">Grupo</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800 dark:text-violet-300">Padres</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800 dark:text-violet-300">Asistencias</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800 dark:text-violet-300">QR</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800 dark:text-violet-300">Acciones</th>
                      </tr>
                    </TableHead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {estudiantes.filter(e => 
                        e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        e.apellido?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        e.matricula?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        e.email?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((est) => (
                        <tr key={est.id} className="hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${est.activo ? 'bg-gradient-to-r from-violet-500 to-purple-600' : 'bg-slate-300'}`}>
                                {est.nombre?.charAt(0)}
                              </div>
                              <div>
                                <p className={`font-medium ${est.activo ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>
                                  {est.nombre} {est.apellido}
                                </p>
                                <p className="text-xs text-slate-500">{est.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-400">{est.matricula}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-sm">
                              {est.grupo || 'Sin grupo'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              {est.padreVinculado && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs" title="Padre vinculado">
                                  <Link className="w-3 h-3" />
                                  P
                                </span>
                              )}
                              {est.madreVinculada && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 rounded-full text-xs" title="Madre vinculada">
                                  <Link className="w-3 h-3" />
                                  M
                                </span>
                              )}
                              {!est.padreVinculado && !est.madreVinculada && (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{est._count?.asistencias || 0}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => { setSelectedEstudiante(est); setLinkingCode(null); setShowModal('ver-qr'); }}
                              className="p-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-lg text-violet-600"
                              title="Ver QR / Carnet"
                            >
                              <QrCode className="w-5 h-5" />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleEditEstudiante(est)}
                                className="p-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded-lg text-cyan-600"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEstudiante(est.id)}
                                className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {estudiantes.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                            No hay estudiantes registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Clases Module */}
          {activeModule === 'clases' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.clases.bg} flex items-center justify-center`}>
                    <BookOpen className="w-5 h-5 text-white" />
                  </div>
                  Clases ({clases.length})
                </h2>
                <button
                  onClick={() => { setFormData({ diaSemana: '1', toleranciaMinutos: 5 }); setEditingItem(null); setShowModal('nueva-clase'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.clases.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Nueva Clase
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clases.map((clase) => (
                  <Card key={clase.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-white">{clase.nombre}</h4>
                        <p className="text-sm text-slate-500">{clase.codigo}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${clase.activa ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {clase.activa ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {clase.diaNombre} • {formatTime(clase.horaInicio)} - {formatTime(clase.horaFin)}
                      </p>
                      {clase.profesor && <p className="flex items-center gap-2"><User className="w-4 h-4" />{clase.profesor}</p>}
                      {clase.salon && <p className="flex items-center gap-2"><Hash className="w-4 h-4" />{clase.salon}</p>}
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                      <span className="text-sm text-slate-500">Tolerancia: {clase.toleranciaMinutos} min</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditClase(clase)}
                          className="p-2 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 rounded-lg text-cyan-600"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClase(clase.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Padres Vinculados Module */}
          {activeModule === 'padres' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.padres.bg} flex items-center justify-center`}>
                  <Link className="w-5 h-5 text-white" />
                </div>
                Padres Vinculados ({padresVinculados.length})
              </h2>

              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-4">
                <p className="text-sm text-indigo-800 dark:text-indigo-200">
                  <strong>Sistema de vinculación:</strong> Los padres pueden recibir notificaciones automáticas de asistencia por Telegram. 
                  Genera un código de vinculación y compártelo con el padre para que lo envíe al bot de Telegram.
                </p>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  {padresVinculados.length > 0 ? (
                    <table className="w-full">
                      <TableHead colorClass="indigo">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-800 dark:text-indigo-300">Padre/Tutor</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-800 dark:text-indigo-300">Tipo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-800 dark:text-indigo-300">Estudiante</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-800 dark:text-indigo-300">Fecha Vinculación</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-indigo-800 dark:text-indigo-300">Acciones</th>
                        </tr>
                      </TableHead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {padresVinculados.map((padre) => (
                          <tr key={padre.id} className="hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${padre.tipo === 'PADRE' ? 'bg-emerald-500' : 'bg-pink-500'}`}>
                                  {padre.tipo === 'PADRE' ? 'P' : 'M'}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-800 dark:text-white">
                                    {padre.telegramUsername || 'Sin username'}
                                  </p>
                                  <p className="text-xs text-slate-500 font-mono">{padre.telegramChatId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${padre.tipo === 'PADRE' ? 'bg-emerald-100 text-emerald-700' : 'bg-pink-100 text-pink-700'}`}>
                                {padre.tipo === 'PADRE' ? 'Padre' : 'Madre'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800 dark:text-white">
                                {padre.estudiante?.nombre} {padre.estudiante?.apellido}
                              </p>
                              <p className="text-xs text-slate-500">{padre.estudiante?.matricula} - {padre.estudiante?.grupo || 'Sin grupo'}</p>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                              {formatDate(padre.fechaVinculacion)}
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleRegenerateLinkingCode(padre.id)}
                                disabled={loading}
                                className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded-lg text-indigo-600"
                                title="Regenerar código de vinculación"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                      <Link className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>No hay padres vinculados aún</p>
                      <p className="text-sm mt-2">Ve a la sección de Estudiantes y genera códigos de vinculación desde el carnet de cada alumno</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Reportes Module */}
          {activeModule === 'reportes' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.reportes.bg} flex items-center justify-center`}>
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                Reportes de Asistencia
              </h2>

              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Presentes Hoy</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{dashboardData?.resumen.presentesHoy || 0}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                      <Clock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Retardos Hoy</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{dashboardData?.resumen.retardosHoy || 0}</p>
                    </div>
                  </div>
                </Card>
                
                <Card className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-violet-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Total Mes</p>
                      <p className="text-2xl font-bold text-slate-800 dark:text-white">{dashboardData?.resumen.asistenciasMes || 0}</p>
                    </div>
                  </div>
                </Card>
              </div>

              <Card className="p-6">
                <div className="text-center py-12 text-slate-500">
                  <BarChart3 className="w-16 h-16 mx-auto mb-3 text-slate-300" />
                  <p className="font-medium">Reportes Avanzados</p>
                  <p className="text-sm">Los gráficos detallados aparecerán aquí cuando hay más datos</p>
                </div>
              </Card>
            </div>
          )}

          {/* Notificaciones Module */}
          {activeModule === 'notificaciones' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.notificaciones.bg} flex items-center justify-center`}>
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                Historial de Notificaciones
              </h2>

              <div className="grid md:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800 dark:text-white">{notificaciones.length}</p>
                  <p className="text-sm text-slate-500">Total enviadas</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{notificaciones.filter(n => n.enviado).length}</p>
                  <p className="text-sm text-slate-500">Exitosas</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{notificaciones.filter(n => !n.enviado).length}</p>
                  <p className="text-sm text-slate-500">Fallidas</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-600">{notificaciones.filter(n => n.tipo === 'RETARDO').length}</p>
                  <p className="text-sm text-slate-500">Retardos</p>
                </Card>
              </div>

              <Card className="overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  {notificaciones.length > 0 ? (
                    <table className="w-full">
                      <thead className="bg-pink-50 dark:bg-pink-900/20 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-pink-800 dark:text-pink-300">Fecha</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-pink-800 dark:text-pink-300">Estudiante</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-pink-800 dark:text-pink-300">Tipo</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-pink-800 dark:text-pink-300">Canal</th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-pink-800 dark:text-pink-300">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {notificaciones.map((notif) => (
                          <tr key={notif.id} className="hover:bg-pink-50/50 dark:hover:bg-pink-900/10">
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                              {formatDate(notif.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-medium text-slate-800 dark:text-white">
                                {notif.estudiante?.nombre} {notif.estudiante?.apellido}
                              </span>
                              <span className="block text-xs text-slate-500">{notif.estudiante?.grupo}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                notif.tipo === 'RETARDO' ? 'bg-amber-100 text-amber-700' :
                                notif.tipo === 'AUSENCIA' ? 'bg-red-100 text-red-700' :
                                'bg-emerald-100 text-emerald-700'
                              }`}>
                                {notif.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                              {notif.canal.replace('_', ' ')}
                            </td>
                            <td className="px-4 py-3">
                              {notif.enviado ? (
                                <span className="flex items-center gap-1 text-emerald-600 text-sm">
                                  <CheckCircle className="w-4 h-4" /> Enviado
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-red-600 text-sm" title={notif.error}>
                                  <X className="w-4 h-4" /> Error
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-12 text-center text-slate-500 dark:text-slate-400">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                      <p>No hay notificaciones enviadas</p>
                      <p className="text-sm">Las notificaciones se enviarán automáticamente cuando un estudiante llegue tarde</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Config Module */}
          {activeModule === 'config' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.config.bg} flex items-center justify-center`}>
                  <Settings className="w-5 h-5 text-white" />
                </div>
                Configuración
              </h2>

              {/* Logo de la Institución */}
              <Card className="p-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Logo de la Institución
                </h3>
                <div className="flex items-center gap-4">
                  {config.logo ? (
                    <img 
                      src={config.logo} 
                      alt="Logo actual" 
                      className="w-24 h-24 rounded-xl object-cover border-2 border-slate-200 dark:border-slate-600"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600">
                      <QrCode className="w-10 h-10 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <input
                      type="file"
                      ref={logoInputRef}
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      disabled={loading}
                      className="px-4 py-2 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {loading ? 'Subiendo...' : 'Subir Logo'}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">JPG, PNG, GIF o WebP. Máximo 2MB</p>
                  </div>
                </div>
              </Card>

              {/* Configuración General */}
              <Card className="p-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Datos de la Institución</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Nombre de la Institución</label>
                    <Input
                      value={formData.nombreInstitucion ?? config.nombreInstitucion}
                      onChange={(e) => setFormData({ ...formData, nombreInstitucion: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Hora Inicio General</label>
                    <Input
                      type="time"
                      value={formData.horaInicioGeneral ?? config.horaInicioGeneral}
                      onChange={(e) => setFormData({ ...formData, horaInicioGeneral: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Tolerancia (minutos)</label>
                    <Input
                      type="number"
                      value={formData.toleranciaMinutos ?? config.toleranciaMinutos}
                      onChange={(e) => setFormData({ ...formData, toleranciaMinutos: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Mensaje de Bienvenida</label>
                    <Input
                      value={formData.mensajeBienvenida ?? config.mensajeBienvenida}
                      onChange={(e) => setFormData({ ...formData, mensajeBienvenida: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {/* Telegram Bot Setup */}
              <Card className="p-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Bot className="w-5 h-5" />
                  Configuración del Bot de Telegram
                </h3>
                <div className="space-y-4">
                  {/* Instructions */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">¿Cómo crear un bot de Telegram?</p>
                    <ol className="text-sm text-blue-700 dark:text-blue-300 list-decimal list-inside space-y-1">
                      <li>Abre Telegram y busca <strong>@BotFather</strong></li>
                      <li>Envía el comando <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/newbot</code></li>
                      <li>Sigue las instrucciones para nombrar tu bot</li>
                      <li>Copia el <strong>Bot Token</strong> que te proporcionen</li>
                      <li>Pégalo abajo y haz clic en "Configurar Bot"</li>
                    </ol>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Bot Token</label>
                      <Input
                        type="password"
                        placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                        value={formData.telegramBotToken ?? config.telegramBotToken ?? ''}
                        onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleConfigureBot}
                        disabled={botConfigLoading}
                        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Bot className="w-4 h-4" />
                        {botConfigLoading ? 'Configurando...' : 'Configurar Bot'}
                      </button>
                    </div>
                  </div>

                  {config.telegramBotUsername && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">Bot configurado: @{config.telegramBotUsername}</span>
                      </div>
                      {config.telegramWebhookUrl && (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                          Webhook activo: {config.telegramWebhookUrl}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="enviarTelegramPadres"
                      checked={formData.enviarTelegramPadres ?? config.enviarTelegramPadres}
                      onChange={(e) => setFormData({ ...formData, enviarTelegramPadres: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="enviarTelegramPadres" className="text-sm text-slate-600 dark:text-slate-400">
                      <strong>Enviar notificaciones a los padres directamente</strong> (requiere que los padres estén vinculados por Telegram)
                    </label>
                  </div>
                </div>
              </Card>

              {/* Notificaciones Email */}
              <Card className="p-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Notificaciones por Email
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enviarNotificaciones"
                      checked={formData.enviarNotificaciones ?? config.enviarNotificaciones}
                      onChange={(e) => setFormData({ ...formData, enviarNotificaciones: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="enviarNotificaciones" className="text-sm text-slate-600 dark:text-slate-400">
                      Activar notificaciones por email
                    </label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Email del Director/Admin</label>
                      <Input
                        type="email"
                        placeholder="director@escuela.edu"
                        value={formData.emailAdmin ?? config.emailAdmin ?? ''}
                        onChange={(e) => setFormData({ ...formData, emailAdmin: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Email Remitente (Resend)</label>
                      <Input
                        type="email"
                        placeholder="noreply@tudominio.com"
                        value={formData.emailRemitente ?? config.emailRemitente ?? ''}
                        onChange={(e) => setFormData({ ...formData, emailRemitente: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Nombre del Remitente</label>
                    <Input
                      placeholder="Sistema de Asistencia"
                      value={formData.nombreRemitente ?? config.nombreRemitente ?? ''}
                      onChange={(e) => setFormData({ ...formData, nombreRemitente: e.target.value })}
                    />
                  </div>
                </div>
              </Card>

              {/* Notificaciones Telegram (Admin) */}
              <Card className="p-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  Notificaciones Telegram (Admin)
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enviarTelegram"
                      checked={formData.enviarTelegram ?? config.enviarTelegram}
                      onChange={(e) => setFormData({ ...formData, enviarTelegram: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="enviarTelegram" className="text-sm text-slate-600 dark:text-slate-400">
                      Activar notificaciones al grupo/canal de admin
                    </label>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Chat ID (Grupo/Canal)</label>
                      <Input
                        placeholder="-1001234567890"
                        value={formData.telegramChatId ?? config.telegramChatId ?? ''}
                        onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Qué notificar */}
              <Card className="p-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4">¿Qué notificar?</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="notificarRetardo"
                      checked={formData.notificarRetardo ?? config.notificarRetardo}
                      onChange={(e) => setFormData({ ...formData, notificarRetardo: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="notificarRetardo" className="text-sm text-slate-600 dark:text-slate-400">
                      ⚠️ Notificar retardos a padres
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="notificarAusencia"
                      checked={formData.notificarAusencia ?? config.notificarAusencia}
                      onChange={(e) => setFormData({ ...formData, notificarAusencia: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="notificarAusencia" className="text-sm text-slate-600 dark:text-slate-400">
                      ❌ Notificar ausencias a padres
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="notificarEntrada"
                      checked={formData.notificarEntrada ?? config.notificarEntrada}
                      onChange={(e) => setFormData({ ...formData, notificarEntrada: e.target.checked })}
                      className="w-4 h-4 rounded"
                    />
                    <label htmlFor="notificarEntrada" className="text-sm text-slate-600 dark:text-slate-400">
                      ✅ Notificar llegada a tiempo (opcional)
                    </label>
                  </div>
                </div>
              </Card>

              <button
                onClick={handleSaveConfig}
                disabled={loading}
                className={`px-6 py-3 bg-gradient-to-r ${moduleColors.config.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center gap-2`}
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Modales */}
      {showModal === 'nuevo-estudiante' && (
        <Modal title={editingItem ? 'Editar Estudiante' : 'Registrar Nuevo Estudiante'} size="lg">
          <div className="space-y-4">
            <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3">Datos del Estudiante</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Matrícula *</label>
                  <Input
                    placeholder="Ej: A00123"
                    value={formData.matricula || ''}
                    onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Grupo</label>
                  <Input
                    placeholder="Ej: 3A"
                    value={formData.grupo || ''}
                    onChange={(e) => setFormData({ ...formData, grupo: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Nombre *</label>
                  <Input
                    placeholder="Nombre"
                    value={formData.nombre || ''}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Apellido *</label>
                  <Input
                    placeholder="Apellido"
                    value={formData.apellido || ''}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Email Institucional *</label>
                  <Input
                    type="email"
                    placeholder="estudiante@institucion.edu"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Teléfono</label>
                  <Input
                    placeholder="Teléfono"
                    value={formData.telefono || ''}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                Datos del Padre/Tutor
                {editingItem?.padreVinculado && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs">
                    <Check className="w-3 h-3" />
                    Vinculado
                  </span>
                )}
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Nombre</label>
                  <Input
                    placeholder="Nombre del padre"
                    value={formData.nombrePadre || ''}
                    onChange={(e) => setFormData({ ...formData, nombrePadre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="padre@email.com"
                    value={formData.emailPadre || ''}
                    onChange={(e) => setFormData({ ...formData, emailPadre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Telegram</label>
                  <Input
                    placeholder="@username o Chat ID"
                    value={formData.telegramPadre || ''}
                    onChange={(e) => setFormData({ ...formData, telegramPadre: e.target.value })}
                  />
                </div>
              </div>
              {/* Hidden fields - auto-filled when parent links */}
              <input type="hidden" value={formData.telegramChatIdPadre || editingItem?.telegramChatIdPadre || ''} />
              {editingItem?.telegramChatIdPadre && (
                <div className="mt-2 text-xs text-slate-500">
                  Telegram Chat ID (vinculado): <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{editingItem.telegramChatIdPadre}</code>
                </div>
              )}
            </div>

            <div>
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                Datos de la Madre/Tutora
                {editingItem?.madreVinculada && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 rounded-full text-xs">
                    <Check className="w-3 h-3" />
                    Vinculada
                  </span>
                )}
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Nombre</label>
                  <Input
                    placeholder="Nombre de la madre"
                    value={formData.nombreMadre || ''}
                    onChange={(e) => setFormData({ ...formData, nombreMadre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="madre@email.com"
                    value={formData.emailMadre || ''}
                    onChange={(e) => setFormData({ ...formData, emailMadre: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Telegram</label>
                  <Input
                    placeholder="@username o Chat ID"
                    value={formData.telegramMadre || ''}
                    onChange={(e) => setFormData({ ...formData, telegramMadre: e.target.value })}
                  />
                </div>
              </div>
              {/* Hidden fields - auto-filled when mother links */}
              <input type="hidden" value={formData.telegramChatIdMadre || editingItem?.telegramChatIdMadre || ''} />
              {editingItem?.telegramChatIdMadre && (
                <div className="mt-2 text-xs text-slate-500">
                  Telegram Chat ID (vinculado): <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">{editingItem.telegramChatIdMadre}</code>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleSaveEstudiante}
                disabled={loading}
                className={`flex-1 px-6 py-3 bg-gradient-to-r ${moduleColors.estudiantes.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Registrar')}
              </button>
              {editingItem && (
                <button
                  onClick={() => { setFormData({}); setEditingItem(null); setShowModal(null); }}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'nueva-clase' && (
        <Modal title={editingItem ? 'Editar Clase' : 'Crear Nueva Clase'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Nombre de la Clase *</label>
              <Input
                placeholder="Ej: Matemáticas I"
                value={formData.nombre || ''}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Día *</label>
                <Select
                  value={formData.diaSemana || '1'}
                  onChange={(e) => setFormData({ ...formData, diaSemana: e.target.value })}
                >
                  {DIAS_SEMANA.map((dia, i) => (
                    <option key={i} value={i}>{dia}</option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Tolerancia (min)</label>
                <Input
                  type="number"
                  value={formData.toleranciaMinutos || 5}
                  onChange={(e) => setFormData({ ...formData, toleranciaMinutos: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Hora Inicio *</label>
                <Input
                  type="time"
                  value={formData.horaInicio || ''}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Hora Fin *</label>
                <Input
                  type="time"
                  value={formData.horaFin || ''}
                  onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Profesor</label>
                <Input
                  placeholder="Nombre del profesor"
                  value={formData.profesor || ''}
                  onChange={(e) => setFormData({ ...formData, profesor: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 dark:text-slate-400 mb-2">Salón</label>
                <Input
                  placeholder="Ej: A-101"
                  value={formData.salon || ''}
                  onChange={(e) => setFormData({ ...formData, salon: e.target.value })}
                />
              </div>
            </div>
            {editingItem && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="claseActiva"
                  checked={formData.activa ?? true}
                  onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="claseActiva" className="text-sm text-slate-600 dark:text-slate-400">
                  Clase activa
                </label>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveClase}
                disabled={loading}
                className={`flex-1 px-6 py-3 bg-gradient-to-r ${moduleColors.clases.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2`}
              >
                <Save className="w-5 h-5" />
                {loading ? 'Guardando...' : (editingItem ? 'Actualizar' : 'Crear Clase')}
              </button>
              {editingItem && (
                <button
                  onClick={() => { setFormData({}); setEditingItem(null); setShowModal(null); }}
                  className="px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                >
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {showModal === 'ver-qr' && selectedEstudiante && (
        <Modal title="Carnet de Estudiante" size="lg">
          <div className="space-y-4">
            {/* Vista previa del carnet */}
            <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl p-1 mx-auto max-w-sm print:shadow-none" id="carnet-preview">
              <div className="bg-white rounded-xl p-6">
                {/* Header con logo */}
                <div className="text-center border-b-2 border-violet-100 pb-4 mb-4">
                  {config.logo ? (
                    <img src={config.logo} alt="Logo" className="w-16 h-16 mx-auto mb-2 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 mx-auto mb-2 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                      <QrCode className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <h3 className="font-bold text-lg text-slate-800">{config.nombreInstitucion}</h3>
                  <p className="text-xs text-slate-500">Credencial de Estudiante</p>
                </div>
                
                {/* Datos del estudiante */}
                <div className="text-center mb-4">
                  <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                    {selectedEstudiante.nombre?.charAt(0)}{selectedEstudiante.apellido?.charAt(0)}
                  </div>
                  <h4 className="font-bold text-xl text-slate-800">{selectedEstudiante.nombre} {selectedEstudiante.apellido}</h4>
                  <p className="text-slate-500">Matrícula: <span className="font-mono font-semibold">{selectedEstudiante.matricula}</span></p>
                  <p className="text-slate-500">Grupo: <span className="font-semibold">{selectedEstudiante.grupo || 'Sin grupo'}</span></p>
                </div>
                
                {/* QR Code */}
                <div className="flex justify-center mb-4">
                  <div className="bg-white p-3 rounded-xl shadow-inner border border-slate-100">
                    <img 
                      src={generateQRUrl(selectedEstudiante.qrToken, 150)} 
                      alt="QR Code" 
                      className="w-36 h-36"
                    />
                  </div>
                </div>
                
                {/* Footer */}
                <div className="text-center text-xs text-slate-400 border-t border-slate-100 pt-3">
                  <p>Este carnet es personal e intransferible</p>
                  <p className="font-mono mt-1">{selectedEstudiante.qrToken.substring(0, 8)}...</p>
                </div>
              </div>
            </div>

            {/* Token QR para copiar */}
            <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-3">
              <p className="text-xs text-slate-500 mb-1">Token QR (copia para pruebas):</p>
              <code className="text-xs font-mono break-all text-slate-700 dark:text-slate-300">{selectedEstudiante.qrToken}</code>
            </div>

            {/* Telegram Linking Section */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Vinculación con Padres (Telegram)
              </h4>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleGenerateLinkingCode(selectedEstudiante.id, 'PADRE')}
                  disabled={loading}
                  className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Link className="w-4 h-4" />
                  Código para Padre
                </button>
                <button
                  onClick={() => handleGenerateLinkingCode(selectedEstudiante.id, 'MADRE')}
                  disabled={loading}
                  className="px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Link className="w-4 h-4" />
                  Código para Madre
                </button>
              </div>

              {linkingCode && (
                <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                    Código de vinculación para {linkingType === 'PADRE' ? 'el Padre' : 'la Madre'}:
                  </p>
                  <div className="bg-white dark:bg-slate-800 rounded-lg p-3 mb-3 flex items-center justify-between">
                    <code className="text-lg font-mono font-bold text-blue-700 dark:text-blue-300">{linkingCode}</code>
                    <button 
                      onClick={() => { navigator.clipboard?.writeText(linkingCode); showToast('Código copiado'); }}
                      className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
                    >
                      <Download className="w-4 h-4 text-blue-600" />
                    </button>
                  </div>
                  
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
                    <strong>Opciones para vincular:</strong>
                  </p>
                  
                  {/* Opción 1: Enlace directo */}
                  {config.telegramBotUsername && (
                    <a
                      href={`https://t.me/${config.telegramBotUsername.replace('@', '')}?start=${linkingCode}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full mb-3 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:shadow-lg transition"
                    >
                      <Bot className="w-5 h-5" />
                      Abrir Telegram y Vincular Automáticamente
                    </a>
                  )}
                  
                  {/* Opción 2: Instrucciones manuales */}
                  <details className="text-xs text-blue-600 dark:text-blue-400">
                    <summary className="cursor-pointer font-medium mb-2">Ver instrucciones manuales</summary>
                    <ol className="list-decimal list-inside space-y-1 mb-3 pl-2">
                      <li>Abre Telegram y busca el bot <strong>@{config.telegramBotUsername || 'tubot'}</strong></li>
                      <li>Envía el comando <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/start {linkingCode}</code></li>
                      <li>El bot confirmará la vinculación</li>
                    </ol>
                  </details>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        const text = `🏫 ${config.nombreInstitucion}

Hola, para recibir notificaciones de asistencia de ${selectedEstudiante.nombre} ${selectedEstudiante.apellido}, sigue estos pasos:

1️⃣ Abre Telegram
2️⃣ Busca: @${config.telegramBotUsername || 'el bot de la escuela'}
3️⃣ Envía: /start ${linkingCode}

¡Listo! Recibirás alertas automáticas de entrada, retardos y ausencias.

O haz clic directamente:
https://t.me/${(config.telegramBotUsername || 'bot').replace('@', '')}?start=${linkingCode}`;
                        navigator.clipboard?.writeText(text);
                        showToast('Mensaje copiado al portapapeles');
                      }}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                    >
                      <Send className="w-4 h-4" />
                      Copiar mensaje para enviar
                    </button>
                  </div>
                </div>
              )}

              {/* Parent link status */}
              <div className="mt-3 flex gap-2">
                {selectedEstudiante.padreVinculado ? (
                  <span className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-sm">
                    <Check className="w-4 h-4" />
                    Padre vinculado
                  </span>
                ) : (
                  <span className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg text-sm">
                    <Link className="w-4 h-4" />
                    Padre no vinculado
                  </span>
                )}
                {selectedEstudiante.madreVinculada ? (
                  <span className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 rounded-lg text-sm">
                    <Check className="w-4 h-4" />
                    Madre vinculada
                  </span>
                ) : (
                  <span className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 rounded-lg text-sm">
                    <Link className="w-4 h-4" />
                    Madre no vinculada
                  </span>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-2">
              <button
                onClick={handlePrintCarnet}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />
                Imprimir Carnet
              </button>
              <a
                href={generateQRUrl(selectedEstudiante.qrToken, 400)}
                download={`carnet-${selectedEstudiante.matricula}.png`}
                className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Descargar QR
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
