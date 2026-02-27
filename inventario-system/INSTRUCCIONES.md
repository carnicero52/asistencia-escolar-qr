# 📦 Sistema de Inventario - Guía de Instalación

## ✅ Todo está configurado con tus datos:
- **Email:** marcocarnicero1@gmail.com
- **Telegram Bot Token:** 8518192400:AAFqTyWwzwHVN6kiFOn_9Kughixi_fCc0Q0
- **Chat ID:** 5743796914
- **Hoja de Cálculo:** Ya creada

---

## 🚀 PASOS DE INSTALACIÓN

### PASO 1: Abrir tu Hoja de Cálculo
1. Ve a: https://docs.google.com/spreadsheets/d/1zQq_qxYo9OOveBw9LkZHfnAAu-ysTy6qv6GTbotkSkk/edit
2. Asegúrate de estar logueado con tu cuenta de Google

### PASO 2: Abrir Apps Script
1. En el menú superior, ve a **Extensiones** → **Apps Script**
2. Se abrirá una nueva pestaña con el editor de código

### PASO 3: Crear los archivos

#### 3.1 - Crear el archivo de código
1. Verás un archivo llamado `Código.gs` (o `code.gs`)
2. **Elimina todo el contenido** que tenga
3. **Copia todo el código** del archivo `codigo.gs` que te proporcioné
4. **Pégalo** en el editor

#### 3.2 - Crear el archivo HTML
1. En el panel izquierdo, haz clic en el **signo +** junto a "Archivos"
2. Selecciona **HTML**
3. Nómbralo: `index` (sin la extensión .html)
4. **Copia todo el código** del archivo `index.html` que te proporcioné
5. **Pégalo** en el editor

### PASO 4: Guardar el proyecto
1. Haz clic en el icono de **disquete** 💾 (o Ctrl+S)
2. Ponle un nombre al proyecto: "Sistema de Inventario"

### PASO 5: Dar permisos
1. En el editor, busca la función `doGet` en el código
2. Selecciona `doGet` en el menú desplegable de funciones (arriba)
3. Haz clic en **Ejecutar** ▶️
4. Google te pedirá permisos:
   - Haz clic en **Continuar**
   - Selecciona tu cuenta de Google
   - Verás un mensaje de "Google hasn't verified this app" - es normal
   - Haz clic en **Advanced** (Avanzado)
   - Haz clic en **Go to Sistema de Inventario (unsafe)**
   - Haz clic en **Allow** (Permitir)

### PASO 6: Publicar la aplicación web
1. En el menú superior, ve a **Implementar** → **Nueva implementación**
2. Haz clic en el icono de **engranaje** ⚙️
3. Selecciona **Aplicación web**
4. Configura:
   - **Descripción:** Sistema de Inventario
   - **Ejecutar como:** Yo (tu email)
   - **Quién tiene acceso:** Cualquier persona
5. Haz clic en **Implementar**
6. **Copia la URL** que aparece (será algo como: `https://script.google.com/macros/s/.../exec`)

### PASO 7: ¡Listo!
1. Abre la URL que copiaste
2. Verás el sistema de inventario funcionando

---

## 📱 FUNCIONES DEL SISTEMA

### Dashboard
- 📊 Estadísticas en tiempo real
- 💰 Valor del inventario
- 📈 Ganancia potencial
- 🚨 Alertas de stock bajo

### Productos
- ➕ Agregar productos
- ✏️ Editar productos
- 🗑️ Eliminar productos
- 🔍 Búsqueda instantánea
- 💵 Cálculo automático de precios de venta

### Entradas
- 📥 Registrar entradas de inventario
- 💰 Control de precios de compra
- 📝 Motivos de entrada

### Salidas
- 📤 Registrar salidas de inventario
- ✅ Verificación de stock disponible
- 📝 Motivos de salida

### Movimientos
- 📋 Historial completo
- 🔍 Filtros por tipo
- 📥 Exportar a CSV

### Alertas
- 🚨 Productos con stock bajo
- 📱 Notificación por Telegram
- 📧 Notificación por Email

---

## 🔔 NOTIFICACIONES

El sistema envía notificaciones automáticamente cuando:
- ✅ Stock bajo detectado
- ✅ Producto sin stock
- ✅ Entrada de inventario
- ✅ Salida de inventario

### Probar Telegram
Para verificar que Telegram funciona:
1. En Apps Script, ejecuta la función `enviarResumenDiario`
2. Deberías recibir un mensaje en tu Telegram

---

## ⚙️ PERSONALIZACIÓN

### Cambiar nombre del negocio
En el archivo `codigo.gs`, busca:
```javascript
NOMBRE_NEGOCIO: 'Mi Comercio',
```
Cámbialo por el nombre de tu negocio.

### Cambiar stock mínimo global
En el archivo `codigo.gs`, busca:
```javascript
STOCK_MINIMO: 5,
```
Cámbialo por el valor que desees.

### Cambiar porcentaje de ganancia
En el archivo `codigo.gs`, busca:
```javascript
PORCENTAJE_GANANCIA: 30,
```
Cámbialo por el porcentaje que desees.

---

## ❓ PROBLEMAS COMUNES

| Problema | Solución |
|----------|----------|
| No se ve la interfaz | Verifica que publicaste como "Aplicación web" |
| No llegan notificaciones | Verifica los permisos de Apps Script |
| Error al guardar | Verifica que los permisos estén otorgados |
| No funciona Telegram | Verifica que el bot esté activo |

---

## 📞 SOPORTE

Si tienes problemas:
1. Verifica que copiaste todo el código
2. Verifica que diste todos los permisos
3. Verifica que publicaste correctamente
4. Revisa la consola del navegador (F12) para ver errores

---

## 🔄 ACTUALIZACIONES

Para actualizar el código:
1. Abre el editor de Apps Script
2. Modifica los archivos necesarios
3. Guarda (Ctrl+S)
4. Ve a **Implementar** → **Gestionar implementaciones**
5. Haz clic en el lápiz ✏️ para editar
6. Cambia la versión a "Nueva versión"
7. Haz clic en **Implementar**

---

## 💡 CONSEJOS

1. **Haz una copia de seguridad** de tu hoja de cálculo regularmente
2. **Prueba el sistema** con pocos productos primero
3. **Configura las categorías** según tu negocio
4. **Mantén actualizados** los stocks mínimos por producto

---

¡Disfruta tu sistema de inventario! 🎉
