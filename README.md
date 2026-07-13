# 📊 Dashboard Financiero - Proyintel

Dashboard interactivo para el control total de gastos e ingresos de Proyintel.

## ✨ Funcionalidades

- **📊 Dashboard** con KPIs, gráficas y resumen financiero
- **➕ Ingresar Gastos** (Materiales, Operativo, Mano de Obra)
- **💰 Ingresar Pagos** de clientes con seguimiento de estado
- **📋 Registros completos** filtrables por categoría
- **📄 Exportar a PDF** (imprimir desde navegador)
- **💾 Datos persistentes** en el navegador (localStorage)

## 🚀 Cómo usar

1. Descarga o clona este repositorio
2. Abre `index.html` en cualquier navegador moderno
3. Navega entre secciones con las pestañas superiores
4. Ingresa gastos y pagos desde los formularios

## 📁 Estructura

```
proyintel-informe/
├── index.html          # Página principal
├── css/
│   └── styles.css      # Estilos del dashboard
├── js/
│   ├── data.js         # Datos de ejemplo y utilidades
│   ├── storage.js      # Persistencia local con validación
│   ├── charts.js       # Configuración de gráficas
│   └── app.js          # Lógica principal
└── README.md
```

## 📝 Agregar datos reales

Los datos se almacenan automáticamente en el navegador. Para empezar con datos limpios:

1. Abre la consola del navegador (F12)
2. Ejecuta: `resetearDatos()`
3. Confirma la eliminación

O simplemente edita `js/data.js` con tus datos iniciales.

## 🌐 Publicar en GitHub Pages

1. Ve a **Settings** → **Pages** en tu repositorio
2. Source: `Deploy from a branch`
3. Branch: `main` → `/ (root)`
4. Guarda y espera 1-5 minutos
5. Tu URL: `https://TU_USUARIO.github.io/proyintel-informe/`

## 🎨 Colores corporativos

| Color | Código | Uso |
|-------|--------|-----|
| Verde | `#6bbd45` | Materiales, éxito |
| Azul | `#243b86` | Operativo |
| Amarillo | `#f5b923` | Mano de Obra |
| Rojo | `#e74c3c` | Alertas, pérdidas |

## ⚠️ Nota de seguridad

Este es un dashboard frontend estático. Los datos se guardan en `localStorage` del navegador.
Para un entorno de producción con datos sensibles, se recomienda:
- Backend con autenticación
- Base de datos en servidor
- Encriptación de datos en reposo

## 🔮 Próximas funcionalidades

- [ ] Subir imagen de pago y reconocimiento automático (OCR)
- [ ] Exportar datos a Excel/CSV
- [ ] Múltiples usuarios con roles
- [ ] Sincronización con backend