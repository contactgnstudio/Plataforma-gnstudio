# 🧩 GN Studio OS — Dashboard Interno

GN Studio OS es la plataforma interna de gestión para **GN Studio** (Burunga, Panamá Oeste), diseñada para centralizar **clientes, proyectos, finanzas, cotizaciones y actividad diaria** en un solo dashboard ligero y accesible desde cualquier dispositivo.

Corre como sitio estático en **GitHub Pages** con frontend en HTML/CSS/JS y datos reales conectados a **Supabase**.

---

## ✨ Módulos activos

- **AuthOS** — Login por email/contraseña con Supabase Auth, manejo de sesión en frontend y flujo de restablecimiento de contraseña (`reset-password.html`).

- **FinanceOS** — KPIs de ingresos, gastos y balance; gráficas de ingresos vs gastos y distribución por tipo de servicio. Módulo dedicado en `finanzas.js` + `charts.js`.

- **ProjectOS** — Gestión completa de proyectos: registro, detalle financiero, tareas, documentos, línea de tiempo y pipeline de ventas (Cotizado → Aprobado → En progreso → Completado). Implementado en `proyectos.js` (~60 KB).

- **CotizacionesOS** — Creación, seguimiento y control de cotizaciones ligadas a clientes y proyectos. Implementado en `cotizaciones.js`.

- **ClientOS** — CRM de clientes: alta, edición, historial de proyectos y estado. Implementado en `clientes.js`.

- **CatálogoOS** — Catálogo de servicios de GN Studio con precios y descripción por categoría. Implementado en `catalogo.js`.

- **GruposOS** — Agrupación y organización de proyectos o clientes por grupos/categorías. Implementado en `grupos.js`.

- **CalendarioOS** — Calendario de eventos, fechas de entrega y recordatorios vinculados a proyectos. Implementado en `calendario.js`.

- **TimeTrackingOS** — Registro de tiempo trabajado por proyecto o tarea, con resumen de horas. Implementado en `timetracking.js` (~21 KB).

- **AlertOS** — Alertas de cotizaciones por vencer, pagos pendientes y proyectos completados listos para facturar.

---

## 🧱 Stack actual

- **Frontend**: HTML, CSS, JavaScript vanilla (sin frameworks pesados).
- **Hosting**: GitHub Pages (sitio estático).
- **Base de datos**: Supabase (PostgreSQL + REST API). Tablas principales:
  - `clientes`
  - `proyectos`
  - `proyecto_gastos`
  - `proyecto_pagos`
  - `cotizaciones`
  - `grupos`
  - `timetracking`
- **Gráficas**: Chart.js integrado en `charts.js`.
- **Storage**: Manejo de archivos y adjuntos vía `storage.js` (Supabase Storage).
- **Utilidades**: Helpers globales en `utils.js` y datos de configuración en `data.js`.

---

## 🚀 Cómo usar la plataforma

1. Clona este repositorio.
2. Abre `index.html` en un navegador moderno (Chrome, Edge, Firefox).
3. Configura las claves de Supabase en el archivo de configuración JS (nunca hagas commit de claves reales).
4. Inicia sesión desde la pantalla de **AuthOS**.
5. Navega por las secciones del dashboard:
   - Dashboard principal (KPIs + Pipeline)
   - Clientes (ClientOS)
   - Proyectos (ProjectOS)
   - Cotizaciones (CotizacionesOS)
   - Catálogo de servicios (CatálogoOS)
   - Grupos (GruposOS)
   - Calendario (CalendarioOS)
   - Time Tracking (TimeTrackingOS)
   - Finanzas (FinanceOS)

---

## 📁 Estructura del proyecto

```text
Plataforma-gnstudio/
├── index.html              # Dashboard principal (punto de entrada)
├── reset-password.html     # Flujo de restablecimiento de contraseña
├── css/
│   └── styles.css          # Estilos globales y componentes del dashboard
├── js/
│   ├── app.js              # Inicialización general y navegación (~33 KB)
│   ├── auth.js             # Autenticación con Supabase Auth
│   ├── clientes.js         # CRM de clientes
│   ├── proyectos.js        # Gestión de proyectos y pipeline (~60 KB)
│   ├── cotizaciones.js     # Módulo de cotizaciones
│   ├── catalogo.js         # Catálogo de servicios
│   ├── grupos.js           # Agrupación de proyectos/clientes
│   ├── calendario.js       # Calendario y eventos
│   ├── timetracking.js     # Registro de tiempo trabajado
│   ├── finanzas.js         # KPIs y estado financiero
│   ├── charts.js           # Gráficas con Chart.js
│   ├── storage.js          # Manejo de archivos (Supabase Storage)
│   ├── utils.js            # Utilidades globales
│   └── data.js             # Configuración y datos base
├── supabase/               # Helpers y configuración de Supabase
└── README.md
```

---

## 🌐 Deploy en GitHub Pages

1. En GitHub, entra a **Settings → Pages** del repositorio.
2. Source: `Deploy from a branch`.
3. Branch: `main` → `/ (root)`.
4. Guarda y espera 1–5 minutos.
5. La plataforma queda accesible en:
   `https://contactgnstudio.github.io/Plataforma-gnstudio/`

Para cambios en producción:
- Trabajar en rama `staging`.
- Probar conexión a Supabase con datos de prueba.
- Hacer merge a `main` solo cuando el dashboard cargue sin errores en consola.

---

## 🔐 Notas de seguridad

- No exponer **API keys** de Supabase en el código público.
- No guardar credenciales de usuarios en `localStorage`; usar tokens de sesión controlados por Supabase Auth.
- Los datos de clientes y proyectos viven en Supabase, nunca como JSON plano en el frontend.
- Para producción con datos reales:
  - Activar **Row Level Security (RLS)** en todas las tablas de Supabase.
  - Habilitar backups automáticos de la base de datos.
  - Revisar inputs de formularios para prevenir XSS.

---

## 🛣️ Roadmap

**Fase 1 — Consolidación ✅ (actual)**
- Todos los módulos principales conectados a Supabase.
- Dashboard operativo en GitHub Pages.
- Time Tracking, Cotizaciones, Grupos y Calendario implementados.

**Fase 2 — JAMstack**
- Migrar a Next.js o Astro con salida estática.
- Funciones serverless (Netlify/Vercel) como proxy seguro para APIs.
- Supabase Auth con flujo completo de roles y permisos.

**Fase 3 — Hosting propio**
- VPS con Node.js/Express + PostgreSQL y frontend React/Vue.
- Dominio dedicado (`os.gnstudio.space`) con SSL, backups y CDN.

---

## 📌 Estado actual

- ✅ Dashboard operativo en GitHub Pages.
- ✅ Módulos de proyectos, finanzas y cotizaciones conectados a Supabase.
- ✅ Time Tracking, Grupos, Calendario y Catálogo implementados.
- ✅ Flujo de reset de contraseña activo (`reset-password.html`).
- ✅ Pipeline de ventas en dashboard principal con datos reales.
- 🔄 Activación de RLS en Supabase pendiente para producción segura.
