// ============================================================
// js/finanzas.js — Módulo de Finanzas (Estado de Cuenta + ITBMS)
// ============================================================

// ============================================================
// ESTADO DE CUENTA
// ============================================================
function generarEstadoCuenta() {
  var desde = document.getElementById('ec-desde').value;
  var hasta = document.getElementById('ec-hasta').value;
  var tipo = document.getElementById('ec-tipo').value;
  var proyectoId = document.getElementById('ec-proyecto').value;
  
  var gastos = getData(STORAGE_KEYS.GASTOS);
  var pagos = getData(STORAGE_KEYS.PAGOS);
  
  // Filtrar por fecha
  if (desde) {
    gastos = gastos.filter(function(g) { return g.fecha >= desde; });
    pagos = pagos.filter(function(p) { return p.fecha >= desde; });
  }
  if (hasta) {
    gastos = gastos.filter(function(g) { return g.fecha <= hasta; });
    pagos = pagos.filter(function(p) { return p.fecha <= hasta; });
  }
  
  // Filtrar por proyecto
  if (proyectoId) {
    gastos = gastos.filter(function(g) { return g.proyectoId === proyectoId; });
    pagos = pagos.filter(function(p) { return p.proyectoId === proyectoId; });
  }
  
  // Combinar y ordenar
  var movimientos = [];
  
  if (tipo !== 'ingresos') {
    for (var i = 0; i < gastos.length; i++) {
      var g = gastos[i];
      movimientos.push({
        fecha: g.fecha,
        tipo: 'gasto',
        proyecto: g.proyectoId || 'General',
        descripcion: g.descripcion,
        ingreso: 0,
        gasto: parseFloat(g.monto) || 0,
        metodo: g.metodo
      });
    }
  }
  
  if (tipo !== 'gastos') {
    for (var i = 0; i < pagos.length; i++) {
      var p = pagos[i];
      movimientos.push({
        fecha: p.fecha,
        tipo: 'pago',
        proyecto: p.proyectoId || p.cliente || 'General',
        descripcion: p.concepto,
        ingreso: parseFloat(p.monto) || 0,
        gasto: 0,
        metodo: p.metodo
      });
    }
  }
  
  movimientos.sort(function(a, b) { return new Date(a.fecha) - new Date(b.fecha); });
  
  // Calcular saldo acumulado
  var saldo = 0;
  var totalIngresos = 0;
  var totalGastos = 0;
  
  var html = '';
  for (var i = 0; i < movimientos.length; i++) {
    var m = movimientos[i];
    saldo += m.ingreso - m.gasto;
    totalIngresos += m.ingreso;
    totalGastos += m.gasto;
    
    var color = m.tipo === 'pago' ? '#6bbd45' : '#ef4444';
    
    html += '<tr>' +
      '<td>' + formatDate(m.fecha) + '</td>' +
      '<td><span style="color:' + color + ';font-weight:600;font-size:11px;text-transform:uppercase;">' + (m.tipo === 'pago' ? 'Ingreso' : 'Gasto') + '</span></td>' +
      '<td>' + m.proyecto + '</td>' +
      '<td>' + m.descripcion + '</td>' +
      '<td class="td-monto" style="color:#6bbd45;">' + (m.ingreso > 0 ? formatMoney(m.ingreso) : '—') + '</td>' +
      '<td class="td-monto" style="color:#ef4444;">' + (m.gasto > 0 ? '-' + formatMoney(m.gasto) : '—') + '</td>' +
      '<td class="td-monto">' + formatMoney(saldo) + '</td>' +
      '</tr>';
  }
  
  document.getElementById('tbodyEstadoCuenta').innerHTML = html || '<tr><td colspan="7" class="tabla-vacia">No hay movimientos en el período seleccionado</td></tr>';
  document.getElementById('ec-total-ingresos').textContent = formatMoney(totalIngresos);
  document.getElementById('ec-total-gastos').textContent = formatMoney(totalGastos);
  document.getElementById('ec-balance').textContent = formatMoney(totalIngresos - totalGastos);
}

function exportarEstadoCuentaPDF() {
  alert('📄 Exportando a PDF... (funcionalidad en desarrollo)');
}

function exportarEstadoCuentaExcel() {
  alert('📊 Exportando a Excel... (funcionalidad en desarrollo)');
}

// ============================================================
// DECLARACIÓN ITBMS PANAMÁ
// ============================================================
function generarDeclaracionITBMS() {
  var periodo = document.getElementById('itbms-periodo').value;
  var ruc = document.getElementById('itbms-ruc').value;
  var razon = document.getElementById('itbms-razon').value;
  
  if (!periodo || !ruc || !razon) {
    alert('❌ Completa todos los campos obligatorios');
    return;
  }
  
  var mes = periodo + '-01';
  var finMes = periodo + '-31';
  
  // Ventas con ITBMS (débito fiscal)
  var cotizaciones = getData(STORAGE_KEYS.COTIZACIONES).filter(function(c) {
    return c.fecha >= mes && c.fecha <= finMes && c.aplicaItbms && c.estado !== 'rechazado';
  });
  
  var ventasGravadas = 0;
  var itbmsDebito = 0;
  var htmlDebito = '';
  
  for (var i = 0; i < cotizaciones.length; i++) {
    var c = cotizaciones[i];
    var base = c.subtotal - c.descuentoMonto;
    var itbms = c.itbmsMonto;
    ventasGravadas += base;
    itbmsDebito += itbms;
    
    htmlDebito += '<tr>' +
      '<td>' + formatDate(c.fecha) + '</td>' +
      '<td>' + (c.clienteNombre || '—') + '</td>' +
      '<td>' + c.numero + '</td>' +
      '<td>' + formatMoney(base) + '</td>' +
      '<td>' + formatMoney(itbms) + '</td>' +
      '<td>' + formatMoney(base + itbms) + '</td>' +
      '</tr>';
  }
  
  // Compras/gastos con ITBMS (crédito fiscal)
  var gastos = getData(STORAGE_KEYS.GASTOS).filter(function(g) {
    // Simulación: gastos que aplican ITBMS (en realidad se marcaría en cada gasto)
    return g.fecha >= mes && g.fecha <= finMes;
  });
  
  var comprasGravadas = 0;
  var itbmsCredito = 0;
  var htmlCredito = '';
  
  // Para demo, asumimos que algunos gastos tienen ITBMS
  for (var i = 0; i < gastos.length; i++) {
    var g = gastos[i];
    var base = parseFloat(g.monto) || 0;
    var itbms = base * 0.07; // Simulado
    comprasGravadas += base;
    itbmsCredito += itbms;
    
    htmlCredito += '<tr>' +
      '<td>' + formatDate(g.fecha) + '</td>' +
      '<td>Proveedor</td>' +
      '<td>' + g.descripcion + '</td>' +
      '<td>' + formatMoney(base) + '</td>' +
      '<td>' + formatMoney(itbms) + '</td>' +
      '<td>' + formatMoney(base + itbms) + '</td>' +
      '</tr>';
  }
  
  var aPagar = itbmsDebito - itbmsCredito;
  
  // Mostrar resumen
  document.getElementById('itbms-ventas-gravadas').textContent = formatMoney(ventasGravadas);
  document.getElementById('itbms-debito').textContent = formatMoney(itbmsDebito);
  document.getElementById('itbms-credito').textContent = formatMoney(itbmsCredito);
  document.getElementById('itbms-a-pagar').textContent = formatMoney(Math.max(0, aPagar));
  
  document.getElementById('tbodyITBMSDebito').innerHTML = htmlDebito || '<tr><td colspan="6" class="tabla-vacia">No hay ventas gravadas</td></tr>';
  document.getElementById('tbodyITBMSCredito').innerHTML = htmlCredito || '<tr><td colspan="6" class="tabla-vacia">No hay compras gravadas</td></tr>';
  
  document.getElementById('itbms-resumen-container').style.display = 'block';
}

function exportarITBMSPDF() {
  alert('📄 Generando PDF para DGI... (funcionalidad en desarrollo)');
}
