// ============================================================
// js/data.js - Datos iniciales de ejemplo
// ============================================================
// NOTA: Estos son datos de demostracion. Al guardar nuevos registros
// desde los formularios, los datos se almacenan en localStorage.

const datosMensuales = {
  meses: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
  materiales: [12500, 14200, 11800, 16500, 13800, 15200, 18900],
  operativo: [8200, 7600, 9100, 8500, 7800, 9200, 8900],
  manoObra: [15400, 16800, 14300, 19200, 17500, 20100, 23800]
};

const gastosEjemplo = [
  { no: 1, fecha: '2026-07-03', factura: 'F-001254', descripcion: 'Cable electrico THW 12 AWG', categoria: 'materiales', total: 2450.00 },
  { no: 2, fecha: '2026-07-05', factura: 'F-001255', descripcion: 'Tuberia PVC 3/4 pulgada', categoria: 'materiales', total: 1890.50 },
  { no: 3, fecha: '2026-07-06', factura: 'F-001256', descripcion: 'Combustible generador', categoria: 'operativo', total: 420.00 },
  { no: 4, fecha: '2026-07-08', factura: 'F-001257', descripcion: 'Mano de obra - Instalacion electrica', categoria: 'mano-obra', total: 3200.00 },
  { no: 5, fecha: '2026-07-10', factura: 'F-001258', descripcion: 'Breakers industriales', categoria: 'materiales', total: 5670.00 },
  { no: 6, fecha: '2026-07-12', factura: 'F-001259', descripcion: 'Alquiler de andamios', categoria: 'operativo', total: 850.00 },
  { no: 7, fecha: '2026-07-14', factura: 'F-001260', descripcion: 'Mano de obra - Plomeria industrial', categoria: 'mano-obra', total: 2800.00 },
  { no: 8, fecha: '2026-07-15', factura: 'F-001261', descripcion: 'Transformador 75kVA', categoria: 'materiales', total: 8900.00 },
  { no: 9, fecha: '2026-07-17', factura: 'F-001262', descripcion: 'Transporte de materiales', categoria: 'operativo', total: 350.00 },
  { no: 10, fecha: '2026-07-18', factura: 'F-001263', descripcion: 'Mano de obra - ACI', categoria: 'mano-obra', total: 4500.00 },
  { no: 11, fecha: '2026-07-20', factura: 'F-001264', descripcion: 'Panel solar 450W', categoria: 'materiales', total: 3200.00 },
  { no: 12, fecha: '2026-07-22', factura: 'F-001265', descripcion: 'Herramientas especializadas', categoria: 'materiales', total: 1780.00 },
  { no: 13, fecha: '2026-07-24', factura: 'F-001266', descripcion: 'Permisos y licencias', categoria: 'operativo', total: 620.00 },
  { no: 14, fecha: '2026-07-26', factura: 'F-001267', descripcion: 'Mano de obra - Bombeo', categoria: 'mano-obra', total: 2100.00 },
  { no: 15, fecha: '2026-07-28', factura: 'F-001268', descripcion: 'Cableado estructurado CAT6', categoria: 'materiales', total: 2950.00 }
];

const pagosEjemplo = [
  { no: 1, fecha: '2026-07-02', cliente: 'Constructora del Pacifico', proyecto: 'Instalacion electrica bodega #3', metodo: 'transferencia', monto: 8500.00, estado: 'completado', notas: 'Transferencia Banco General #4521' },
  { no: 2, fecha: '2026-07-05', cliente: 'Supermercados El Machetazo', proyecto: 'Mantenimiento ACI sucursal Albrook', metodo: 'yappy', monto: 3200.00, estado: 'completado', notas: 'Pago Yappy confirmado' },
  { no: 3, fecha: '2026-07-08', cliente: 'Grupo Logistico Panama', proyecto: 'Sistema de bombeo industrial', metodo: 'cheque', monto: 12000.00, estado: 'pendiente', notas: 'Cheque #7845 - pendiente de cobro' },
  { no: 4, fecha: '2026-07-10', cliente: 'Hotel Plaza', proyecto: 'Generador de respaldo 50kVA', metodo: 'transferencia', monto: 18500.00, estado: 'completado', notas: 'Transferencia BAC #8823' },
  { no: 5, fecha: '2026-07-12', cliente: 'Industrias del Caribe', proyecto: 'Calidad de energia - Analisis', metodo: 'efectivo', monto: 2500.00, estado: 'completado', notas: 'Recibo #R-445' },
  { no: 6, fecha: '2026-07-15', cliente: 'Bodegas Centroamericanas', proyecto: 'Paneles solares 20kW', metodo: 'transferencia', monto: 28000.00, estado: 'parcial', notas: 'Anticipo 50% - saldo pendiente' },
  { no: 7, fecha: '2026-07-18', cliente: 'Clinica San Fernando', proyecto: 'Mantenimiento electrico mensual', metodo: 'yappy', monto: 1800.00, estado: 'completado', notas: '' },
  { no: 8, fecha: '2026-07-20', cliente: 'Terminal de Contenedores', proyecto: 'Iluminacion LED industrial', metodo: 'cheque', monto: 9500.00, estado: 'pendiente', notas: 'Cheque #9012' }
];

const presupuestos = {
  materiales: 20000,
  operativo: 10000,
  'mano-obra': 25000
};

const periodoActual = 'Julio 2026';

// ============================================================
// UTILIDADES
// ============================================================
const fmt = new Intl.NumberFormat('es-PA', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
});

// Calculos base (mes actual = ultimo indice)
const idxActual = datosMensuales.meses.length - 1;
const matActual = datosMensuales.materiales[idxActual];
const opActual = datosMensuales.operativo[idxActual];
const moActual = datosMensuales.manoObra[idxActual];
const totalActual = matActual + opActual + moActual;
