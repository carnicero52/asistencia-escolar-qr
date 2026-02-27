# 🎁 FideliQR - Sistema de Fidelización Digital

Un sistema de fidelización de clientes simplificado donde **tú registras a tus clientes manualmente** y ellos acumulan compras escaneando un código QR.

## ✨ Características

### Para Negocios
- 📊 **Panel de Administración** - Gestiona clientes, ve estadísticas y configura tu negocio
- 📱 **Código QR Único** - Un QR fijo para colocar en la caja
- 👤 **Registro Manual de Clientes** - Tú registras a tus clientes con nombre, email y teléfono
- 🔔 **Notificaciones** - Recibe alertas por Email y Telegram de nuevas recompensas
- 📈 **Estadísticas** - Visualiza el rendimiento de tu programa de fidelización

### Flujo Simplificado
1. **Registra tu negocio** en la página principal
2. **Agrega clientes manualmente** desde el panel de administración
3. **Imprime tu QR** y colócalo en la caja
4. **Clientes escanean** el QR e ingresan su email para acumular compras
5. **Recompensas automáticas** cada 10 compras

## 🚀 Cómo Funciona

### 1. Registro Manual
El dueño del negocio registra a los clientes desde el panel de administración con:
- Nombre completo
- Email (requerido para acumular compras)
- Teléfono (opcional)
- Compras iniciales (para migrar clientes existentes)

### 2. Acumulación de Compras
Los clientes escanean el código QR ubicado en la caja e ingresan su email. El sistema:
- ✅ Suma 1 compra automáticamente
- ✅ Muestra el progreso hacia la próxima recompensa
- ✅ Notifica al dueño si se alcanza una recompensa

### 3. Recompensas Automáticas
- Cada **10 compras** = 1 recompensa
- El sistema notifica automáticamente por Telegram
- El dueño canjea las recompensas desde el panel

## 🛠️ Tecnologías

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI**: shadcn/ui (componentes de alta calidad)
- **Base de Datos**: SQLite con Prisma ORM
- **QR**: Librería qrcode para generación
- **Email**: Nodemailer para notificaciones
- **Telegram**: API de Bots de Telegram

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── auth/              # Autenticación
│   │   ├── negocio/           # Gestión de negocios
│   │   ├── clientes/          # Gestión de clientes
│   │   ├── compras/           # Registro de compras
│   │   └── admin/             # Panel de administración
│   │       ├── canjear/       # Canjear recompensas
│   │       ├── registrar-cliente/  # Registro manual
│   │       └── regenerar-qr/  # Regenerar QR
│   ├── scan/                  # Página para acumular compras
│   ├── admin/                 # Panel de administración
│   └── page.tsx               # Landing page
├── lib/
│   ├── auth.ts                # Utilidades de autenticación
│   ├── notifications.ts       # Servicio de emails
│   ├── telegram.ts            # Servicio de Telegram
│   └── qrcode.ts              # Generación de QR
└── components/ui/             # Componentes shadcn/ui
```

## 🔧 Configuración

### Variables de Entorno (Opcionales)

```env
# URL base de la aplicación (importante para QRs)
NEXT_PUBLIC_BASE_URL=

# Para envío de emails reales
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password

# Telegram (ya configurado)
TELEGRAM_BOT_TOKEN=tu-token
TELEGRAM_CHAT_ID=tu-chat-id
```

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
bun install

# Configurar base de datos
bun run db:push

# Iniciar servidor de desarrollo
bun run dev
```

## 📱 Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Página principal y registro de negocio |
| `/scan?negocio=ID` | Acumular compra (ingresar email) |
| `/admin` | Panel de administración |

## 💡 Casos de Uso Ideales

- ☕ Cafeterías
- 🍕 Restaurantes
- 🛍️ Tiendas de ropa
- 💇 Salones de belleza
- 🏋️ Gimnasios
- 📚 Librerías
- Cualquier negocio que quiera premiar a sus clientes frecuentes

## 🔒 Seguridad

- Autenticación con cookies httpOnly
- Contraseñas hasheadas con SHA-256
- Validación de datos en frontend y backend
- Protección contra CSRF
- Sesiones con expiración automática (7 días)

## 📊 Modelo de Recompensas

- Cada compra suma 1 punto
- Cada 10 puntos = 1 recompensa
- El dueño puede canjear recompensas desde el panel
- Historial completo de compras y recompensas

---

Desarrollado con ❤️ usando Next.js 16 y shadcn/ui
