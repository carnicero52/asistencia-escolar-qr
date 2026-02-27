/**
 * ═══════════════════════════════════════════════════════════════
 * SISTEMA DE INVENTARIO PROFESIONAL - Google Apps Script
 * ═══════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN - CAMBIAR ESTOS VALORES
// ─────────────────────────────────────────────────────────────

const CONFIG = {
  // Telegram
  TELEGRAM_BOT_TOKEN: '8518192400:AAFqTyWwzwHVN6kiFOn_9Kughixi_fCc0Q0',
  TELEGRAM_CHAT_ID: '5743796914',
  
  // Email del propietario
  EMAIL_PROPIETARIO: 'marcocarnicero1@gmail.com',
  
  // Nombre del negocio
  NOMBRE_NEGOCIO: 'Mi Comercio',
  
  // Stock mínimo para alertas
  STOCK_MINIMO: 5,
  
  // Porcentaje de ganancia por defecto (30%)
  PORCENTAJE_GANANCIA: 30,
  
  // Moneda
  MONEDA: '$',
  
  // Moneda para código HTML (escapado)
  MONEDA_HTML: '$'
};

// ─────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL - ABRIR APLICACIÓN WEB
// ─────────────────────────────────────────────────────────────

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Sistema de Inventario')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ─────────────────────────────────────────────────────────────
// HOJA DE CÁLCULO - CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheetProductos() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('Productos');
  if (!sheet) {
    sheet = ss.insertSheet('Productos');
    sheet.appendRow(['ID', 'Código', 'Nombre', 'Categoría', 'Stock', 'Stock Mínimo', 
                     'Precio Compra', 'Precio Venta', 'Ganancia %', 'Ganancia $', 
                     'Proveedor', 'Ubicación', 'Fecha Registro', 'Última Actualización']);
    formatHeader(sheet);
  }
  return sheet;
}

function getSheetMovimientos() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('Movimientos');
  if (!sheet) {
    sheet = ss.insertSheet('Movimientos');
    sheet.appendRow(['ID', 'Fecha', 'Tipo', 'Producto ID', 'Producto', 
                     'Cantidad', 'Precio Unitario', 'Total', 'Motivo', 'Usuario']);
    formatHeader(sheet);
  }
  return sheet;
}

function getSheetConfiguracion() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('Configuración');
  if (!sheet) {
    sheet = ss.insertSheet('Configuración');
    sheet.appendRow(['Parámetro', 'Valor']);
    sheet.appendRow(['Stock Mínimo Global', CONFIG.STOCK_MINIMO]);
    sheet.appendRow(['Porcentaje Ganancia', CONFIG.PORCENTAJE_GANANCIA]);
    sheet.appendRow(['Moneda', CONFIG.MONEDA]);
  }
  return sheet;
}

function formatHeader(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  headerRange.setBackground('#1a365d');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

// ─────────────────────────────────────────────────────────────
// PRODUCTOS - CRUD
// ─────────────────────────────────────────────────────────────

function obtenerProductos() {
  const sheet = getSheetProductos();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  const productos = [];
  for (let i = 1; i < data.length; i++) {
    productos.push({
      id: data[i][0] || '',
      codigo: data[i][1] || '',
      nombre: data[i][2] || '',
      categoria: data[i][3] || '',
      stock: parseFloat(data[i][4]) || 0,
      stockMinimo: parseFloat(data[i][5]) || CONFIG.STOCK_MINIMO,
      precioCompra: parseFloat(data[i][6]) || 0,
      precioVenta: parseFloat(data[i][7]) || 0,
      gananciaPorcentaje: parseFloat(data[i][8]) || CONFIG.PORCENTAJE_GANANCIA,
      gananciaMonto: parseFloat(data[i][9]) || 0,
      proveedor: data[i][10] || '',
      ubicacion: data[i][11] || '',
      fechaRegistro: data[i][12] || '',
      ultimaActualizacion: data[i][13] || ''
    });
  }
  
  return productos;
}

function agregarProducto(producto) {
  const sheet = getSheetProductos();
  const id = Utilities.getUuid();
  const now = new Date();
  
  // Calcular precio de venta y ganancia
  const precioCompra = parseFloat(producto.precioCompra) || 0;
  const gananciaPorcentaje = parseFloat(producto.gananciaPorcentaje) || CONFIG.PORCENTAJE_GANANCIA;
  const precioVenta = precioCompra * (1 + gananciaPorcentaje / 100);
  const gananciaMonto = precioVenta - precioCompra;
  
  sheet.appendRow([
    id,
    producto.codigo || generarCodigo(producto.nombre),
    producto.nombre,
    producto.categoria || 'General',
    parseFloat(producto.stock) || 0,
    parseFloat(producto.stockMinimo) || CONFIG.STOCK_MINIMO,
    precioCompra,
    precioVenta,
    gananciaPorcentaje,
    gananciaMonto,
    producto.proveedor || '',
    producto.ubicacion || '',
    now,
    now
  ]);
  
  // Verificar stock bajo
  const stock = parseFloat(producto.stock) || 0;
  const stockMinimo = parseFloat(producto.stockMinimo) || CONFIG.STOCK_MINIMO;
  
  if (stock <= stockMinimo) {
    enviarAlertaStockBajo(producto.nombre, stock, stockMinimo);
  }
  
  return { success: true, id: id, mensaje: 'Producto agregado correctamente' };
}

function actualizarProducto(producto) {
  const sheet = getSheetProductos();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === producto.id) {
      const precioCompra = parseFloat(producto.precioCompra) || 0;
      const gananciaPorcentaje = parseFloat(producto.gananciaPorcentaje) || CONFIG.PORCENTAJE_GANANCIA;
      const precioVenta = precioCompra * (1 + gananciaPorcentaje / 100);
      const gananciaMonto = precioVenta - precioCompra;
      
      sheet.getRange(i + 1, 2, 1, 13).setValues([[
        producto.codigo,
        producto.nombre,
        producto.categoria,
        parseFloat(producto.stock) || 0,
        parseFloat(producto.stockMinimo) || CONFIG.STOCK_MINIMO,
        precioCompra,
        precioVenta,
        gananciaPorcentaje,
        gananciaMonto,
        producto.proveedor,
        producto.ubicacion,
        data[i][12], // Mantener fecha original
        new Date()
      ]]);
      
      // Verificar stock bajo
      const stock = parseFloat(producto.stock) || 0;
      const stockMinimo = parseFloat(producto.stockMinimo) || CONFIG.STOCK_MINIMO;
      
      if (stock <= stockMinimo) {
        enviarAlertaStockBajo(producto.nombre, stock, stockMinimo);
      }
      
      return { success: true, mensaje: 'Producto actualizado correctamente' };
    }
  }
  
  return { success: false, mensaje: 'Producto no encontrado' };
}

function eliminarProducto(id) {
  const sheet = getSheetProductos();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      sheet.deleteRow(i + 1);
      return { success: true, mensaje: 'Producto eliminado correctamente' };
    }
  }
  
  return { success: false, mensaje: 'Producto no encontrado' };
}

function generarCodigo(nombre) {
  const prefijo = nombre.substring(0, 3).toUpperCase();
  const numero = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return prefijo + '-' + numero;
}

// ─────────────────────────────────────────────────────────────
// MOVIMIENTOS - ENTRADAS Y SALIDAS
// ─────────────────────────────────────────────────────────────

function obtenerMovimientos(filtros) {
  const sheet = getSheetMovimientos();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return [];
  
  let movimientos = [];
  
  for (let i = 1; i < data.length; i++) {
    movimientos.push({
      id: data[i][0] || '',
      fecha: data[i][1] || '',
      tipo: data[i][2] || '',
      productoId: data[i][3] || '',
      producto: data[i][4] || '',
      cantidad: parseFloat(data[i][5]) || 0,
      precioUnitario: parseFloat(data[i][6]) || 0,
      total: parseFloat(data[i][7]) || 0,
      motivo: data[i][8] || '',
      usuario: data[i][9] || 'Sistema'
    });
  }
  
  // Aplicar filtros si existen
  if (filtros) {
    if (filtros.tipo && filtros.tipo !== 'todos') {
      movimientos = movimientos.filter(m => m.tipo === filtros.tipo);
    }
    if (filtros.producto) {
      movimientos = movimientos.filter(m => 
        m.producto.toLowerCase().includes(filtros.producto.toLowerCase())
      );
    }
    if (filtros.fechaDesde) {
      const fechaDesde = new Date(filtros.fechaDesde);
      movimientos = movimientos.filter(m => new Date(m.fecha) >= fechaDesde);
    }
    if (filtros.fechaHasta) {
      const fechaHasta = new Date(filtros.fechaHasta);
      movimientos = movimientos.filter(m => new Date(m.fecha) <= fechaHasta);
    }
  }
  
  // Ordenar por fecha descendente
  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  return movimientos;
}

function registrarEntrada(datos) {
  const sheetProductos = getSheetProductos();
  const sheetMovimientos = getSheetMovimientos();
  const dataProductos = sheetProductos.getDataRange().getValues();
  
  const cantidad = parseFloat(datos.cantidad) || 0;
  const precioUnitario = parseFloat(datos.precioUnitario) || 0;
  
  // Buscar producto y actualizar stock
  for (let i = 1; i < dataProductos.length; i++) {
    if (dataProductos[i][0] === datos.productoId) {
      const stockActual = parseFloat(dataProductos[i][4]) || 0;
      const nuevoStock = stockActual + cantidad;
      
      // Actualizar stock
      sheetProductos.getRange(i + 1, 5).setValue(nuevoStock);
      sheetProductos.getRange(i + 1, 14).setValue(new Date());
      
      // Registrar movimiento
      const idMov = Utilities.getUuid();
      sheetMovimientos.appendRow([
        idMov,
        new Date(),
        'ENTRADA',
        datos.productoId,
        dataProductos[i][2], // Nombre del producto
        cantidad,
        precioUnitario,
        cantidad * precioUnitario,
        datos.motivo || 'Reabastecimiento',
        datos.usuario || 'Sistema'
      ]);
      
      // Enviar notificación
      enviarNotificacionEntrada(dataProductos[i][2], cantidad, nuevoStock);
      
      return { 
        success: true, 
        mensaje: 'Entrada registrada correctamente',
        nuevoStock: nuevoStock
      };
    }
  }
  
  return { success: false, mensaje: 'Producto no encontrado' };
}

function registrarSalida(datos) {
  const sheetProductos = getSheetProductos();
  const sheetMovimientos = getSheetMovimientos();
  const dataProductos = sheetProductos.getDataRange().getValues();
  
  const cantidad = parseFloat(datos.cantidad) || 0;
  const precioUnitario = parseFloat(datos.precioUnitario) || 0;
  
  // Buscar producto
  for (let i = 1; i < dataProductos.length; i++) {
    if (dataProductos[i][0] === datos.productoId) {
      const stockActual = parseFloat(dataProductos[i][4]) || 0;
      const stockMinimo = parseFloat(dataProductos[i][5]) || CONFIG.STOCK_MINIMO;
      const nombreProducto = dataProductos[i][2];
      
      // Verificar stock suficiente
      if (stockActual < cantidad) {
        return { 
          success: false, 
          mensaje: `Stock insuficiente. Disponible: ${stockActual}` 
        };
      }
      
      const nuevoStock = stockActual - cantidad;
      
      // Actualizar stock
      sheetProductos.getRange(i + 1, 5).setValue(nuevoStock);
      sheetProductos.getRange(i + 1, 14).setValue(new Date());
      
      // Registrar movimiento
      const idMov = Utilities.getUuid();
      sheetMovimientos.appendRow([
        idMov,
        new Date(),
        'SALIDA',
        datos.productoId,
        nombreProducto,
        cantidad,
        precioUnitario,
        cantidad * precioUnitario,
        datos.motivo || 'Venta',
        datos.usuario || 'Sistema'
      ]);
      
      // Enviar notificación
      enviarNotificacionSalida(nombreProducto, cantidad, nuevoStock);
      
      // Verificar stock bajo
      if (nuevoStock <= stockMinimo) {
        enviarAlertaStockBajo(nombreProducto, nuevoStock, stockMinimo);
      }
      
      return { 
        success: true, 
        mensaje: 'Salida registrada correctamente',
        nuevoStock: nuevoStock
      };
    }
  }
  
  return { success: false, mensaje: 'Producto no encontrado' };
}

// ─────────────────────────────────────────────────────────────
// DASHBOARD - ESTADÍSTICAS
// ─────────────────────────────────────────────────────────────

function obtenerEstadisticas() {
  const productos = obtenerProductos();
  const movimientos = obtenerMovimientos(null);
  
  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);
  const inicioSemana = new Date(now);
  inicioSemana.setDate(now.getDate() - 7);
  
  // Estadísticas generales
  const totalProductos = productos.length;
  const productosStockBajo = productos.filter(p => p.stock <= p.stockMinimo).length;
  const productosSinStock = productos.filter(p => p.stock === 0).length;
  
  // Valor del inventario
  const valorInventario = productos.reduce((sum, p) => sum + (p.precioCompra * p.stock), 0);
  const valorVenta = productos.reduce((sum, p) => sum + (p.precioVenta * p.stock), 0);
  const gananciaPotencial = valorVenta - valorInventario;
  
  // Movimientos del mes
  const movimientosMes = movimientos.filter(m => new Date(m.fecha) >= inicioMes);
  const entradasMes = movimientosMes.filter(m => m.tipo === 'ENTRADA');
  const salidasMes = movimientosMes.filter(m => m.tipo === 'SALIDA');
  
  const totalEntradasMes = entradasMes.reduce((sum, m) => sum + m.cantidad, 0);
  const totalSalidasMes = salidasMes.reduce((sum, m) => sum + m.cantidad, 0);
  const valorEntradasMes = entradasMes.reduce((sum, m) => sum + m.total, 0);
  const valorSalidasMes = salidasMes.reduce((sum, m) => sum + m.total, 0);
  
  // Movimientos de la semana
  const movimientosSemana = movimientos.filter(m => new Date(m.fecha) >= inicioSemana);
  const totalEntradasSemana = movimientosSemana.filter(m => m.tipo === 'ENTRADA').reduce((sum, m) => sum + m.cantidad, 0);
  const totalSalidasSemana = movimientosSemana.filter(m => m.tipo === 'SALIDA').reduce((sum, m) => sum + m.cantidad, 0);
  
  // Productos por categoría
  const categorias = {};
  productos.forEach(p => {
    const cat = p.categoria || 'Sin categoría';
    if (!categorias[cat]) categorias[cat] = { cantidad: 0, valor: 0 };
    categorias[cat].cantidad++;
    categorias[cat].valor += p.precioCompra * p.stock;
  });
  
  // Productos más vendidos (último mes)
  const ventasPorProducto = {};
  salidasMes.forEach(m => {
    if (!ventasPorProducto[m.producto]) {
      ventasPorProducto[m.producto] = { nombre: m.producto, cantidad: 0, total: 0 };
    }
    ventasPorProducto[m.producto].cantidad += m.cantidad;
    ventasPorProducto[m.producto].total += m.total;
  });
  
  const productosMasVendidos = Object.values(ventasPorProducto)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);
  
  // Alertas de stock
  const alertas = productos
    .filter(p => p.stock <= p.stockMinimo)
    .map(p => ({
      nombre: p.nombre,
      stock: p.stock,
      stockMinimo: p.stockMinimo,
      estado: p.stock === 0 ? 'CRÍTICO' : 'BAJO'
    }));
  
  return {
    totalProductos,
    productosStockBajo,
    productosSinStock,
    valorInventario,
    valorVenta,
    gananciaPotencial,
    movimientos: {
      mes: {
        entradas: totalEntradasMes,
        salidas: totalSalidasSemana,
        valorEntradas: valorEntradasMes,
        valorSalidas: valorSalidasMes
      },
      semana: {
        entradas: totalEntradasSemana,
        salidas: totalSalidasSemana
      }
    },
    categorias,
    productosMasVendidos,
    alertas
  };
}

// ─────────────────────────────────────────────────────────────
// NOTIFICACIONES - TELEGRAM Y EMAIL
// ─────────────────────────────────────────────────────────────

function enviarTelegram(mensaje) {
  try {
    const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: mensaje,
      parse_mode: 'HTML'
    };
    
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log('Error enviando Telegram: ' + e.toString());
  }
}

function enviarEmail(asunto, cuerpo) {
  try {
    GmailApp.sendEmail(
      CONFIG.EMAIL_PROPIETARIO,
      asunto,
      cuerpo,
      {
        htmlBody: cuerpo,
        name: CONFIG.NOMBRE_NEGOCIO + ' - Sistema de Inventario'
      }
    );
  } catch (e) {
    Logger.log('Error enviando Email: ' + e.toString());
  }
}

function enviarAlertaStockBajo(producto, stockActual, stockMinimo) {
  const emoji = stockActual === 0 ? '🚨' : '⚠️';
  const estado = stockActual === 0 ? 'SIN STOCK' : 'STOCK BAJO';
  
  // Telegram
  const mensajeTelegram = `${emoji} <b>ALERTA: ${estado}</b>

📦 <b>Producto:</b> ${producto}
📊 <b>Stock actual:</b> ${stockActual}
📉 <b>Stock mínimo:</b> ${stockMinimo}

🕐 ${new Date().toLocaleString('es-ES')}`;
  
  enviarTelegram(mensajeTelegram);
  
  // Email
  const asunto = `${emoji} Alerta: ${producto} - ${estado}`;
  const cuerpoEmail = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${stockActual === 0 ? '#dc2626' : '#f59e0b'};">
        ${emoji} Alerta de Inventario
      </h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>Producto:</strong> ${producto}</p>
        <p><strong>Stock actual:</strong> ${stockActual}</p>
        <p><strong>Stock mínimo:</strong> ${stockMinimo}</p>
        <p><strong>Estado:</strong> <span style="color: ${stockActual === 0 ? '#dc2626' : '#f59e0b'};">${estado}</span></p>
      </div>
      <p style="color: #6b7280; font-size: 12px;">
        Enviado desde el Sistema de Inventario - ${new Date().toLocaleString('es-ES')}
      </p>
    </div>
  `;
  
  enviarEmail(asunto, cuerpoEmail);
}

function enviarNotificacionEntrada(producto, cantidad, nuevoStock) {
  // Telegram
  const mensajeTelegram = `📥 <b>ENTRADA DE INVENTARIO</b>

📦 <b>Producto:</b> ${producto}
➕ <b>Cantidad ingresada:</b> ${cantidad}
📊 <b>Stock actual:</b> ${nuevoStock}

🕐 ${new Date().toLocaleString('es-ES')}`;
  
  enviarTelegram(mensajeTelegram);
}

function enviarNotificacionSalida(producto, cantidad, nuevoStock) {
  // Telegram
  const mensajeTelegram = `📤 <b>SALIDA DE INVENTARIO</b>

📦 <b>Producto:</b> ${producto}
➖ <b>Cantidad retirada:</b> ${cantidad}
📊 <b>Stock actual:</b> ${nuevoStock}

🕐 ${new Date().toLocaleString('es-ES')}`;
  
  enviarTelegram(mensajeTelegram);
}

// ─────────────────────────────────────────────────────────────
// EXPORTAR DATOS
// ─────────────────────────────────────────────────────────────

function exportarProductosCSV() {
  const productos = obtenerProductos();
  const headers = ['Código', 'Nombre', 'Categoría', 'Stock', 'Precio Compra', 'Precio Venta', 'Proveedor'];
  
  let csv = headers.join(',') + '\n';
  
  productos.forEach(p => {
    csv += [
      p.codigo,
      `"${p.nombre}"`,
      `"${p.categoria}"`,
      p.stock,
      p.precioCompra,
      p.precioVenta,
      `"${p.proveedor}"`
    ].join(',') + '\n';
  });
  
  return csv;
}

function exportarMovimientosCSV() {
  const movimientos = obtenerMovimientos(null);
  const headers = ['Fecha', 'Tipo', 'Producto', 'Cantidad', 'Precio Unitario', 'Total', 'Motivo'];
  
  let csv = headers.join(',') + '\n';
  
  movimientos.forEach(m => {
    csv += [
      new Date(m.fecha).toLocaleString('es-ES'),
      m.tipo,
      `"${m.producto}"`,
      m.cantidad,
      m.precioUnitario,
      m.total,
      `"${m.motivo}"`
    ].join(',') + '\n';
  });
  
  return csv;
}

// ─────────────────────────────────────────────────────────────
// BÚSQUEDA Y FILTROS
// ─────────────────────────────────────────────────────────────

function buscarProductos(termino) {
  const productos = obtenerProductos();
  const terminoLower = termino.toLowerCase();
  
  return productos.filter(p => 
    p.nombre.toLowerCase().includes(terminoLower) ||
    p.codigo.toLowerCase().includes(terminoLower) ||
    p.categoria.toLowerCase().includes(terminoLower) ||
    p.proveedor.toLowerCase().includes(terminoLower)
  );
}

function obtenerCategorias() {
  const productos = obtenerProductos();
  const categorias = [...new Set(productos.map(p => p.categoria || 'General'))];
  return categorias.sort();
}

function obtenerProveedores() {
  const productos = obtenerProductos();
  const proveedores = [...new Set(productos.map(p => p.proveedor).filter(p => p))];
  return proveedores.sort();
}

// ─────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────────────────────────

function inicializarSistema() {
  getSheetProductos();
  getSheetMovimientos();
  getSheetConfiguracion();
  
  return { success: true, mensaje: 'Sistema inicializado correctamente' };
}

// Ejecutar al abrir la hoja de cálculo
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📦 Inventario')
    .addItem('🌐 Abrir Aplicación Web', 'mostrarUrlApp')
    .addItem('📊 Ver Dashboard', 'mostrarDashboard')
    .addSeparator()
    .addItem('🔔 Verificar Stock Bajo', 'verificarStockBajo')
    .addItem('📧 Enviar Resumen Diario', 'enviarResumenDiario')
    .addSeparator()
    .addItem('⚙️ Inicializar Sistema', 'inicializarSistema')
    .addToUi();
}

function mostrarUrlApp() {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Para abrir la aplicación web, ve a: Implementar > Nueva implementación > Aplicación web');
}

function mostrarDashboard() {
  const stats = obtenerEstadisticas();
  const ui = SpreadsheetApp.getUi();
  
  const mensaje = `
📊 DASHBOARD DE INVENTARIO

📦 Total Productos: ${stats.totalProductos}
⚠️ Productos con Stock Bajo: ${stats.productosStockBajo}
🚨 Sin Stock: ${stats.productosSinStock}

💰 Valor del Inventario: $${stats.valorInventario.toFixed(2)}
💵 Valor de Venta: $${stats.valorVenta.toFixed(2)}
📈 Ganancia Potencial: $${stats.gananciaPotencial.toFixed(2)}
  `;
  
  ui.alert(mensaje);
}

function verificarStockBajo() {
  const productos = obtenerProductos();
  const bajos = productos.filter(p => p.stock <= p.stockMinimo);
  
  if (bajos.length === 0) {
    SpreadsheetApp.getUi().alert('✅ Todos los productos tienen stock suficiente');
    return;
  }
  
  let mensaje = '⚠️ PRODUCTOS CON STOCK BAJO:\n\n';
  bajos.forEach(p => {
    mensaje += `📦 ${p.nombre}\n   Stock: ${p.stock} | Mínimo: ${p.stockMinimo}\n\n`;
  });
  
  SpreadsheetApp.getUi().alert(mensaje);
}

function enviarResumenDiario() {
  const stats = obtenerEstadisticas();
  
  const mensajeTelegram = `📊 <b>RESUMEN DIARIO - INVENTARIO</b>

📦 <b>Total Productos:</b> ${stats.totalProductos}
⚠️ <b>Stock Bajo:</b> ${stats.productosStockBajo}
🚨 <b>Sin Stock:</b> ${stats.productosSinStock}

💰 <b>Valor Inventario:</b> $${stats.valorInventario.toFixed(2)}
💵 <b>Valor Venta:</b> $${stats.valorVenta.toFixed(2)}
📈 <b>Ganancia Potencial:</b> $${stats.gananciaPotencial.toFixed(2)}

📅 ${new Date().toLocaleDateString('es-ES')}`;
  
  enviarTelegram(mensajeTelegram);
  
  const asunto = '📊 Resumen Diario - Sistema de Inventario';
  const cuerpoEmail = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="color: #1e40af;">📊 Resumen Diario de Inventario</h2>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>📦 Total Productos:</strong> ${stats.totalProductos}</p>
        <p><strong>⚠️ Stock Bajo:</strong> ${stats.productosStockBajo}</p>
        <p><strong>🚨 Sin Stock:</strong> ${stats.productosSinStock}</p>
        <hr>
        <p><strong>💰 Valor Inventario:</strong> $${stats.valorInventario.toFixed(2)}</p>
        <p><strong>💵 Valor Venta:</strong> $${stats.valorVenta.toFixed(2)}</p>
        <p><strong>📈 Ganancia Potencial:</strong> $${stats.gananciaPotencial.toFixed(2)}</p>
      </div>
      <p style="color: #6b7280;">${new Date().toLocaleString('es-ES')}</p>
    </div>
  `;
  
  enviarEmail(asunto, cuerpoEmail);
  
  SpreadsheetApp.getUi().alert('✅ Resumen diario enviado correctamente');
}

// Configurar disparador automático para resumen diario
function configurarResumenAutomatico() {
  // Eliminar disparadores existentes
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'enviarResumenDiario') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Crear nuevo disparador diario a las 6:00 PM
  ScriptApp.newTrigger('enviarResumenDiario')
    .timeBased()
    .atHour(18)
    .everyDays(1)
    .create();
  
  return { success: true, mensaje: 'Resumen diario configurado a las 6:00 PM' };
}
