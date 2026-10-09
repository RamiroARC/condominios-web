# CondoManager Web

Panel de administración web de **CondoManager**, construido con **Next.js 16
(App Router) + React 19 + TypeScript**. Consume la API NestJS multi-tenant.

Este es el frontend de la **Fase 3**: autenticación, protección de rutas y las
pantallas base de la estructura (organizaciones, condominios, edificios,
departamentos y personas).

---

## Requisitos

- Node.js 20 LTS o superior
- npm 10+
- La API de CondoManager corriendo y accesible (por defecto en
  `http://localhost:3000/api`)

## Puesta en marcha

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar el entorno
#    Copia .env.example a .env.local y ajusta la URL de la API
cp .env.example .env.local   # Windows: Copy-Item .env.example .env.local

# 3. Desarrollo
npm run dev

# 4. Build de producción
npm run build
npm run start
```

### Scripts

| Script | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo (recarga en caliente). |
| `npm run build` | Compila para producción. |
| `npm run start` | Sirve el build de producción. |
| `npm run lint` | Linter de Next. |

> En Windows, si PowerShell bloquea `npm.ps1` por política de ejecución, usa
> `npm.cmd run <script>` o ajusta la _Execution Policy_.

---

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | URL base de la API (incluye el prefijo `/api`). Ej: `http://localhost:3000/api`. |

`.env.local` no se versiona. Ver `.env.example` para la plantilla.

---

## Arquitectura

### Autenticación

- Login contra `POST /auth/login`, que devuelve `accessToken` y `refreshToken`.
- Los tokens se guardan en `localStorage` (`src/lib/token-store.ts`).
- El access token se decodifica en el cliente para obtener el usuario de sesión
  (email, `organizationId`, permisos, condominios accesibles) sin llamada extra.
- Cuando el access token expira o la API responde `401`, el cliente HTTP refresca
  automáticamente con `POST /auth/refresh` y reintenta la petición una vez. Si el
  refresh falla, se limpia la sesión.
- `src/components/auth-context.tsx` expone `useAuth()` con `user`, `login`,
  `logout` y `hasPermission`.

### Protección de rutas

- `src/components/require-auth.tsx` (`<RequireAuth>`) redirige a `/login` si no
  hay sesión. El layout de `/dashboard` envuelve todo el panel con este guard.
- El menú lateral muestra solo las secciones para las que el usuario tiene
  permiso (RBAC del backend reflejado en la UI).

### Cliente HTTP

`src/lib/api-client.ts` centraliza las llamadas: adjunta el `Authorization:
Bearer`, arma la query string, maneja el refresh y normaliza errores en
`ApiError`. Las respuestas de listado siguen la forma `PaginatedResult` del
backend.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── layout.tsx              # Layout raíz (envuelve con AuthProvider)
│   ├── page.tsx                # Redirige a /dashboard o /login
│   ├── globals.css             # Estilos base y design tokens
│   ├── login/page.tsx          # Pantalla de inicio de sesión
│   └── dashboard/
│       ├── layout.tsx          # Guard + navegación del panel
│       ├── page.tsx            # Home: KPIs, gráficos, reservas y comunicados
│       ├── organizations/      # Listado de organizaciones
│       ├── condominiums/       # Listado de condominios
│       ├── buildings/          # Listado de edificios (filtra por condominio)
│       ├── apartments/         # Listado de departamentos (filtra por edificio)
│       ├── persons/            # Listado de personas
│       ├── maintenance/        # Tickets con filtros y cambio de estado
│       ├── finance/            # Periodos, conceptos, cargos y pagos
│       ├── reservations/       # Áreas comunes y reservas (cancelar)
│       └── communications/     # Anuncios (publicar / archivar)
├── components/
│   ├── auth-context.tsx        # Contexto de sesión (useAuth)
│   ├── require-auth.tsx        # Guard de rutas
│   ├── data-table.tsx          # Tabla paginada con búsqueda
│   ├── ui.tsx                  # KpiCard, StatusBadge, SectionCard
│   ├── charts.tsx              # Gráficos (Recharts): dona y barras
│   └── nav-items.ts            # Ítems de navegación + permiso requerido
└── lib/
    ├── config.ts               # API_URL
    ├── types.ts                # Tipos compartidos (entidades, paginación)
    ├── token-store.ts          # Persistencia de tokens
    ├── jwt.ts                  # Decodificación del access token
    ├── format.ts               # Formato de moneda, fechas y meses
    ├── dashboard-api.ts        # Cliente de /dashboard/summary
    └── api-client.ts           # Cliente HTTP con refresh automático
```

---

## Pantallas

- **Login** — email + contraseña.
- **Dashboard (home)** — selector de condominio, tarjetas KPI (cobranza,
  recaudado, pendiente, morosidad, departamentos), gráfico de dona de cargos por
  estado, barras de mantenimiento por estado, línea de ingresos vs gastos (6
  meses), dona de distribución de gastos, tabla de consumo de agua por
  departamento, panel de estado de activos (ascensores), y tablas de próximas
  reservas y comunicados recientes. Consume `GET /dashboard/summary`.
- **Estructura** — Organizaciones, Condominios, Personas (listado con búsqueda y
  paginación); Edificios y Departamentos (filtrados por su entidad padre).
- **Mantenimiento** — listado de tickets con filtro por estado y cambio de estado
  en línea (respeta la máquina de estados del backend).
- **Finanzas** — pestañas de Periodos (generar cargos / cerrar), Conceptos y
  Cargos (registrar pago del saldo).
- **Reservas** — áreas comunes y reservas (crear/cancelar).
- **Comunicaciones** — anuncios con publicar / archivar / eliminar.
- **Gastos** — registro de gastos por categoría (CRUD).
- **Consumo de agua** — lecturas de medidor por departamento y periodo (CRUD).
- **Activos** — ascensores y equipos con estado y próximo mantenimiento (CRUD).
- **Usuarios** — alta de usuarios (con contraseña), activar/suspender y asignar
  roles.
- **Roles** — creación/edición de roles con selección de permisos por módulo.

Todas las entidades soportan **crear, editar y eliminar con confirmación**
(diálogo de advertencia antes de borrar). Las acciones de escritura se muestran
solo si el usuario tiene el permiso correspondiente (`*:write`). Los gráficos
usan **Recharts**. El condominio activo se elige con un selector compartido
(`CondominiumPicker`) persistido entre pantallas.

---

## Estado

Panel web con dashboard de indicadores y las pantallas de estructura y de los
cuatro dominios de negocio (mantenimiento, finanzas, reservas, comunicaciones).
Próximo: formularios de alta/edición y selección de entidades padre por nombre
(hoy algunas pantallas piden el ID del condominio/edificio).
