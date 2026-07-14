// ============================================================
// js/data.js — Utilidades y helpers globales
// ============================================================

var fmt = new Intl.NumberFormat('es-PA', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

function formatMoney(valor) {
  if (valor === undefined || valor === null) return '$0.00';
  return fmt.format(parseFloat(valor));
}

function formatNumber(valor) {
  return new Intl.NumberFormat('es-PA').format(parseFloat(valor) || 0);
}

function formatDate(fecha) {
  if (!fecha) return '';
  var d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function generarNumeroCotizacion(fecha) {
  var d = fecha ? new Date(fecha) : new Date();
  var dd = String(d.getDate()).padStart(2, '0');
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var yy = String(d.getFullYear()).slice(-2);
  return 'COT-' + dd + mm + yy + '-' + Math.floor(Math.random() * 900 + 100);
}

function slugify(texto) {
  return texto.toString().toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

function debounce(func, wait) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      func.apply(context, args);
    }, wait);
  };
}

// Categorías de servicios para labels
var CAT_LABELS = {
  diseno_web: 'Diseño Web',
  desarrollo: 'Desarrollo',
  branding: 'Branding & Identidad',
  marketing: 'Marketing Digital',
  social_media: 'Social Media',
  seo: 'SEO & Posicionamiento',
  fotografia: 'Fotografía & Video',
  consultoria: 'Consultoría',
  mantenimiento: 'Mantenimiento Web',
  hosting: 'Hosting & Dominio',
  otros: 'Otros'
};

// Categorías de gastos para labels
var GASTO_LABELS = {
  software: 'Software & Herramientas',
  hosting: 'Hosting & Dominios',
  marketing: 'Marketing & Ads',
  equipo: 'Equipo & Hardware',
  oficina: 'Oficina & Suministros',
  transporte: 'Transporte & Logística',
  capacitacion: 'Capacitación',
  servicios: 'Servicios Profesionales',
  impuestos: 'Impuestos',
  otros: 'Otros'
};
