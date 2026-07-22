// ============================================================
// js/negocio-proveedores.js — GN Studio OS v1.0
// Gestión de Proveedores
// ============================================================

var PROV_KEY = 'gn_proveedores';

async function prov_getAll() {
  try { return await getData(PROV_KEY) || []; } catch(e) { return []; }
}

async function prov_renderTabla() {
  var tbody = document.getElementById('tbody-proveedores');
  if (!tbody) return;
  var provs = await prov_getAll();
  if (!provs.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No hay proveedores registrados aún.</td></tr>';
    return;
  }
  var html = '';
  provs.forEach(function(p) {
    var categoriaColor = {
      'impresión': '#C5A253', 'fotografía': '#60A5FA', 'video': '#A78BFA',
      'copywriting': '#2D8B5E', 'desarrollo': '#F87171', 'otro': '#8FAB9A'
    }[String(p.categoria||'').toLowerCase()] || '#8FAB9A';
    html += '<tr>';
    html += '<td><strong>'+escH(p.nombre||'-')+'</strong></td>';
    html += '<td><span style="font-size:11px;padding:2px 8px;border-radius:99px;background:rgba(197,162,83,0.1);color:'+categoriaColor+';">'+escH(p.categoria||'-')+'</span></td>';
    html += '<td>'+escH(p.servicio||'-')+'</td>';
    html += '<td>'+escH(p.contacto||'-')+'</td>';
    html += '<td>'+(p.link?'<a href="'+escH(p.link)+'" target="_blank" style="color:#C5A253;">Ver →</a>':'-')+'</td>';
    html += '<td>'+(p.costo_referencia?'USD '+parseFloat(p.costo_referencia).toFixed(2):'-')+'</td>';
    html += '<td>';
    html += '<button class="btn-accion" onclick="provEditar(\''+p.id+'\')" title="Editar">✏️</button> ';
    html += '<button class="btn-accion btn-danger" onclick="provEliminar(\''+p.id+'\')" title="Eliminar">🗑️</button>';
    html += '</td></tr>';
  });
  tbody.innerHTML = html;
}

async function provEliminar(id) {
  if (!confirm('¿Eliminar este proveedor?')) return;
  await deleteItem(PROV_KEY, id);
  await prov_renderTabla();
  if (window.showToast) window.showToast({ type:'success', title:'Proveedor eliminado' });
}

function provAbrirModal(id) {
  var existing = document.getElementById('gn-modal-prov');
  if (existing) existing.remove();
  var modal = document.createElement('div');
  modal.id = 'gn-modal-prov';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';
  modal.innerHTML = [
    '<div style="background:#111E17;border-radius:16px;padding:32px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;border:1px solid rgba(197,162,83,0.2);">',
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">',
        '<h3 style="margin:0;color:#E8F0EC;font-size:18px;"><i class="ph ph-storefront" style="color:#C5A253;"></i> '+(id?'Editar':'Nuevo')+' Proveedor</h3>',
        '<button onclick="document.getElementById(\'gn-modal-prov\').remove()" style="background:none;border:none;color:#8FAB9A;font-size:22px;cursor:pointer;">✕</button>',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">',
        '<div style="grid-column:1/-1;"><label style="font-size:11px;color:#8FAB9A;display:block;margin-bottom:5px;">NOMBRE *</label>',
        '<input id="prov-nombre" placeholder="Nombre del proveedor o empresa" style="width:100%;padding:10px;background:#0D1611;border:1px solid rgba(197,162,83,0.2);border-radius:8px;color:#E8F0EC;box-sizing:border-box;"></div>',
        '<div><label style="font-size:11px;color:#8FAB9A;display:block;margin-bottom:5px;">CATEGORÍA</label>',
        '<select id="prov-categoria" style="width:100%;padding:10px;background:#0D1611;border:1px solid rgba(197,162,83,0.2);border-radius:8px;color:#E8F0EC;">',
        '<option value="impresión">Impresión</option><option value="fotografía">Fotografía</option>',
        '<option value="video">Video / Audiovisual</option><option value="copywriting">Copywriting</option>',
        '<option value="desarrollo">Desarrollo Web</option><option value="otro">Otro</option>',
        '</select></div>',
        '<div><label style="font-size:11px;color:#8FAB9A;display:block;margin-bottom:5px;">SERVICIO QUE OFRECE</label>',
        '<input id="prov-servicio" placeholder="Ej: Impresión en gran formato" style="width:100%;padding:10px;background:#0D1611;border:1px solid rgba(197,162,83,0.2);border-radius:8px;color:#E8F0EC;box-sizing:border-box;"></div>',
        '<div><label style="font-size:11px;color:#8FAB9A;display:block;margin-bottom:5px;">CONTACTO (Tel / Email)</label>',
        '<input id="prov-contacto" placeholder="Teléfono o correo" style="width:100%;padding:10px;background:#0D1611;border:1px solid rgba(197,162,83,0.2);border-radius:8px;color:#E8F0EC;box-sizing:border-box;"></div>',
        '<div style="grid-column:1/-1;"><label style="font-size:11px;color:#8FAB9A;display:block;margin-bottom:5px;">LINK / WEB</label>',
        '<input id="prov-link" placeholder="https://..." style="width:100%;padding:10px;background:#0D1611;border:1px solid rgba(197,162,83,0.2);border-radius:8px;color:#E8F0EC;box-sizing:border-box;"></div>',
        '<div><label style="font-size:11px;color:#8FAB9A;display:block;margin-bottom:5px;">COSTO REFERENCIA (USD)</label>',
        '<input id="prov-costo" type="number" placeholder="0.00" step="0.01" min="0" style="width:100%;padding:10px;background:#0D1611;border:1px solid rgba(197,162,83,0.2);border-radius:8px;color:#E8F0EC;box-sizing:border-box;"></div>',
        '<div><label style="font-size:11px;color:#8FAB9A;display:block;margin-bottom:5px;">CALIFICACIÓN</label>',
        '<select id="prov-rating" style="width:100%;padding:10px;background:#0D1611;border:1px solid rgba(197,162,83,0.2);border-radius:8px;color:#E8F0EC;">',
        '<option value="5">⭐⭐⭐⭐⭐ Excelente</option><option value="4">⭐⭐⭐⭐ Muy bueno</option>',
        '<option value="3" selected>⭐⭐⭐ Regular</option><option value="2">⭐⭐ Deficiente</option><option value="1">⭐ Malo</option>',
        '</select></div>',
        '<div style="grid-column:1/-1;"><label style="font-size:11px;color:#8FAB9A;display:block;margin-bottom:5px;">NOTAS</label>',
        '<textarea id="prov-notas" rows="2" placeholder="Notas internas..." style="width:100%;padding:10px;background:#0D1611;border:1px solid rgba(197,162,83,0.2);border-radius:8px;color:#E8F0EC;box-sizing:border-box;resize:vertical;"></textarea></div>',
      '</div>',
      '<div style="display:flex;gap:12px;justify-content:flex-end;margin-top:24px;">',
        '<button onclick="document.getElementById(\'gn-modal-prov\').remove()" style="padding:10px 20px;background:rgba(18,53,36,0.3);border:1px solid rgba(197,162,83,0.15);border-radius:8px;color:#E8F0EC;cursor:pointer;">Cancelar</button>',
        '<button onclick="provGuardar(\''+id+'\')" style="padding:10px 20px;background:#C5A253;border:none;border-radius:8px;color:#111;font-weight:700;cursor:pointer;">Guardar Proveedor</button>',
      '</div>',
    '</div>'
  ].join('');
  document.body.appendChild(modal);
  if (id) {
    findItem(PROV_KEY, id).then(function(p) {
      if (!p) return;
      var sv = function(elId, v){ var el=document.getElementById(elId); if(el) el.value=v||''; };
      sv('prov-nombre', p.nombre); sv('prov-categoria', p.categoria);
      sv('prov-servicio', p.servicio); sv('prov-contacto', p.contacto);
      sv('prov-link', p.link); sv('prov-costo', p.costo_referencia);
      sv('prov-rating', p.rating); sv('prov-notas', p.notas);
    });
  }
  modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
}

async function provGuardar(editId) {
  var nombre = (document.getElementById('prov-nombre')||{}).value||'';
  if (!nombre.trim()) { alert('El nombre es obligatorio.'); return; }
  var payload = {
    nombre: nombre.trim(),
    categoria: (document.getElementById('prov-categoria')||{}).value||'otro',
    servicio: (document.getElementById('prov-servicio')||{}).value||'',
    contacto: (document.getElementById('prov-contacto')||{}).value||'',
    link: (document.getElementById('prov-link')||{}).value||'',
    costo_referencia: (document.getElementById('prov-costo')||{}).value||'',
    rating: (document.getElementById('prov-rating')||{}).value||'3',
    notas: (document.getElementById('prov-notas')||{}).value||''
  };
  if (editId) { await updateItem(PROV_KEY, editId, payload); }
  else { await addItem(PROV_KEY, payload); }
  var m=document.getElementById('gn-modal-prov'); if(m) m.remove();
  await prov_renderTabla();
  if (window.showToast) window.showToast({ type:'success', title: editId?'Proveedor actualizado':'Proveedor guardado', message: payload.nombre });
}

async function provEditar(id) { provAbrirModal(id); }

function escH(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
