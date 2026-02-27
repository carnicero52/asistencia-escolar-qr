'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Users, Clock, QrCode, CheckCircle, XCircle, LogIn, LogOut,
  Settings, Download, Bell, Mail, Calendar, TrendingUp, AlertCircle,
  UserPlus, Search, Edit, Trash2, Eye, Send, Camera, X, ChevronDown
} from 'lucide-react';

interface Empleado {
  id: string;
  codigo: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
  puesto?: string;
  departamento?: string;
  qrCodigo: string;
  activo: boolean;
}

interface Registro {
  id: string;
  empleadoId: string;
  empleado?: Empleado;
  tipo: string;
  fecha: string;
  hora: string;
  estado: string;
  minutosRetraso: number;
  horasTrabajadas?: number;
}

interface Empresa {
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  toleranciaMinutos: number;
  emailAdmin?: string;
}

type TabType = 'dashboard' | 'escaner' | 'empleados' | 'registros' | 'config';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Scanner states
  const [scanMode, setScanMode] = useState<'entrada' | 'salida'>('entrada');
  const [scanResult, setScanResult] = useState<{success: boolean; message: string; empleado?: Empleado; hora?: string} | null>(null);
  const [showQRList, setShowQRList] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  
  // Employee form
  const [showEmpleadoModal, setShowEmpleadoModal] = useState(false);
  const [editingEmpleado, setEditingEmpleado] = useState<Empleado | null>(null);
  const [empleadoForm, setEmpleadoForm] = useState({
    codigo: '', nombre: '', apellido: '', email: '', telefono: '', puesto: '', departamento: ''
  });
  
  // QR Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrEmpleado, setQrEmpleado] = useState<Empleado | null>(null);
  
  // Search
  const [searchTerm, setSearchTerm] = useState('');
  const [fechaFiltro, setFechaFiltro] = useState(new Date().toISOString().split('T')[0]);
  
  // Config form
  const [configForm, setConfigForm] = useState({
    nombre: '', horaEntrada: '09:00', horaSalida: '18:00', toleranciaMinutos: 15, emailAdmin: ''
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [empRes, regRes, configRes] = await Promise.all([
        fetch('/api/asistencia/empleados'),
        fetch(`/api/asistencia/registros?fecha=${fechaFiltro}`),
        fetch('/api/asistencia/config')
      ]);
      const empData = await empRes.json();
      const regData = await regRes.json();
      const configData = await configRes.json();
      
      setEmpleados(empData);
      setRegistros(regData);
      setEmpresa(configData);
      setConfigForm({
        nombre: configData?.nombre || '',
        horaEntrada: configData?.horaEntrada || '09:00',
        horaSalida: configData?.horaSalida || '18:00',
        toleranciaMinutos: configData?.toleranciaMinutos || 15,
        emailAdmin: configData?.emailAdmin || ''
      });
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // QR Scanner handlers
  const handleScanQR = async (empleado: Empleado) => {
    try {
      const fecha = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/asistencia/registros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          empleadoId: empleado.id, 
          tipo: scanMode.toUpperCase(), 
          fecha 
        })
      });
      
      const data = await res.json();
      
      if (data.error) {
        setScanResult({
          success: false,
          message: data.error
        });
        return;
      }

      const now = new Date();
      const hora = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      
      setScanResult({
        success: true,
        message: `${scanMode === 'entrada' ? 'Entrada' : 'Salida'} registrada correctamente`,
        empleado,
        hora
      });

      // Recargar registros
      cargarDatos();

      setTimeout(() => {
        setScanResult(null);
        setShowQRList(false);
      }, 3000);

    } catch (error) {
      setScanResult({
        success: false,
        message: 'Error al registrar'
      });
    }
  };

  // Employee CRUD
  const handleSaveEmpleado = async () => {
    try {
      const url = '/api/asistencia/empleados';
      const method = editingEmpleado ? 'PUT' : 'POST';
      const body = editingEmpleado 
        ? { ...empleadoForm, id: editingEmpleado.id }
        : empleadoForm;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (data.success) {
        // Si es nuevo empleado, enviar QR por correo
        if (!editingEmpleado && data.empleado?.email) {
          await fetch('/api/asistencia/enviar-qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ empleadoId: data.empleado.id })
          });
        }
        
        setShowEmpleadoModal(false);
        setEditingEmpleado(null);
        setEmpleadoForm({ codigo: '', nombre: '', apellido: '', email: '', telefono: '', puesto: '', departamento: '' });
        cargarDatos();
      }
    } catch (error) {
      console.error('Error guardando empleado:', error);
    }
  };

  const handleDeleteEmpleado = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este empleado?')) return;
    
    try {
      await fetch(`/api/asistencia/empleados?id=${id}`, { method: 'DELETE' });
      cargarDatos();
    } catch (error) {
      console.error('Error eliminando:', error);
    }
  };

  const handleSaveConfig = async () => {
    try {
      await fetch('/api/asistencia/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm)
      });
      cargarDatos();
      alert('Configuración guardada');
    } catch (error) {
      console.error('Error guardando config:', error);
    }
  };

  const handleEnviarQR = async (empleado: Empleado) => {
    try {
      const res = await fetch('/api/asistencia/enviar-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empleadoId: empleado.id })
      });
      const data = await res.json();
      
      if (data.success) {
        alert(`QR enviado a ${empleado.email}`);
      } else {
        alert(data.error || 'Error al enviar QR');
      }
    } catch (error) {
      alert('Error al enviar QR');
    }
  };

  const verQR = (empleado: Empleado) => {
    setQrEmpleado(empleado);
    setShowQRModal(true);
  };

  // Stats
  const totalEmpleados = empleados.length;
  const entradasHoy = registros.filter(r => r.tipo === 'ENTRADA' && r.fecha === fechaFiltro).length;
  const salidasHoy = registros.filter(r => r.tipo === 'SALIDA' && r.fecha === fechaFiltro).length;
  const tardanzasHoy = registros.filter(r => r.estado === 'tarde' && r.fecha === fechaFiltro).length;
  const presentesHoy = new Set(registros.filter(r => r.tipo === 'ENTRADA' && r.fecha === fechaFiltro).map(r => r.empleadoId)).size;

  const filteredEmpleados = empleados.filter(e => 
    `${e.nombre} ${e.apellido} ${e.codigo}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRegistros = registros.filter(r => r.fecha === fechaFiltro);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{empresa?.nombre || 'Panel Admin'}</h1>
                <p className="text-sm text-slate-500">Sistema de Control de Asistencia</p>
              </div>
            </div>
            
            <a href="/" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              ← Volver al escáner público
            </a>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'escaner', label: 'Escáner QR', icon: QrCode },
              { id: 'empleados', label: 'Empleados', icon: Users },
              { id: 'registros', label: 'Registros', icon: Calendar },
              { id: 'config', label: 'Configuración', icon: Settings },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-emerald-600 border-emerald-500'
                    : 'text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{totalEmpleados}</p>
                    <p className="text-xs text-slate-500">Empleados</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <LogIn className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{presentesHoy}</p>
                    <p className="text-xs text-slate-500">Presentes</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                    <LogOut className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{salidasHoy}</p>
                    <p className="text-xs text-slate-500">Salidas</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{tardanzasHoy}</p>
                    <p className="text-xs text-slate-500">Tardanzas</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-4 border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-800">{totalEmpleados - presentesHoy}</p>
                    <p className="text-xs text-slate-500">Ausentes</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h2 className="font-semibold text-slate-800">Actividad Reciente</h2>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {filteredRegistros.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    No hay registros para hoy
                  </div>
                ) : (
                  filteredRegistros.slice(0, 10).map(reg => (
                    <div key={reg.id} className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          reg.tipo === 'ENTRADA' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {reg.tipo === 'ENTRADA' ? (
                            <LogIn className="w-5 h-5 text-green-600" />
                          ) : (
                            <LogOut className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">
                            {reg.empleado?.nombre} {reg.empleado?.apellido}
                          </p>
                          <p className="text-sm text-slate-500">
                            {reg.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} - {reg.hora}
                          </p>
                        </div>
                      </div>
                      {reg.estado === 'tarde' && (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                          {reg.minutosRetraso} min tarde
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scanner Tab */}
        {activeTab === 'escaner' && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  Escáner QR del Administrador
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Seleccione el empleado y tipo de marca
                </p>
              </div>
              
              <div className="p-6">
                {scanResult ? (
                  <div className={`p-8 rounded-xl text-center ${
                    scanResult.success 
                      ? 'bg-green-50 border-2 border-green-200' 
                      : 'bg-red-50 border-2 border-red-200'
                  }`}>
                    {scanResult.success ? (
                      <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    ) : (
                      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    )}
                    
                    <p className="text-xl font-bold text-slate-800 mb-2">
                      {scanResult.success ? '¡Registrado!' : 'Error'}
                    </p>
                    
                    {scanResult.empleado && (
                      <>
                        <p className="text-lg text-slate-600 mb-1">
                          {scanResult.empleado.nombre} {scanResult.empleado.apellido}
                        </p>
                        <p className="text-slate-500">
                          Hora: {scanResult.hora}
                        </p>
                      </>
                    )}
                    
                    <p className="text-slate-500 mt-2">{scanResult.message}</p>
                    
                    {!scanResult.success && (
                      <button
                        onClick={() => setScanResult(null)}
                        className="mt-4 px-4 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium hover:bg-slate-200 transition"
                      >
                        Intentar de nuevo
                      </button>
                    )}
                  </div>
                ) : showQRList ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-slate-800">
                        {scanMode === 'entrada' ? '📍 Marcar Entrada' : '🚪 Marcar Salida'}
                      </h3>
                      <button 
                        onClick={() => setShowQRList(false)} 
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Buscar empleado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {filteredEmpleados.map(emp => (
                        <button
                          key={emp.id}
                          onClick={() => handleScanQR(emp)}
                          className="w-full p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition flex items-center gap-3"
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            scanMode === 'entrada' ? 'bg-green-100' : 'bg-red-100'
                          }`}>
                            {scanMode === 'entrada' ? (
                              <LogIn className="w-5 h-5 text-green-600" />
                            ) : (
                              <LogOut className="w-5 h-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-slate-800">{emp.nombre} {emp.apellido}</p>
                            <p className="text-sm text-slate-500">{emp.codigo} - {emp.puesto}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Mode Toggle */}
                    <div className="flex bg-slate-100 rounded-xl p-1">
                      <button
                        onClick={() => setScanMode('entrada')}
                        className={`flex-1 py-3 rounded-lg font-medium transition ${
                          scanMode === 'entrada'
                            ? 'bg-green-500 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <LogIn className="w-5 h-5 inline mr-2" />
                        Entrada
                      </button>
                      <button
                        onClick={() => setScanMode('salida')}
                        className={`flex-1 py-3 rounded-lg font-medium transition ${
                          scanMode === 'salida'
                            ? 'bg-red-500 text-white'
                            : 'text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <LogOut className="w-5 h-5 inline mr-2" />
                        Salida
                      </button>
                    </div>
                    
                    {/* Action Buttons */}
                    <button
                      onClick={() => { setSearchTerm(''); setShowQRList(true); }}
                      className={`w-full p-6 rounded-xl text-white font-semibold text-lg transition transform hover:scale-[1.02] ${
                        scanMode === 'entrada'
                          ? 'bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30'
                          : 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-3">
                        <Users className="w-8 h-8" />
                        <div className="text-left">
                          <p>Marcar {scanMode === 'entrada' ? 'Entrada' : 'Salida'}</p>
                          <p className="text-sm font-normal opacity-80">Seleccionar empleado</p>
                        </div>
                      </div>
                    </button>
                    
                    <div className="text-center text-sm text-slate-500 mt-4">
                      <p>📅 Horario: {empresa?.horaEntrada || '09:00'} - {empresa?.horaSalida || '18:00'}</p>
                      <p>⏱️ Tolerancia: {empresa?.toleranciaMinutos || 15} minutos</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'empleados' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar empleados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <button
                onClick={() => {
                  setEditingEmpleado(null);
                  setEmpleadoForm({ codigo: '', nombre: '', apellido: '', email: '', telefono: '', puesto: '', departamento: '' });
                  setShowEmpleadoModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
              >
                <UserPlus className="w-5 h-5" />
                Nuevo Empleado
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-4 font-medium text-slate-600">Empleado</th>
                      <th className="text-left p-4 font-medium text-slate-600">Código</th>
                      <th className="text-left p-4 font-medium text-slate-600">Puesto</th>
                      <th className="text-left p-4 font-medium text-slate-600">Email</th>
                      <th className="text-right p-4 font-medium text-slate-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmpleados.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No hay empleados registrados
                        </td>
                      </tr>
                    ) : (
                      filteredEmpleados.map(emp => (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                <span className="text-emerald-700 font-medium">
                                  {emp.nombre[0]}{emp.apellido[0]}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">{emp.nombre} {emp.apellido}</p>
                                <p className="text-sm text-slate-500">{emp.telefono}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-slate-600">{emp.codigo}</td>
                          <td className="p-4 text-slate-600">{emp.puesto || '-'}</td>
                          <td className="p-4 text-slate-600">{emp.email || '-'}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => verQR(emp)}
                                className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Ver QR"
                              >
                                <QrCode className="w-4 h-4" />
                              </button>
                              {emp.email && (
                                <button
                                  onClick={() => handleEnviarQR(emp)}
                                  className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="Enviar QR por email"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setEditingEmpleado(emp);
                                  setEmpleadoForm({
                                    codigo: emp.codigo,
                                    nombre: emp.nombre,
                                    apellido: emp.apellido,
                                    email: emp.email || '',
                                    telefono: emp.telefono || '',
                                    puesto: emp.puesto || '',
                                    departamento: emp.departamento || ''
                                  });
                                  setShowEmpleadoModal(true);
                                }}
                                className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                title="Editar"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteEmpleado(emp.id)}
                                className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Records Tab */}
        {activeTab === 'registros' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm text-slate-600 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={fechaFiltro}
                    onChange={(e) => { setFechaFiltro(e.target.value); cargarDatos(); }}
                    className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <button
                onClick={() => {
                  // Export CSV
                  const csv = [
                    ['Empleado', 'Código', 'Tipo', 'Hora', 'Estado', 'Min Retraso'].join(','),
                    ...filteredRegistros.map(r => [
                      `${r.empleado?.nombre} ${r.empleado?.apellido}`,
                      r.empleado?.codigo,
                      r.tipo,
                      r.hora,
                      r.estado,
                      r.minutosRetraso
                    ].join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `registros_${fechaFiltro}.csv`;
                  a.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition font-medium"
              >
                <Download className="w-5 h-5" />
                Exportar CSV
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left p-4 font-medium text-slate-600">Empleado</th>
                      <th className="text-left p-4 font-medium text-slate-600">Tipo</th>
                      <th className="text-left p-4 font-medium text-slate-600">Hora</th>
                      <th className="text-left p-4 font-medium text-slate-600">Estado</th>
                      <th className="text-left p-4 font-medium text-slate-600">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRegistros.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500">
                          No hay registros para esta fecha
                        </td>
                      </tr>
                    ) : (
                      filteredRegistros.map(reg => (
                        <tr key={reg.id} className="hover:bg-slate-50">
                          <td className="p-4">
                            <div>
                              <p className="font-medium text-slate-800">
                                {reg.empleado?.nombre} {reg.empleado?.apellido}
                              </p>
                              <p className="text-sm text-slate-500">{reg.empleado?.codigo}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${
                              reg.tipo === 'ENTRADA' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {reg.tipo === 'ENTRADA' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                              {reg.tipo}
                            </span>
                          </td>
                          <td className="p-4 text-slate-600">{reg.hora}</td>
                          <td className="p-4">
                            {reg.estado === 'tarde' ? (
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-sm rounded-full">
                                {reg.minutosRetraso} min tarde
                              </span>
                            ) : reg.estado === 'temprano' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded-full">
                                A tiempo
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-700 text-sm rounded-full">
                                Normal
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-600">
                            {reg.horasTrabajadas ? `${reg.horasTrabajadas.toFixed(1)}h` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuración de la Empresa
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nombre de la Empresa
                  </label>
                  <input
                    type="text"
                    value={configForm.nombre}
                    onChange={(e) => setConfigForm({ ...configForm, nombre: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Mi Empresa S.A."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Hora de Entrada
                    </label>
                    <input
                      type="time"
                      value={configForm.horaEntrada}
                      onChange={(e) => setConfigForm({ ...configForm, horaEntrada: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Hora de Salida
                    </label>
                    <input
                      type="time"
                      value={configForm.horaSalida}
                      onChange={(e) => setConfigForm({ ...configForm, horaSalida: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tolerancia (minutos)
                  </label>
                  <input
                    type="number"
                    value={configForm.toleranciaMinutos}
                    onChange={(e) => setConfigForm({ ...configForm, toleranciaMinutos: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    min="0"
                    max="60"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Minutos de tolerancia antes de marcar como tarde
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email del Administrador
                  </label>
                  <input
                    type="email"
                    value={configForm.emailAdmin}
                    onChange={(e) => setConfigForm({ ...configForm, emailAdmin: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="admin@empresa.com"
                  />
                  <p className="text-sm text-slate-500 mt-1">
                    Recibirá notificaciones de tardanzas y ausencias
                  </p>
                </div>
                
                <button
                  onClick={handleSaveConfig}
                  className="w-full py-3 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
                >
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Employee Modal */}
      {showEmpleadoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">
                {editingEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
              </h3>
              <button onClick={() => setShowEmpleadoModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código *</label>
                  <input
                    type="text"
                    value={empleadoForm.codigo}
                    onChange={(e) => setEmpleadoForm({ ...empleadoForm, codigo: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="EMP001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Puesto</label>
                  <input
                    type="text"
                    value={empleadoForm.puesto}
                    onChange={(e) => setEmpleadoForm({ ...empleadoForm, puesto: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Vendedor"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={empleadoForm.nombre}
                    onChange={(e) => setEmpleadoForm({ ...empleadoForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Apellido *</label>
                  <input
                    type="text"
                    value={empleadoForm.apellido}
                    onChange={(e) => setEmpleadoForm({ ...empleadoForm, apellido: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={empleadoForm.email}
                  onChange={(e) => setEmpleadoForm({ ...empleadoForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="empleado@empresa.com"
                />
                <p className="text-xs text-slate-500 mt-1">Se enviará el código QR a este correo</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={empleadoForm.telefono}
                    onChange={(e) => setEmpleadoForm({ ...empleadoForm, telefono: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Departamento</label>
                  <input
                    type="text"
                    value={empleadoForm.departamento}
                    onChange={(e) => setEmpleadoForm({ ...empleadoForm, departamento: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowEmpleadoModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEmpleado}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-medium"
              >
                {editingEmpleado ? 'Actualizar' : 'Crear Empleado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQRModal && qrEmpleado && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Código QR</h3>
              <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 text-center">
              <div className="mb-4">
                <p className="font-medium text-slate-800 text-lg">{qrEmpleado.nombre} {qrEmpleado.apellido}</p>
                <p className="text-sm text-slate-500">{qrEmpleado.codigo}</p>
              </div>
              
              <div className="bg-white p-4 rounded-xl border-2 border-slate-200 inline-block mb-4">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrEmpleado.qrCodigo)}`}
                  alt="QR Code"
                  className="mx-auto"
                />
              </div>
              
              <p className="text-xs text-slate-400 mb-4 font-mono">{qrEmpleado.qrCodigo}</p>
              
              {qrEmpleado.email && (
                <button
                  onClick={() => { handleEnviarQR(qrEmpleado); setShowQRModal(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  <Mail className="w-4 h-4" />
                  Enviar por Email
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
