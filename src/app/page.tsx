'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  ShoppingCart, Package, Users, Truck, Receipt, TrendingDown,
  BarChart3, Settings, UserCheck, Plus, Edit, Trash2, Search,
  X, Save, DollarSign, RefreshCw, CheckCircle, AlertTriangle,
  FileText, Loader2
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

interface DetalleVenta {
  id: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Venta {
  id: string;
  numeroVenta: string;
  clienteNombre?: string;
  subtotal: number;
  impuestos: number;
  total: number;
  metodoPago: string;
  estado: string;
  createdAt: string;
  detalles?: DetalleVenta[];
}

interface DetalleCompra {
  id: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

interface Compra {
  id: string;
  numeroCompra: string;
  proveedorNombre?: string;
  subtotal: number;
  impuestos: number;
  total: number;
  estado: string;
  fecha: string;
  createdAt: string;
  detalles?: DetalleCompra[];
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

interface Config {
  id: string;
  nombreNegocio: string;
  moneda: string;
  impuesto: number;
  direccion?: string;
  telefono?: string;
  email?: string;
}

interface DashboardData {
  ventasHoy: number;
  cantidadVentasHoy: number;
  totalProductos: number;
  totalClientes: number;
  gastosMes: number;
  productosBajoStock: Producto[];
  ultimasVentas: Venta[];
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
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function SistemaPOS() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Form states
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Config
  const [config, setConfig] = useState<Config>({
    id: 'default',
    nombreNegocio: 'Mi Negocio',
    moneda: '$',
    impuesto: 16,
  });

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
  // CARGAR DATOS DE LA API
  // ─────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setInitialLoading(true);
    try {
      const [configRes, clientesRes, productosRes, proveedoresRes, comprasRes, gastosRes, usuariosRes, ventasRes, dashboardRes] = await Promise.all([
        fetch('/api/pos/config'),
        fetch('/api/pos/clientes'),
        fetch('/api/pos/productos'),
        fetch('/api/pos/proveedores'),
        fetch('/api/pos/compras'),
        fetch('/api/pos/gastos'),
        fetch('/api/pos/usuarios'),
        fetch('/api/pos/ventas'),
        fetch('/api/pos/dashboard'),
      ]);

      if (configRes.ok) setConfig(await configRes.json());
      if (clientesRes.ok) setClientes(await clientesRes.json());
      if (productosRes.ok) setProductos(await productosRes.json());
      if (proveedoresRes.ok) setProveedores(await proveedoresRes.json());
      if (comprasRes.ok) setCompras(await comprasRes.json());
      if (gastosRes.ok) setGastos(await gastosRes.json());
      if (usuariosRes.ok) setUsuarios(await usuariosRes.json());
      if (ventasRes.ok) setVentas(await ventasRes.json());
      if (dashboardRes.ok) setDashboardData(await dashboardRes.json());
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
  // CRUD CLIENTES
  // ─────────────────────────────────────────────────────────────

  const handleSaveCliente = async () => {
    if (!formData.nombre || !formData.email) {
      showToast('Nombre y email son requeridos', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingItem) {
        // Por ahora solo actualizamos localmente, se puede agregar API PUT
        setClientes(clientes.map(c => c.id === editingItem.id ? { ...c, ...formData } : c));
        showToast('Cliente actualizado');
      } else {
        const res = await fetch('/api/pos/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          const nuevo = await res.json();
          setClientes([...clientes, nuevo]);
          showToast('Cliente registrado exitosamente');
        } else {
          const err = await res.json();
          showToast(err.error || 'Error al registrar cliente', 'error');
        }
      }
      setShowModal(null);
      setFormData({});
      setEditingItem(null);
    } catch (error) {
      showToast('Error al guardar cliente', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD PROVEEDORES
  // ─────────────────────────────────────────────────────────────

  const handleSaveProveedor = async () => {
    if (!formData.nombre) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pos/proveedores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setProveedores([...proveedores, nuevo]);
        showToast('Proveedor registrado');
      } else {
        showToast('Error al registrar proveedor', 'error');
      }
      setShowModal(null);
      setFormData({});
    } catch (error) {
      showToast('Error al guardar proveedor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD PRODUCTOS
  // ─────────────────────────────────────────────────────────────

  const handleSaveProducto = async () => {
    if (!formData.nombre) {
      showToast('El nombre es requerido', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pos/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setProductos([...productos, nuevo]);
        showToast('Producto agregado');
      } else {
        showToast('Error al agregar producto', 'error');
      }
      setShowModal(null);
      setFormData({});
    } catch (error) {
      showToast('Error al guardar producto', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD COMPRAS
  // ─────────────────────────────────────────────────────────────

  const handleSaveCompra = async () => {
    if (!formData.total || formData.total <= 0) {
      showToast('El total es requerido', 'error');
      return;
    }

    setLoading(true);
    try {
      const subtotal = formData.total / (1 + config.impuesto / 100);
      const impuestos = formData.total - subtotal;

      const res = await fetch('/api/pos/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subtotal,
          impuestos,
        }),
      });
      if (res.ok) {
        const nueva = await res.json();
        setCompras([...compras, nueva]);
        showToast('Compra registrada');
      } else {
        showToast('Error al registrar compra', 'error');
      }
      setShowModal(null);
      setFormData({});
    } catch (error) {
      showToast('Error al guardar compra', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD GASTOS
  // ─────────────────────────────────────────────────────────────

  const handleSaveGasto = async () => {
    if (!formData.concepto || !formData.monto) {
      showToast('Concepto y monto son requeridos', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pos/gastos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setGastos([...gastos, nuevo]);
        showToast('Gasto registrado');
      } else {
        showToast('Error al registrar gasto', 'error');
      }
      setShowModal(null);
      setFormData({});
    } catch (error) {
      showToast('Error al guardar gasto', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD USUARIOS
  // ─────────────────────────────────────────────────────────────

  const handleSaveUsuario = async () => {
    if (!formData.nombre || !formData.email) {
      showToast('Nombre y email son requeridos', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/pos/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        const nuevo = await res.json();
        setUsuarios([...usuarios, nuevo]);
        showToast('Usuario registrado');
      } else {
        showToast('Error al registrar usuario', 'error');
      }
      setShowModal(null);
      setFormData({});
    } catch (error) {
      showToast('Error al guardar usuario', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // CRUD VENTAS
  // ─────────────────────────────────────────────────────────────

  const handleSaveVenta = async () => {
    if (!formData.total || formData.total <= 0) {
      showToast('El total es requerido', 'error');
      return;
    }

    setLoading(true);
    try {
      const subtotal = formData.total / (1 + config.impuesto / 100);
      const impuestos = formData.total - subtotal;

      const res = await fetch('/api/pos/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          subtotal,
          impuestos,
        }),
      });
      if (res.ok) {
        const nueva = await res.json();
        setVentas([...ventas, nueva]);
        showToast('Venta registrada');
      } else {
        showToast('Error al registrar venta', 'error');
      }
      setShowModal(null);
      setFormData({});
    } catch (error) {
      showToast('Error al guardar venta', 'error');
    } finally {
      setLoading(false);
    }
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
  // MODAL COMPONENT
  // ─────────────────────────────────────────────────────────────

  const Modal = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">{title}</h3>
          <button onClick={() => { setShowModal(null); setFormData({}); setEditingItem(null); }} className="p-2 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );

  // Input field component
  const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input
      {...props}
      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    />
  );

  // Select component
  const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <select
      {...props}
      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
    />
  );

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-violet-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-600">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-violet-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-xl flex items-center gap-2 ${
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
                <p className="text-emerald-100 text-sm">Sistema POS - Base de datos Neon</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={loadData}
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
                      <p className="text-3xl font-bold mt-1">{formatCurrency(dashboardData?.ventasHoy || 0)}</p>
                    </div>
                    <ShoppingCart className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-cyan-100 text-sm">Productos</p>
                      <p className="text-3xl font-bold mt-1">{dashboardData?.totalProductos || productos.length}</p>
                    </div>
                    <Package className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-rose-100 text-sm">Clientes</p>
                      <p className="text-3xl font-bold mt-1">{dashboardData?.totalClientes || clientes.length}</p>
                    </div>
                    <Users className="w-10 h-10 opacity-50" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100 text-sm">Gastos</p>
                      <p className="text-3xl font-bold mt-1">{formatCurrency(dashboardData?.gastosMes || gastos.reduce((s, g) => s + g.monto, 0))}</p>
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
                  Gestión de Clientes ({clientes.length})
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
                        </tr>
                      ))}
                      {clientes.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
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
                  Proveedores ({proveedores.length})
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
                        </tr>
                      ))}
                      {proveedores.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
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
                  Compras ({compras.length})
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
                          <td className="px-4 py-3 text-slate-600">{comp.proveedorNombre || '-'}</td>
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
                  Gastos ({gastos.length})
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
                        </tr>
                      ))}
                      {gastos.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-slate-500">
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

          {/* Inventario Module */}
          {activeModule === 'inventario' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.inventario.bg} flex items-center justify-center`}>
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  Inventario ({productos.length})
                </h2>
                <button
                  onClick={() => { setFormData({ categoria: 'General', stock: 0, stockMinimo: 5, precioCompra: 0, precioVenta: 0 }); setEditingItem(null); setShowModal('nuevo-producto'); }}
                  className={`px-6 py-3 bg-gradient-to-r ${moduleColors.inventario.bg} text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition flex items-center gap-2`}
                >
                  <Plus className="w-5 h-5" />
                  Nuevo Producto
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/50 overflow-hidden">
                <div className="overflow-x-auto max-h-96">
                  <table className="w-full">
                    <thead className="bg-cyan-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Código</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Nombre</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Categoría</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Stock</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-cyan-800">Precio Venta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {productos.map((prod) => (
                        <tr key={prod.id} className="hover:bg-cyan-50/50 transition">
                          <td className="px-4 py-3 font-mono text-sm text-slate-600">{prod.codigo}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{prod.nombre}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-sm">
                              {prod.categoria}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-semibold ${prod.stock <= prod.stockMinimo ? 'text-red-600' : 'text-slate-800'}`}>
                              {prod.stock} {prod.stock <= prod.stockMinimo && '⚠️'}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-semibold text-cyan-600">{formatCurrency(prod.precioVenta)}</td>
                        </tr>
                      ))}
                      {productos.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                            <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            No hay productos registrados
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
                  Ventas ({ventas.length})
                </h2>
                <button
                  onClick={() => { setFormData({ metodoPago: 'Efectivo' }); setShowModal('nueva-venta'); }}
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-violet-800">Método</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ventas.map((venta) => (
                        <tr key={venta.id} className="hover:bg-violet-50/50 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{venta.numeroVenta}</td>
                          <td className="px-4 py-3 text-slate-600">{venta.clienteNombre || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(venta.createdAt)}</td>
                          <td className="px-4 py-3 font-semibold text-violet-600">{formatCurrency(venta.total)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 bg-violet-100 text-violet-700 rounded-full text-sm">
                              {venta.metodoPago}
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

          {/* Usuarios Module */}
          {activeModule === 'usuarios' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${moduleColors.usuarios.bg} flex items-center justify-center`}>
                    <UserCheck className="w-5 h-5 text-white" />
                  </div>
                  Usuarios ({usuarios.length})
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
                        <th className="px-4 py-3 text-left text-sm font-semibold text-sky-800">Nombre</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-sky-800">Email</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-sky-800">Rol</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usuarios.map((user) => (
                        <tr key={user.id} className="hover:bg-sky-50/50 transition">
                          <td className="px-4 py-3 font-medium text-slate-800">{user.nombre}</td>
                          <td className="px-4 py-3 text-slate-600">{user.email}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                              user.rol === 'admin' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {user.rol}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {usuarios.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-12 text-center text-slate-500">
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
                Reportes
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Resumen de Ventas</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Ventas:</span>
                      <span className="font-bold text-violet-600">{ventas.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Monto Total:</span>
                      <span className="font-bold text-violet-600">{formatCurrency(ventas.reduce((s, v) => s + v.total, 0))}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Resumen de Gastos</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Total Gastos:</span>
                      <span className="font-bold text-red-600">{gastos.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Monto Total:</span>
                      <span className="font-bold text-red-600">{formatCurrency(gastos.reduce((s, g) => s + g.monto, 0))}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Inventario</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Productos:</span>
                      <span className="font-bold text-cyan-600">{productos.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Stock Bajo:</span>
                      <span className="font-bold text-red-600">{productos.filter(p => p.stock <= p.stockMinimo).length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                  <h3 className="font-bold text-lg text-slate-800 mb-4">Clientes y Proveedores</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Clientes:</span>
                      <span className="font-bold text-rose-600">{clientes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Proveedores:</span>
                      <span className="font-bold text-amber-600">{proveedores.length}</span>
                    </div>
                  </div>
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
                Configuración
              </h2>

              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-white/50">
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del Negocio</label>
                    <Input
                      value={config.nombreNegocio}
                      onChange={(e) => setConfig({ ...config, nombreNegocio: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
                      <Input
                        value={config.moneda}
                        onChange={(e) => setConfig({ ...config, moneda: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Impuesto (%)</label>
                      <Input
                        type="number"
                        value={config.impuesto}
                        onChange={(e) => setConfig({ ...config, impuesto: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      await fetch('/api/pos/config', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(config),
                      });
                      showToast('Configuración guardada');
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-slate-500 to-gray-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition"
                  >
                    Guardar Configuración
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALES */}
      {showModal === 'nuevo-cliente' && (
        <Modal title="Registrar Cliente">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <Input value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <Input value={formData.telefono || ''} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dirección</label>
              <Input value={formData.direccion || ''} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
            </div>
            <button
              onClick={handleSaveCliente}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {editingItem ? 'Actualizar' : 'Registrar'} Cliente
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'nuevo-proveedor' && (
        <Modal title="Nuevo Proveedor">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <Input value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contacto</label>
              <Input value={formData.contacto || ''} onChange={(e) => setFormData({ ...formData, contacto: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <Input value={formData.telefono || ''} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Productos que provee</label>
              <Input value={formData.productos || ''} onChange={(e) => setFormData({ ...formData, productos: e.target.value })} />
            </div>
            <button
              onClick={handleSaveProveedor}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Registrar Proveedor
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'nuevo-producto' && (
        <Modal title="Nuevo Producto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <Input value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
              <Input value={formData.codigo || ''} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} placeholder="Auto-generado si vacío" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <Select value={formData.categoria || 'General'} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}>
                <option>General</option>
                <option>Alimentos</option>
                <option>Bebidas</option>
                <option>Limpieza</option>
                <option>Otro</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock</label>
                <Input type="number" value={formData.stock || 0} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
                <Input type="number" value={formData.stockMinimo || 5} onChange={(e) => setFormData({ ...formData, stockMinimo: parseInt(e.target.value) || 5 })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio Compra</label>
                <Input type="number" step="0.01" value={formData.precioCompra || 0} onChange={(e) => setFormData({ ...formData, precioCompra: parseFloat(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Precio Venta</label>
                <Input type="number" step="0.01" value={formData.precioVenta || 0} onChange={(e) => setFormData({ ...formData, precioVenta: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <button
              onClick={handleSaveProducto}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Agregar Producto
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'nueva-venta' && (
        <Modal title="Nueva Venta">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cliente</label>
              <Select value={formData.clienteId || ''} onChange={(e) => {
                const cliente = clientes.find(c => c.id === e.target.value);
                setFormData({ ...formData, clienteId: e.target.value, clienteNombre: cliente?.nombre || '' });
              }}>
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total *</label>
              <Input type="number" step="0.01" value={formData.total || ''} onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Método de Pago</label>
              <Select value={formData.metodoPago || 'Efectivo'} onChange={(e) => setFormData({ ...formData, metodoPago: e.target.value })}>
                <option>Efectivo</option>
                <option>Tarjeta</option>
                <option>Transferencia</option>
              </Select>
            </div>
            <button
              onClick={handleSaveVenta}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Registrar Venta
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'nueva-compra' && (
        <Modal title="Nueva Compra">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proveedor</label>
              <Select value={formData.proveedorId || ''} onChange={(e) => {
                const prov = proveedores.find(p => p.id === e.target.value);
                setFormData({ ...formData, proveedorId: e.target.value, proveedorNombre: prov?.nombre || '' });
              }}>
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total *</label>
              <Input type="number" step="0.01" value={formData.total || ''} onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
              <Select value={formData.estado || 'Pendiente'} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}>
                <option>Pendiente</option>
                <option>Recibida</option>
                <option>Cancelada</option>
              </Select>
            </div>
            <button
              onClick={handleSaveCompra}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Registrar Compra
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'nuevo-gasto' && (
        <Modal title="Registrar Gasto">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Concepto *</label>
              <Input value={formData.concepto || ''} onChange={(e) => setFormData({ ...formData, concepto: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
              <Select value={formData.categoria || 'Operativo'} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}>
                <option>Operativo</option>
                <option>Servicios</option>
                <option>Nómina</option>
                <option>Impuestos</option>
                <option>Otro</option>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto *</label>
              <Input type="number" step="0.01" value={formData.monto || ''} onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
              <Input value={formData.descripcion || ''} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
            </div>
            <button
              onClick={handleSaveGasto}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Registrar Gasto
            </button>
          </div>
        </Modal>
      )}

      {showModal === 'nuevo-usuario' && (
        <Modal title="Nuevo Usuario">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
              <Input value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <Input type="email" value={formData.email || ''} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
              <Select value={formData.rol || 'vendedor'} onChange={(e) => setFormData({ ...formData, rol: e.target.value })}>
                <option value="vendedor">Vendedor</option>
                <option value="admin">Administrador</option>
                <option value="almacen">Almacén</option>
              </Select>
            </div>
            <button
              onClick={handleSaveUsuario}
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              Registrar Usuario
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
