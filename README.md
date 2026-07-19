# 🧩 GN Studio OS — Dashboard Interno

GN Studio OS es la plataforma interna de gestión para GN Studio (Burunga, Panamá Oeste), pensada para centralizar **clientes, proyectos, finanzas y actividad diaria** en un solo dashboard ligero y accesible desde obra o oficina.

Actualmente corre como sitio estático en **GitHub Pages** con frontend en HTML/CSS/JS y conexión a datos reales vía **Supabase**.

---

## ✨ Módulos principales

- **AuthOS**  
  Login por email/contraseña, panel inicial y estado de sesión en frontend.
  
- **FinanceOS**  
  KPIs de ingresos, gastos, balance, proyectos activos y clientes activos, más gráficas de ingresos vs gastos y distribución por tipo de servicio.

- **ProjectOS**  
  Registro de proyectos (con cliente, fechas, presupuesto, avance), pestañas de detalle (financiero, tareas, documentos) y línea de tiempo de actividad.

- **AlertOS**  
  Alertas de cotizaciones por vencer, pagos pendientes y proyectos completados listos para facturar.

- **PipelineOS**  
  Pipeline de ventas en el dashboard de inicio: etapas de **Cotizado → Aprobado → En progreso → Completado**, con conteo y montos por etapa.

- **ReportOS**  
  Gráficas y reportes rápidos: estado de cuenta, ITBMS, reportes de ingresos/gastos y actividad por proyecto.

- **ActivityOS**  
  Registro cronológico de actividad (gastos, pagos, tareas, notas) ligado a cada proyecto.

---

## 🧱 Stack actual

- **Frontend**: HTML, CSS, JavaScript vanilla (sin frameworks pesados).
- **Hosting**: GitHub Pages (sitio estático).
- **Datos**: Supabase (PostgreSQL + APIs), tablas para:
  - `clientes`
  - `proyectos`
  - `proyecto_gastos`
  - `proyecto_pagos`
- **Gráficas**: Librería ligera (Chart.js / equivalente) integrada en el dashboard.

El foco actual es **retrocompatibilidad**: la UI original del dashboard se mantiene mientras se sustituyen datos estáticos por datos reales desde Supabase.

---

## 🚀 Cómo usar la plataforma

1. Clona este repositorio.
2. Abre `index.html` en un navegador moderno (Chrome, Edge, Firefox).
3. Configura las claves de Supabase en tu entorno local (archivo JS de configuración, nunca commit directo de claves reales).
4. Inicia sesión desde la pantalla de AuthOS.
5. Navega por las secciones:
   - Negocio (CRM de clientes y catálogo de servicios).
   - Proyectos (ProjectOS).
   - Finanzas (FinanceOS).
   - Reportes y actividad.

En producción, la versión está disponible vía GitHub Pages en la URL configurada para la plataforma.

---

## 📁 Estructura del proyecto

```text
gnstudio-os/
├── index.html          # Dashboard principal (AuthOS, FinanceOS, ProjectOS, etc.)
├── css/
│   └── styles.css      # Estilos globales y componentes del dashboard
├── js/
│   ├── auth.js         # Lógica de autenticación frontend
│   ├── clientes.js     # CRM de clientes (ClientOS básico)
│   ├── proyectos.js    # Gestión de proyectos, pipeline y detalle
│   ├── finanzas.js     # KPIs, estado de cuenta y gráficas financieras
│   ├── supabase.js     # Helpers de conexión y storage (getAll, getFiltered, insertRow...)
│   └── app.js          # Inicialización general del dashboard
└── README.md
```

Los nombres exactos pueden variar, pero la organización sigue este patrón modular.

---

## 🌐 Deploy en GitHub Pages

1. En GitHub, entra a **Settings → Pages** del repositorio.
2. Source: `Deploy from a branch`.
3. Branch: `main` → `/ (root)`.
4. Guarda y espera 1–5 minutos.
5. La plataforma quedará accesible en:  
   `https://TU_USUARIO.github.io/Plataforma-gnstudio/` (o la URL que hayas configurado).

Para cambios en producción:

- Trabajar en rama de `staging`.
- Probar conexión a Supabase con datos de prueba.
- Hacer merge a `main` solo cuando el dashboard cargue sin errores en consola.

---

## 🔐 Notas de seguridad

- No exponer **API keys** de Supabase ni datos sensibles en el código público.
- Evitar guardar credenciales de usuarios en `localStorage`; usar sesiones controladas o tokens.
- Los datos de clientes y proyectos deben vivir en Supabase o repositorios privados, nunca como JSON plano en el frontend.
- Para uso en producción con datos reales:
  - Activar reglas de acceso en Supabase.
  - Habilitar backups automáticos de la base de datos.
  - Revisar inputs de formularios para evitar inyecciones/XSS.

---

## 🛣️ Roadmap de evolución

**Fase 1 — Consolidación (actual)**  
- Conectar todos los módulos existentes (Negocio, Proyectos, Finanzas, Reportes) a Supabase.  
- Eliminar datos hardcodeados y mantener la UI actual.

**Fase 2 — JAMstack**  
- Migrar a Next.js o Astro con salida estática.  
- Usar funciones serverless (Netlify/Vercel) como proxy seguro para APIs.  
- Integrar Supabase Auth para autenticación real.

**Fase 3 — Hosting propio**  
- VPS con Node.js/Express + PostgreSQL y frontend React/Vue.  
- Dominio dedicado (ej. `os.gnstudio.space`) con SSL, backups y CDN.  

---

## 📌 Estado actual

- Dashboard operativo en GitHub Pages.
- Módulos de proyectos y finanzas conectados a Supabase.
- Pipeline de ventas y tablas de proyectos actualizadas para trabajar con datos reales.
