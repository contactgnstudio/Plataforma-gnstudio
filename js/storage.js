// ============================================================
// js/storage.js - Persistencia local con validacion
// ============================================================
// NOTA: Datos se almacenan en localStorage del navegador.
// Aceptable para dashboard interno sin datos sensibles.

const STORAGE_KEYS = {
  GASTOS: 'proyintel_gastos',
  PAGOS: 'proyintel_pagos',
  VERSION: 'proyintel_data_version'
};

const DATA_VERSION = '1.0';

// ============================================================
// Validacion de entradas (lista permitida)
// ============================================================
const VALIDACION = {
  categorias: ['materiales', 'operativo', 'mano-obra'],
  metodosPago: ['transferencia', 'efectivo', 'cheque', 'yappy', 'otro'],
  estadosPago: ['completado', 'pendiente', 'parcial'],
  maxLongitud: {
    factura: 20,
    descripcion: 200,
    cliente: 100,
    proyecto: 200,
    notas: 300
  },
  maxMonto: 999999.99,
  minMonto: 0.01
};

function sanitizarTexto(texto, maxLen) {
  if (typeof texto !== 'string') return '';
  var limpio = texto.trim();
  if (limpio.length > maxLen) limpio = limpio.substring(0, maxLen);
  // Escapar HTML para prevenir XSS
  limpio = limpio
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
  return limpio;
}

function validarGasto(gasto) {
  var errores = [];

  if (!gasto.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(gasto.fecha)) {
    errores.push('Fecha invalida');
  }

  if (!gasto.factura || gasto.factura.trim().length === 0) {
    errores.push('Numero de factura requerido');
  }

  if (!gasto.descripcion || gasto.descripcion.trim().length === 0) {
    errores.push('Descripcion requerida');
  }

  if (VALIDACION.categorias.indexOf(gasto.categoria) === -1) {
    errores.push('Categoria no valida');
  }

  var total = parseFloat(gasto.total);
  if (isNaN(total) || total < VALIDACION.minMonto || total > VALIDACION.maxMonto) {
    errores.push('Monto debe estar entre $0.01 y $999,999.99');
  }

  return errores;
}

function validarPago(pago) {
  var errores = [];

  if (!pago.fecha || !/^\d{4}-\d{2}-\d{2}$/.test(pago.fecha)) {
    errores.push('Fecha invalida');
  }

  if (!pago.cliente || pago.cliente.trim().length === 0) {
    errores.push('Nombre del cliente requerido');
  }

  if (!pago.proyecto || pago.proyecto.trim().length === 0) {
    errores.push('Proyecto/Servicio requerido');
  }

  if (VALIDACION.metodosPago.indexOf(pago.metodo) === -1) {
    errores.push('Metodo de pago no valido');
  }

  var monto = parseFloat(pago.monto);
  if (isNaN(monto) || monto < VALIDACION.minMonto || monto > VALIDACION.maxMonto) {
    errores.push('Monto debe estar entre $0.01 y $999,999.99');
  }

  if (VALIDACION.estadosPago.indexOf(pago.estado) === -1) {
    errores.push('Estado de pago no valido');
  }

  return errores;
}

// ============================================================
// Operaciones de almacenamiento
// ============================================================
function inicializarStorage() {
  var version = localStorage.getItem(STORAGE_KEYS.VERSION);
  if (version !== DATA_VERSION) {
    localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify(gastosEjemplo));
    localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(pagosEjemplo));
    localStorage.setItem(STORAGE_KEYS.VERSION, DATA_VERSION);
    console.log('[Storage] Datos inicializados con version', DATA_VERSION);
  }
}

function obtenerGastos() {
  try {
    var data = localStorage.getItem(STORAGE_KEYS.GASTOS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('[Storage] Error leyendo gastos:', e);
    return [];
  }
}

function obtenerPagos() {
  try {
    var data = localStorage.getItem(STORAGE_KEYS.PAGOS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('[Storage] Error leyendo pagos:', e);
    return [];
  }
}

function guardarGastoEnStorage(gasto) {
  var errores = validarGasto(gasto);
  if (errores.length > 0) {
    return { exito: false, errores: errores };
  }

  var gastos = obtenerGastos();

  var nuevoGasto = {
    no: gastos.length > 0 ? Math.max.apply(null, gastos.map(function(g) { return g.no; })) + 1 : 1,
    fecha: gasto.fecha,
    factura: sanitizarTexto(gasto.factura, VALIDACION.maxLongitud.factura),
    descripcion: sanitizarTexto(gasto.descripcion, VALIDACION.maxLongitud.descripcion),
    categoria: gasto.categoria,
    total: parseFloat(gasto.total)
  };

  gastos.push(nuevoGasto);

  try {
    localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify(gastos));
    return { exito: true, gasto: nuevoGasto };
  } catch (e) {
    console.error('[Storage] Error guardando gasto:', e);
    return { exito: false, errores: ['Error al guardar en almacenamiento local'] };
  }
}

function guardarPagoEnStorage(pago) {
  var errores = validarPago(pago);
  if (errores.length > 0) {
    return { exito: false, errores: errores };
  }

  var pagos = obtenerPagos();

  var nuevoPago = {
    no: pagos.length > 0 ? Math.max.apply(null, pagos.map(function(p) { return p.no; })) + 1 : 1,
    fecha: pago.fecha,
    cliente: sanitizarTexto(pago.cliente, VALIDACION.maxLongitud.cliente),
    proyecto: sanitizarTexto(pago.proyecto, VALIDACION.maxLongitud.proyecto),
    metodo: pago.metodo,
    monto: parseFloat(pago.monto),
    estado: pago.estado,
    notas: sanitizarTexto(pago.notas || '', VALIDACION.maxLongitud.notas)
  };

  pagos.push(nuevoPago);

  try {
    localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(pagos));
    return { exito: true, pago: nuevoPago };
  } catch (e) {
    console.error('[Storage] Error guardando pago:', e);
    return { exito: false, errores: ['Error al guardar en almacenamiento local'] };
  }
}

function eliminarGasto(no) {
  var gastos = obtenerGastos().filter(function(g) { return g.no !== no; });
  localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify(gastos));
  return true;
}

function eliminarPago(no) {
  var pagos = obtenerPagos().filter(function(p) { return p.no !== no; });
  localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(pagos));
  return true;
}

function exportarDatos() {
  var data = {
    gastos: obtenerGastos(),
    pagos: obtenerPagos(),
    exportado: new Date().toISOString()
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'proyintel-backup-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importarDatos(jsonString) {
  try {
    var data = JSON.parse(jsonString);
    if (data.gastos && Array.isArray(data.gastos)) {
      localStorage.setItem(STORAGE_KEYS.GASTOS, JSON.stringify(data.gastos));
    }
    if (data.pagos && Array.isArray(data.pagos)) {
      localStorage.setItem(STORAGE_KEYS.PAGOS, JSON.stringify(data.pagos));
    }
    return { exito: true };
  } catch (e) {
    return { exito: false, error: 'Formato de archivo invalido' };
  }
}

function resetearDatos() {
  if (confirm('¿Estas seguro de que deseas eliminar TODOS los datos? Esta accion no se puede deshacer.')) {
    localStorage.removeItem(STORAGE_KEYS.GASTOS);
    localStorage.removeItem(STORAGE_KEYS.PAGOS);
    localStorage.removeItem(STORAGE_KEYS.VERSION);
    inicializarStorage();
    location.reload();
  }
}
