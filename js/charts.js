// ============================================================
// js/charts.js — Gráficas con Chart.js
// Dashboard: chartBalance, chartIngresosServicio
// Finanzas > Reportes: chartEvolucionMensual, chartIngresosPorServicio,
//                       chartGastosPorCategoria, chartRentabilidadProyectos
// Detalle de Proyecto (chartProyectoBalance) vive en proyectos.js
// ============================================================

var GN_CHART_INSTANCES = {};

function gnDestroyChart(canvasId) {
  if (GN_CHART_INSTANCES[canvasId]) {
    GN_CHART_INSTANCES[canvasId].destroy();
    GN_CHART_INSTANCES[canvasId] = null;
  }
}

function gnCategoriaLabel(cat) {
  if (typeof CAT_LABELS !== 'undefined' && CAT_LABELS[cat]) return CAT_LABELS[cat];
  return cat || 'Otros';
}

function gnGastoLabel(cat) {
  if (typeof GASTO_LABELS !== 'undefined' && GASTO_LABELS[cat]) return GASTO_LABELS[cat];
  return cat || 'Sin categoría';
}

var GN_CHART_COLORS = ['#2D8B5E', '#C5A253', '#3B82F6', '#F87171', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6B7280'];

async function inicializarCharts() {
  await renderChartBalance();
  await renderChartIngresosPorTipoServicio('chartIngresosServicio');
  await renderChartIngresosPorTipoServicio('chartIngresosPorServicio');
  await renderChartGastosPorCategoria();
  await renderChartEvolucionMensual();
  await renderChartRentabilidadProyectos();
}

// ============================================================
// Dashboard: Ingresos vs Gastos (últimos 6 meses)
// ============================================================
async function renderChartBalance() {
  var canvas = document.getElementById('chartBalance');
  if (!canvas || typeof Chart === 'undefined') return;

  var gastos = await getData(STORAGE_KEYS.GASTOS);
  var pagos = await getData(STORAGE_KEYS.PAGOS);
  gastos = Array.isArray(gastos) ? gastos : [];
  pagos = Array.isArray(pagos) ? pagos : [];

  var meses = [];
  var ingresosData = [];
  var gastosData = [];
  var mesesMap = {};
  var orden = [];

  for (var i = 5; i >= 0; i--) {
    var d = new Date();
    d.setMonth(d.getMonth() - i);
    var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    var label = d.toLocaleDateString('es-PA', { month: 'short', year: '2-digit' });
    meses.push(label);
    orden.push(key);
    mesesMap[key] = { ingresos: 0, gastos: 0 };
  }

  pagos.forEach(function(p) {
    if (!p.fecha) return;
    var key = String(p.fecha).substring(0, 7);
    if (mesesMap[key]) mesesMap[key].ingresos += parseFloat(p.monto) || 0;
  });

  gastos.forEach(function(g) {
    if (!g.fecha) return;
    var key = String(g.fecha).substring(0, 7);
    if (mesesMap[key]) mesesMap[key].gastos += parseFloat(g.monto) || 0;
  });

  orden.forEach(function(key) {
    ingresosData.push(mesesMap[key].ingresos);
    gastosData.push(mesesMap[key].gastos);
  });

  gnDestroyChart('chartBalance');

  GN_CHART_INSTANCES.chartBalance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: meses,
      datasets: [
        { label: 'Ingresos', data: ingresosData, backgroundColor: 'rgba(45,139,94,0.75)', borderColor: '#2D8B5E', borderWidth: 1, borderRadius: 6 },
        { label: 'Gastos', data: gastosData, backgroundColor: 'rgba(248,113,113,0.75)', borderColor: '#F87171', borderWidth: 1, borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#9CA3AF' } } },
      scales: {
        x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(18,53,36,0.15)' } },
        y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(18,53,36,0.15)' } }
      }
    }
  });
}

// ============================================================
// Dashboard + Reportes: Ingresos por Tipo de Servicio
// Se calcula sobre el valor total de las cotizaciones (por línea),
// agrupado por la categoría del servicio del catálogo.
// Nota: solo las cotizaciones creadas después de esta actualización
// llevan la categoría guardada en cada línea; las anteriores caen en "Otros".
// ============================================================
async function renderChartIngresosPorTipoServicio(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  var cotizaciones = await getData(STORAGE_KEYS.COTIZACIONES);
  cotizaciones = Array.isArray(cotizaciones) ? cotizaciones : [];

  var categorias = {};

  cotizaciones.forEach(function(cot) {
    var items = [];
    try {
      items = typeof cot.items === 'string' ? JSON.parse(cot.items) : (cot.items || []);
    } catch (e) { items = []; }
    if (!Array.isArray(items)) return;

    items.forEach(function(item) {
      var cat = item.categoria || 'otros';
      var total = parseFloat(item.total) || 0;
      categorias[cat] = (categorias[cat] || 0) + total;
    });
  });

  var labels = [];
  var data = [];
  Object.keys(categorias).forEach(function(cat) {
    labels.push(gnCategoriaLabel(cat));
    data.push(categorias[cat]);
  });

  var colors = GN_CHART_COLORS.slice(0, data.length);
  if (data.length === 0) {
    labels = ['Sin datos'];
    data = [1];
    colors = ['rgba(255,255,255,0.10)'];
  }

  gnDestroyChart(canvasId);

  GN_CHART_INSTANCES[canvasId] = new Chart(canvas, {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { color: '#9CA3AF', font: { size: 11 } } } }
    }
  });
}

// ============================================================
// Reportes: Gastos por Categoría
// ============================================================
async function renderChartGastosPorCategoria() {
  var canvas = document.getElementById('chartGastosPorCategoria');
  if (!canvas || typeof Chart === 'undefined') return;

  var gastos = await getData(STORAGE_KEYS.GASTOS);
  gastos = Array.isArray(gastos) ? gastos : [];

  var categorias = {};
  gastos.forEach(function(g) {
    var cat = g.tipo || g.categoria || 'otros';
    categorias[cat] = (categorias[cat] || 0) + (parseFloat(g.monto) || 0);
  });

  var labels = [];
  var data = [];
  Object.keys(categorias).forEach(function(cat) {
    labels.push(gnGastoLabel(cat));
    data.push(categorias[cat]);
  });

  var colors = GN_CHART_COLORS.slice(0, data.length);
  if (data.length === 0) {
    labels = ['Sin datos'];
    data = [1];
    colors = ['rgba(255,255,255,0.10)'];
  }

  gnDestroyChart('chartGastosPorCategoria');

  GN_CHART_INSTANCES.chartGastosPorCategoria = new Chart(canvas, {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { color: '#9CA3AF', font: { size: 11 } } } }
    }
  });
}

// ============================================================
// Reportes: Evolución Mensual (Ingresos vs Gastos, historial completo)
// ============================================================
async function renderChartEvolucionMensual() {
  var canvas = document.getElementById('chartEvolucionMensual');
  if (!canvas || typeof Chart === 'undefined') return;

  var gastos = await getData(STORAGE_KEYS.GASTOS);
  var pagos = await getData(STORAGE_KEYS.PAGOS);
  gastos = Array.isArray(gastos) ? gastos : [];
  pagos = Array.isArray(pagos) ? pagos : [];

  var mesesMap = {};

  function agregar(fecha, campo, monto) {
    if (!fecha) return;
    var key = String(fecha).substring(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) return;
    if (!mesesMap[key]) mesesMap[key] = { ingresos: 0, gastos: 0 };
    mesesMap[key][campo] += monto;
  }

  pagos.forEach(function(p) { agregar(p.fecha, 'ingresos', parseFloat(p.monto) || 0); });
  gastos.forEach(function(g) { agregar(g.fecha, 'gastos', parseFloat(g.monto) || 0); });

  var claves = Object.keys(mesesMap).sort();

  // Si no hay datos históricos, mostrar los últimos 6 meses en cero
  if (claves.length === 0) {
    for (var i = 5; i >= 0; i--) {
      var d = new Date();
      d.setMonth(d.getMonth() - i);
      var key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      mesesMap[key] = { ingresos: 0, gastos: 0 };
      claves.push(key);
    }
  }

  var labels = claves.map(function(key) {
    var partes = key.split('-');
    var d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, 1);
    return d.toLocaleDateString('es-PA', { month: 'short', year: '2-digit' });
  });
  var ingresosData = claves.map(function(key) { return mesesMap[key].ingresos; });
  var gastosData = claves.map(function(key) { return mesesMap[key].gastos; });

  gnDestroyChart('chartEvolucionMensual');

  GN_CHART_INSTANCES.chartEvolucionMensual = new Chart(canvas, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Ingresos', data: ingresosData, borderColor: '#2D8B5E', backgroundColor: 'rgba(45,139,94,0.15)', fill: true, tension: 0.3 },
        { label: 'Gastos', data: gastosData, borderColor: '#F87171', backgroundColor: 'rgba(248,113,113,0.15)', fill: true, tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#9CA3AF' } } },
      scales: {
        x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(18,53,36,0.15)' } },
        y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(18,53,36,0.15)' } }
      }
    }
  });
}

// ============================================================
// Reportes: Rentabilidad por Proyecto
// ============================================================
async function renderChartRentabilidadProyectos() {
  var canvas = document.getElementById('chartRentabilidadProyectos');
  if (!canvas || typeof Chart === 'undefined') return;

  var proyectos = await getData(STORAGE_KEYS.PROYECTOS);
  proyectos = Array.isArray(proyectos) ? proyectos : [];

  // Mostrar los proyectos más relevantes por presupuesto (máximo 10 para legibilidad)
  var ordenados = proyectos.slice().sort(function(a, b) {
    return (parseFloat(b.presupuesto) || 0) - (parseFloat(a.presupuesto) || 0);
  }).slice(0, 10);

  var labels = ordenados.map(function(p) { return p.nombre || 'Proyecto'; });
  var ingresos = ordenados.map(function(p) { return parseFloat(p.total_cobrado) || 0; });
  var gastosArr = ordenados.map(function(p) { return parseFloat(p.total_gastado) || 0; });
  var utilidad = ordenados.map(function(p, i) { return ingresos[i] - gastosArr[i]; });

  if (labels.length === 0) {
    labels = ['Sin datos'];
    ingresos = [0];
    gastosArr = [0];
    utilidad = [0];
  }

  gnDestroyChart('chartRentabilidadProyectos');

  GN_CHART_INSTANCES.chartRentabilidadProyectos = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Cobrado', data: ingresos, backgroundColor: 'rgba(45,139,94,0.75)', borderColor: '#2D8B5E', borderWidth: 1, borderRadius: 6 },
        { label: 'Gastado', data: gastosArr, backgroundColor: 'rgba(248,113,113,0.75)', borderColor: '#F87171', borderWidth: 1, borderRadius: 6 },
        { label: 'Utilidad', data: utilidad, backgroundColor: 'rgba(197,162,83,0.75)', borderColor: '#C5A253', borderWidth: 1, borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#9CA3AF' } } },
      scales: {
        x: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(18,53,36,0.15)' } },
        y: { ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(18,53,36,0.15)' } }
      }
    }
  });
}
