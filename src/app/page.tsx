'use client';

import { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, Users, Truck, Receipt, TrendingDown,
  BarChart3, Settings, UserCheck, Plus, Edit, Trash2, Search,
  X, Save, DollarSign, RefreshCw, CheckCircle, AlertTriangle,
  FileText
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  telefono?: string;
  direccion?: string;
  comprasTotal: number;
  createdAt: string;
}

interface Proveedor {
  id: string;
  nombre: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  productos?: string;
  createdAt: string;
}

interface Compra {
  id: string;
  numeroCompra: string;
  proveedorId?: string;
  proveedor?: Proveedor;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: string;
  fecha: string;
  createdAt: string;
}

interface Gasto {
  id: string;
  concepto: string;
  categoria: string;
  monto: number;
  descripcion?: string;
  fecha: string;
  createdAt: string;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  createdAt: string;
}

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  precioCompra: number;
  precioVenta: number;
  activo: boolean;
  createdAt: string;
}

interface Venta {
  id: string;
  numeroVenta: string;
  cliente?: string;
  subtotal: number;
  impuestos: number;
  total: number;
  metodoPago: string;
  estado: string;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// COLORES VIBRANTES POR MÓDULO
// ─────────────────────────────────────────────────────────────

const moduleColors = {
  ventas: { bg: 'from-violet-500 to-purple-600', light: 'bg-violet-100', text: 'text-violet-600' },
  inventario: { bg: 'from-cyan-500 to-teal-600', light: 'bg-cyan-100', text: 'text-cyan-600' },
  clientes: { bg: 'from-rose-500 to-pink-600', light: 'bg-rose-100', text: 'text-rose-600' },
  proveedores: { bg: 'from-amber-500 to-orange-600', light: 'bg-amber-100', text: 'text-amber-600' },
  compras: { bg: 'from-emerald-500 to-green-600', light: 'bg-emerald-100', text: 'text-emerald-600' },
  gastos: { bg: 'from-red-500 to-rose-600', light: 'bg-red-100', text: 'text-red-600' },
  reportes: { bg: 'from-indigo-500 to-blue-600', light: 'bg-indigo-100', text: 'text-indigo-600' },
  config: { bg: 'from-slate-500 to-gray-600', light: 'bg-slate-100', text: 'text-slate-600' },
  usuarios: { bg: 'from-sky-500 to-blue-600', light: 'bg-sky-100', text: 'text-sky-600' },
};

// ─────────────────────────────────────────────────────────────
// LOCAL STORAGE HELPERS
// ─────────────────────────────────────────────────────────────

const loadFromStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function SistemaPOS() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Data states
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [compras, setCompras] = useState<Compra[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);
  
  // Form states
  const [formData, setFormData] = useState<any>({});
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Config
  const [config, setConfig] = useState({
    nombreNegocio: 'Mi Negocio',
    moneda: '$',
    impuesto: 16,
  });

  // Load data from localStorage on mount
  useEffect(() => {
    setClientes(loadFromStorage('pos_clientes', []));
    setProveedores(loadFromStorage('pos_proveedores', []));
    setCompras(loadFromStorage('pos_compras', []));
    setGastos(loadFromStorage('pos_gastos', []));
    setUsuarios(loadFromStorage('pos_usuarios', []));
    setProductos(loadFromStorage('pos_productos', []));
    setVentas(loadFromStorage('pos_ventas', []));
    const savedConfig = loadFromStorage('pos_config', null);
    if (savedConfig) setConfig(savedConfig);
  }, []);

  // Save data to localStorage when it changes
  useEffect(() => { saveToStorage('pos_clientes', clientes); }, [clientes]);
  useEffect(() => { saveToStorage('pos_proveedores', proveedores); }, [proveedores]);
  useEffect(() => { saveToStorage('pos_compras', compras); }, [compras]);
  useEffect(() => { saveToStorage('pos_gastos', gastos); }, [gastos]);
  useEffect(() => { saveToStorage('pos_usuarios', usuarios); }, [usuarios]);
  useEffect(() => { saveToStorage('pos_productos', productos); }, [productos]);
  useEffect(() => { saveToStorage('pos_ventas', ventas); }, [ventas]);
  useEffect(() => { saveToStorage('pos_config', config); }, [config]);

  // Utilidades
  const formatCurrency = (value: number) => `${config.moneda}${value.toFixed(2)}`;
  const formatDate = (date: string) => new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD CLIENTES
  // ─────────────────────────────────────────────────────────────

  const handleSaveCliente = () => {
    if (!formData.nombre || !formData.email) {
      showToast('Nombre y email son requeridos', 'error');
      return;
    }

    if (editingItem) {
      setClientes(clientes.map(c => c.id === editingItem.id ? { ...c, ...formData } : c));
      showToast('Cliente actualizado');
    } else {
      const nuevo: Cliente = {
        id: `cli_${Date.now()}`,
        nombre: formData.nombre,
        email: formData.email.toLowerCase(),
        telefono: formData.telefono || '',
        direccion: formData.direccion || '',
        comprasTotal: 0,
        createdAt: new Date().toISOString()
      };
      setClientes([...clientes, nuevo]);
      showToast('Cliente registrado exitosamente');
    }
    setShowModal(null);
    setFormData({});
    setEditingItem(null);
  };

  const handleDeleteCliente = (id: string) => {
    if (!confirm('¿Eliminar este cliente?')) return;
    setClientes(clientes.filter(c => c.id !== id));
    showToast('Cliente eliminado');
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD PROVEEDORES
  // ─────────────────────────────────────────────────────────────

  const handleSaveProveedor = () => {
    if (!formData.nombre) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    if (editingItem) {
      setProveedores(proveedores.map(p => p.id === editingItem.id ? { ...p, ...formData } : p));
      showToast('Proveedor actualizado');
    } else {
      const nuevo: Proveedor = {
        id: `prov_${Date.now()}`,
        nombre: formData.nombre,
        contacto: formData.contacto || '',
        email: formData.email || '',
        telefono: formData.telefono || '',
        productos: formData.productos || '',
        createdAt: new Date().toISOString()
      };
      setProveedores([...proveedores, nuevo]);
      showToast('Proveedor registrado');
    }
    setShowModal(null);
    setFormData({});
    setEditingItem(null);
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD PRODUCTOS
  // ─────────────────────────────────────────────────────────────

  const handleSaveProducto = () => {
    if (!formData.nombre) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    if (editingItem) {
      setProductos(productos.map(p => p.id === editingItem.id ? { ...p, ...formData } : p));
      showToast('Producto actualizado');
    } else {
      const nuevo: Producto = {
        id: `prod_${Date.now()}`,
        codigo: formData.codigo || `SKU-${productos.length + 1}`,
        nombre: formData.nombre,
        categoria: formData.categoria || 'General',
        stock: formData.stock || 0,
        stockMinimo: formData.stockMinimo || 5,
        precioCompra: formData.precioCompra || 0,
        precioVenta: formData.precioVenta || 0,
        activo: true,
        createdAt: new Date().toISOString()
      };
      setProductos([...productos, nuevo]);
      showToast('Producto agregado');
    }
    setShowModal(null);
    setFormData({});
    setEditingItem(null);
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD COMPRAS
  // ─────────────────────────────────────────────────────────────

  const handleSaveCompra = () => {
    if (!formData.total || formData.total <= 0) {
      showToast('El total es requerido', 'error');
      return;
    }

    const subtotal = formData.total / (1 + config.impuesto / 100);
    const impuestos = formData.total - subtotal;

    if (editingItem) {
      setCompras(compras.map(c => c.id === editingItem.id ? { 
        ...c, ...formData, subtotal, impuestos 
      } : c));
      showToast('Compra actualizada');
    } else {
      const nueva: Compra = {
        id: `comp_${Date.now()}`,
        numeroCompra: `CMP-${String(compras.length + 1).padStart(5, '0')}`,
        proveedorId: formData.proveedorId,
        proveedor: proveedores.find(p => p.id === formData.proveedorId),
        subtotal,
        impuestos,
        total: formData.total,
        estado: 'Pendiente',
        fecha: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      setCompras([...compras, nueva]);
      showToast('Compra registrada');
    }
    setShowModal(null);
    setFormData({});
    setEditingItem(null);
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD GASTOS
  // ─────────────────────────────────────────────────────────────

  const handleSaveGasto = () => {
    if (!formData.concepto || !formData.monto) {
      showToast('Concepto y monto son requeridos', 'error');
      return;
    }

    if (editingItem) {
      setGastos(gastos.map(g => g.id === editingItem.id ? { ...g, ...formData } : g));
      showToast('Gasto actualizado');
    } else {
      const nuevo: Gasto = {
        id: `gast_${Date.now()}`,
        concepto: formData.concepto,
        categoria: formData.categoria || 'Operativo',
        monto: formData.monto,
        descripcion: formData.descripcion || '',
        fecha: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      setGastos([...gastos, nuevo]);
      showToast('Gasto registrado');
    }
    setShowModal(null);
    setFormData({});
    setEditingItem(null);
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD USUARIOS
  // ─────────────────────────────────────────────────────────────

  const handleSaveUsuario = () => {
    if (!formData.nombre || !formData.email) {
      showToast('Nombre y email son requeridos', 'error');
      return;
    }

    if (editingItem) {
      setUsuarios(usuarios.map(u => u.id === editingItem.id ? { ...u, ...formData } : u));
      showToast('Usuario actualizado');
    } else {
      const nuevo: Usuario = {
        id: `user_${Date.now()}`,
        nombre: formData.nombre,
        email: formData.email,
        rol: formData.rol || 'vendedor',
        activo: true,
        createdAt: new Date().toISOString()
      };
      setUsuarios([...usuarios, nuevo]);
      showToast('Usuario registrado');
    }
    setShowModal(null);
    setFormData({});
    setEditingItem(null);
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD VENTAS
  // ─────────────────────────────────────────────────────────────

  const handleSaveVenta = () => {
    if (!formData.total || formData.total <= 0) {
      showToast('El total es requerido', 'error');
      return;
    }

    const subtotal = formData.total / (1 + config.impuesto / 100);
    const impuestos = formData.total - subtotal;

    const nueva: Venta = {
      id: `vent_${Date.now()}`,
      numeroVenta: `VTA-${String(ventas.length + 1).padStart(5, '0')}`,
      cliente: formData.cliente || '',
      subtotal,
      impuestos,
      total: formData.total,
      metodoPago: formData.metodoPago || 'Efectivo',
      estado: 'Completada',
      createdAt: new Date().toISOString()
    };
    setVentas([...ventas, nueva]);
    showToast('Venta registrada');
    setShowModal(null);
    setFormData({});
  };

  // ─────────────────────────────────────────────────────────────
  // MÓDULOS DE NAVEGACIÓN
  // ─────────────────────────────────────────────────────────────

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'from-emerald-500 to-teal-600' },
    { id: 'ventas', label: 'Ventas', icon: ShoppingCart, color: moduleColors.ventas.bg },
    { id: 'inventario', label: 'Inventario', icon: Package, color: moduleColors.inventario.bg },
    { id: 'clientes', label: 'Clientes', icon: Users, color: moduleColors.clientes.bg },
    { id: 'proveedores', label: 'Proveedores', icon: Truck, color: moduleColors.proveedores.bg },
    { id: 'compras', label: 'Compras', icon: Receipt, color: moduleColors.compras.bg },
    { id: 'gastos', label: 'Gastos', icon: TrendingDown, color: moduleColors.gastos.bg },
    { id: 'reportes', label: 'Reportes', icon: FileText, color: moduleColors.reportes.bg },
    { id: 'usuarios', label: 'Usuarios', icon: UserCheck, color: moduleColors.usuarios.bg },
    { id: 'config', label: 'Config', icon: Settings, color: moduleColors.config.bg },
  ];

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-violet-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-pulse ${
          toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-2xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <ShoppingCart className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{config.nombreNegocio}</h1>
                <p className="text-emerald-100 text-sm">Sistema POS - Control Total</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => showToast('Datos actualizados')}
                className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white/80 backdrop-blur-xl border-r border-white/50 min-h-[calc(100vh-80px)] sticky top-20 shadow-xl">
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
                      : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-100 hover:to-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {mod.label}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Dashboard */}
          {activeModule === 'dashboard' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">Panel de Control</h2>
              
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-violet-100 text-sm">Ventas Hoy</p>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(ventas.filter(v => new Date(v.createdAt).toDateString() === new Date().toDateString()).reduce((sum, v) => sum + v.total, 0))}</p>
                    </div>
                    <ShoppingCart className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm">Productos</p>
                      <p className="text-3xl font-bold mt-1">{productos.length}</p>
                    </div>
                    <Package className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm">Clientes</p>
                      <p className="text-3xl font-bold mt-1">{clientes.length}</p>
                    </div>
                    <Users className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Gastos</p>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(gastos.reduce((sum, g) => sum + g.monto, 0))}</p>
                    </div>
                    <TrendingDown className="w-10 h-10 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <button
                  onClick={() => { setActiveModule('ventas'); setShowModal('nueva-venta'); }}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-[1.02]"
                >
                  <ShoppingCart className="w-8 h-8 mb-2" />
                  <p className="font-bold text-lg">Nueva Venta</p>
                </button>
                
                <button
                  onClick={() => { setActiveModule('clientes'); setShowModal('nuevo-cliente'); }}
                  className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-[1.02]"
                >
                  <Users className="w-8 h-8 mb-2" />
                  <p className="font-bold text-lg">Registrar Cliente</p>
                </button>
                
                <button
                  onClick={() => { setActiveModule('compras'); setShowModal('nueva-compra'); }}
                  className="bg-gradient-to-r from-emerald-500 to-green-600 text-white p-6 rounded-2xl shadow-xl hover:shadow-2xl transition transform hover:scale-[1.02]"
                >
                  <Receipt className="w-8 h-8 mb-2" />
                  <p className="font-bold text-lg">Nueva Compra</p>
                </button>
              </div>
            </div>
          )}

          {/* Clientes Module */}
          {activeModule === 'clientes' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.clientes.bg} flex items-center justify-center`}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  Gestión de Clientes
                </h2>
                <button
                  onClick={() => { setFormData({}); setEditingItem(null); setShowModal('nuevo-cliente'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.clientes.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Registrar Cliente
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar clientes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-rose-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-rose-800">Nombre</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-rose-800">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-rose-800">Teléfono</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-rose-800">Compras</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-rose-800">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientes.filter(c => 
                        c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        c.email?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((cliente) => (
                        <tr key={cliente.id} className="hover:bg-rose-50/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                                {cliente.nombre?.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800">{cliente.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{cliente.email}</td>
                          <td className="px-4 py-3 text-slate-600">{cliente.telefono || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full text-sm font-medium">
                              {cliente.comprasTotal || 0} compras
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setFormData(cliente); setEditingItem(cliente); setShowModal('nuevo-cliente'); }}
                                className="p-2 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteCliente(cliente.id)}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {clientes.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay clientes registrados. ¡Agrega el primero!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Proveedores Module */}
          {activeModule === 'proveedores' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.proveedores.bg} flex items-center justify-center`}>
                    <Truck className="w-5 h-5 text-white" />
                  </div>
                  Gestión de Proveedores
                </h2>
                <button
                  onClick={() => { setFormData({}); setEditingItem(null); setShowModal('nuevo-proveedor'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.proveedores.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Proveedor
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-amber-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-amber-800">Nombre</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-amber-800">Contacto</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-amber-800">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-amber-800">Productos</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-amber-800">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proveedores.map((prov) => (
                        <tr key={prov.id} className="hover:bg-amber-50/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                                {prov.nombre?.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800">{prov.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{prov.contacto || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{prov.email || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{prov.productos || '-'}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setFormData(prov); setEditingItem(prov); setShowModal('nuevo-proveedor'); }}
                                className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setProveedores(proveedores.filter(p => p.id !== prov.id)); showToast('Proveedor eliminado'); }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {proveedores.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <Truck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay proveedores registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Compras Module */}
          {activeModule === 'compras' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.compras.bg} flex items-center justify-center`}>
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  Gestión de Compras
                </h2>
                <button
                  onClick={() => { setFormData({}); setEditingItem(null); setShowModal('nueva-compra'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.compras.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Nueva Compra
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-emerald-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Nº Compra</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Proveedor</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Fecha</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Total</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-emerald-800">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {compras.map((comp) => (
                        <tr key={comp.id} className="hover:bg-emerald-50/50 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{comp.numeroCompra}</td>
                          <td className="px-4 py-3 text-slate-600">{comp.proveedor?.nombre || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(comp.fecha)}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-600">{formatCurrency(comp.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              comp.estado === 'Recibida' ? 'bg-emerald-100 text-emerald-700' :
                              comp.estado === 'Pendiente' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {comp.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {compras.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay compras registradas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Gastos Module */}
          {activeModule === 'gastos' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.gastos.bg} flex items-center justify-center`}>
                    <TrendingDown className="w-5 h-5 text-white" />
                  </div>
                  Control de Gastos
                </h2>
                <button
                  onClick={() => { setFormData({ categoria: 'Operativo' }); setEditingItem(null); setShowModal('nuevo-gasto'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.gastos.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Registrar Gasto
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-red-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Concepto</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Categoría</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Fecha</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-red-800">Monto</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-red-800">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {gastos.map((gasto) => (
                        <tr key={gasto.id} className="hover:bg-red-50/50 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{gasto.concepto}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                              {gasto.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(gasto.fecha)}</td>
                          <td className="px-4 py-3 font-semibold text-red-600">{formatCurrency(gasto.monto)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setFormData(gasto); setEditingItem(gasto); setShowModal('nuevo-gasto'); }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setGastos(gastos.filter(g => g.id !== gasto.id)); showToast('Gasto eliminado'); }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {gastos.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <TrendingDown className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay gastos registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Usuarios Module */}
          {activeModule === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.usuarios.bg} flex items-center justify-center`}>
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  Gestión de Usuarios
                </h2>
                <button
                  onClick={() => { setFormData({ rol: 'vendedor' }); setEditingItem(null); setShowModal('nuevo-usuario'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.usuarios.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Usuario
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-sky-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-sky-800">Usuario</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-sky-800">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-sky-800">Rol</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-sky-800">Estado</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-sky-800">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usuarios.map((user) => (
                        <tr key={user.id} className="hover:bg-sky-50/50 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-sky-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                {user.nombre?.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-800">{user.nombre}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              user.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-sky-100 text-sky-700'
                            }`}>
                              {user.rol}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              user.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {user.activo ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setFormData(user); setEditingItem(user); setShowModal('nuevo-usuario'); }}
                                className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setUsuarios(usuarios.filter(u => u.id !== user.id)); showToast('Usuario eliminado'); }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {usuarios.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <UserCheck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay usuarios registrados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Reportes Module */}
          {activeModule === 'reportes' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.reportes.bg} flex items-center justify-center`}>
                  <FileText className="w-5 h-5 text-white" />
                </div>
                Reportes y Análisis
              </h2>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Resumen de Ventas</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl">
                      <span className="text-slate-600">Ventas del Mes</span>
                      <span className="font-bold text-xl text-violet-600">{formatCurrency(ventas.reduce((sum, v) => sum + v.total, 0))}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
                      <span className="text-slate-600">Total Transacciones</span>
                      <span className="font-bold text-xl text-emerald-600">{ventas.length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Resumen de Gastos</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl">
                      <span className="text-slate-600">Gastos Totales</span>
                      <span className="font-bold text-xl text-red-600">{formatCurrency(gastos.reduce((sum, g) => sum + g.monto, 0))}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                      <span className="text-slate-600">Total Registros</span>
                      <span className="font-bold text-xl text-amber-600">{gastos.length}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6">
                <h3 className="font-bold text-lg text-slate-800 mb-4">Resumen de Inventario</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl">
                    <p className="text-3xl font-bold text-cyan-600">{productos.length}</p>
                    <p className="text-slate-600 text-sm">Productos</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                    <p className="text-3xl font-bold text-amber-600">{productos.filter(p => p.stock <= p.stockMinimo).length}</p>
                    <p className="text-slate-600 text-sm">Stock Bajo</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl">
                    <p className="text-3xl font-bold text-rose-600">{clientes.length}</p>
                    <p className="text-slate-600 text-sm">Clientes</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Inventario Module */}
          {activeModule === 'inventario' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.inventario.bg} flex items-center justify-center`}>
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  Control de Inventario
                </h2>
                <button
                  onClick={() => { setFormData({}); setEditingItem(null); setShowModal('nuevo-producto'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.inventario.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Producto
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar productos..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-cyan-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Código</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Nombre</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Categoría</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Stock</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">P. Venta</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-cyan-800">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productos.filter(p => 
                        p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
                      ).map((prod) => (
                        <tr key={prod.id} className="hover:bg-cyan-50/50 transition">
                          <td className="px-4 py-3">
                            <code className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">{prod.codigo}</code>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-800">{prod.nombre}</td>
                          <td className="px-4 py-3 text-slate-600">{prod.categoria}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              prod.stock === 0 ? 'bg-red-100 text-red-700' :
                              prod.stock <= prod.stockMinimo ? 'bg-amber-100 text-amber-700' :
                              'bg-emerald-100 text-emerald-700'
                            }`}>
                              {prod.stock} uds
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-cyan-600">{formatCurrency(prod.precioVenta)}</td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => { setFormData(prod); setEditingItem(prod); setShowModal('nuevo-producto'); }}
                                className="p-2 text-cyan-600 hover:bg-cyan-100 rounded-lg transition"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => { setProductos(productos.filter(p => p.id !== prod.id)); showToast('Producto eliminado'); }}
                                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {productos.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                            <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay productos en inventario
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Ventas Module */}
          {activeModule === 'ventas' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.ventas.bg} flex items-center justify-center`}>
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  Gestión de Ventas
                </h2>
                <button
                  onClick={() => { setFormData({}); setShowModal('nueva-venta'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.ventas.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Nueva Venta
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-violet-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800">Nº Venta</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800">Cliente</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800">Fecha</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800">Total</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ventas.map((v) => (
                        <tr key={v.id} className="hover:bg-violet-50/50 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{v.numeroVenta}</td>
                          <td className="px-4 py-3 text-slate-600">{v.cliente || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(v.createdAt)}</td>
                          <td className="px-4 py-3 font-semibold text-violet-600">{formatCurrency(v.total)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              v.estado === 'Completada' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {v.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {ventas.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay ventas registradas
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Config Module */}
          {activeModule === 'config' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.config.bg} flex items-center justify-center`}>
                  <Settings className="w-5 h-5 text-white" />
                </div>
                Configuración del Sistema
              </h2>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 p-6 max-w-2xl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Negocio</label>
                    <input
                      type="text"
                      value={config.nombreNegocio}
                      onChange={(e) => setConfig({ ...config, nombreNegocio: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Símbolo de Moneda</label>
                    <input
                      type="text"
                      value={config.moneda}
                      onChange={(e) => setConfig({ ...config, moneda: e.target.value })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Impuesto (%)</label>
                    <input
                      type="number"
                      value={config.impuesto}
                      onChange={(e) => setConfig({ ...config, impuesto: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                  <button
                    onClick={() => showToast('Configuración guardada')}
                    className="w-full py-3 bg-gradient-to-r from-slate-600 to-gray-700 text-white rounded-xl font-medium hover:shadow-lg transition"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODALES
          ───────────────────────────────────────────────────────────── */}

      {/* Modal Cliente */}
      {showModal === 'nuevo-cliente' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className={`p-4 bg-gradient-to-r ${moduleColors.clientes.bg} text-white rounded-t-2xl flex items-center justify-between`}>
              <h3 className="font-bold text-lg">{editingItem ? 'Editar Cliente' : 'Registrar Cliente'}</h3>
              <button onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono || ''}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
                  placeholder="+52 123 456 7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
                <textarea
                  value={formData.direccion || ''}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500"
                  rows={2}
                  placeholder="Dirección del cliente"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCliente}
                  className={`flex-1 py-2 bg-gradient-to-r ${moduleColors.clientes.bg} text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2`}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Proveedor */}
      {showModal === 'nuevo-proveedor' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className={`p-4 bg-gradient-to-r ${moduleColors.proveedores.bg} text-white rounded-t-2xl flex items-center justify-between`}>
              <h3 className="font-bold text-lg">{editingItem ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
              <button onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contacto</label>
                  <input
                    type="text"
                    value={formData.contacto || ''}
                    onChange={(e) => setFormData({ ...formData, contacto: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="Persona de contacto"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.telefono || ''}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                    placeholder="Teléfono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  placeholder="correo@proveedor.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Productos que provee</label>
                <input
                  type="text"
                  value={formData.productos || ''}
                  onChange={(e) => setFormData({ ...formData, productos: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                  placeholder="Ej: Carnes, Verduras, etc."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProveedor}
                  className={`flex-1 py-2 bg-gradient-to-r ${moduleColors.proveedores.bg} text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2`}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Producto */}
      {showModal === 'nuevo-producto' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className={`p-4 bg-gradient-to-r ${moduleColors.inventario.bg} text-white rounded-t-2xl flex items-center justify-between sticky top-0`}>
              <h3 className="font-bold text-lg">{editingItem ? 'Editar Producto' : 'Nuevo Producto'}</h3>
              <button onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                  <input
                    type="text"
                    value={formData.codigo || ''}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                    placeholder="SKU-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                    placeholder="General"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                  placeholder="Nombre del producto"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                  <input
                    type="number"
                    value={formData.stock || 0}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mín.</label>
                  <input
                    type="number"
                    value={formData.stockMinimo || 5}
                    onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) || 5 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">P. Compra</label>
                  <input
                    type="number"
                    value={formData.precioCompra || 0}
                    onChange={(e) => setFormData({ ...formData, precioCompra: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio de Venta *</label>
                <input
                  type="number"
                  value={formData.precioVenta || ''}
                  onChange={(e) => setFormData({ ...formData, precioVenta: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProducto}
                  className={`flex-1 py-2 bg-gradient-to-r ${moduleColors.inventario.bg} text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2`}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gasto */}
      {showModal === 'nuevo-gasto' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className={`p-4 bg-gradient-to-r ${moduleColors.gastos.bg} text-white rounded-t-2xl flex items-center justify-between`}>
              <h3 className="font-bold text-lg">{editingItem ? 'Editar Gasto' : 'Registrar Gasto'}</h3>
              <button onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Concepto *</label>
                <input
                  type="text"
                  value={formData.concepto || ''}
                  onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Descripción del gasto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                  <select
                    value={formData.categoria || 'Operativo'}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  >
                    <option value="Operativo">Operativo</option>
                    <option value="Servicios">Servicios</option>
                    <option value="Nómina">Nómina</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Otros">Otros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    value={formData.monto || ''}
                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
                <textarea
                  value={formData.descripcion || ''}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  rows={2}
                  placeholder="Notas adicionales"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveGasto}
                  className={`flex-1 py-2 bg-gradient-to-r ${moduleColors.gastos.bg} text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2`}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Usuario */}
      {showModal === 'nuevo-usuario' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className={`p-4 bg-gradient-to-r ${moduleColors.usuarios.bg} text-white rounded-t-2xl flex items-center justify-between`}>
              <h3 className="font-bold text-lg">{editingItem ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
              <button onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.nombre || ''}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                <select
                  value={formData.rol || 'vendedor'}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                >
                  <option value="admin">Administrador</option>
                  <option value="vendedor">Vendedor</option>
                  <option value="almacen">Almacén</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUsuario}
                  className={`flex-1 py-2 bg-gradient-to-r ${moduleColors.usuarios.bg} text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2`}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Venta */}
      {showModal === 'nueva-venta' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className={`p-4 bg-gradient-to-r ${moduleColors.ventas.bg} text-white rounded-t-2xl flex items-center justify-between`}>
              <h3 className="font-bold text-lg">Nueva Venta</h3>
              <button onClick={() => { setShowModal(null); setFormData({}); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
                <input
                  type="text"
                  value={formData.cliente || ''}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500"
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total *</label>
                <input
                  type="number"
                  value={formData.total || ''}
                  onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
                <select
                  value={formData.metodoPago || 'Efectivo'}
                  onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-violet-500"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transferencia">Transferencia</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowModal(null); setFormData({}); }}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveVenta}
                  className={`flex-1 py-2 bg-gradient-to-r ${moduleColors.ventas.bg} text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2`}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Compra */}
      {showModal === 'nueva-compra' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className={`p-4 bg-gradient-to-r ${moduleColors.compras.bg} text-white rounded-t-2xl flex items-center justify-between`}>
              <h3 className="font-bold text-lg">Nueva Compra</h3>
              <button onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
                <select
                  value={formData.proveedorId || ''}
                  onChange={(e) => setFormData({ ...formData, proveedorId: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Total *</label>
                <input
                  type="number"
                  value={formData.total || ''}
                  onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }}
                  className="flex-1 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCompra}
                  className={`flex-1 py-2 bg-gradient-to-r ${moduleColors.compras.bg} text-white rounded-xl hover:opacity-90 transition flex items-center justify-center gap-2`}
                >
                  <Save className="w-4 h-4" />
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
