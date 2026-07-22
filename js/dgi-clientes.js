// ============================================================
// js/dgi-clientes.js — Registro de Contribuyentes DGI Panamá
// GN Studio OS v2.5
// ============================================================
// NOTA TÉCNICA:
// Los endpoints públicos de la DGI/MEF (etax2.mef.gob.pa,
// api.mef.gob.pa) no permiten llamadas cross-origin desde el
// navegador (sin CORS headers) y no responden a proxies externos.
// Solución definitiva: formulario de entrada manual con validación
// de formato RUC panameño + guardado directo en Supabase.
// ============================================================

(function (window, document) {
  'use strict';

  var byId = function (id) { return document.getElementById(id); };

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function toast(type, title, message) {
    if (window.showToast) window.showToast({ type: type, title: title, message: message });
    else console.log('[' + type + '] ' + title + ': ' + message);
  }

  // ============================================================
  // Validar formato RUC panameño
  // Formatos válidos: 8-123-456, PE-123-456, N-123-456,
  //   123456789-2-2023, etc.
  // ============================================================
  function validarRUC(ruc) {
    if (!ruc || !ruc.trim()) return false;
    // RUC persona natural: dígito(s)-dígitos-dígitos
    // RUC persona jurídica: letras-dígitos-dígitos o solo dígitos largos
    var r = ruc.trim();
    return /^[A-Z0-9]{1,10}-[0-9]{1,10}-[0-9]{1,6}$/.test(r) ||
           /^[0-9]{6,15}$/.test(r) ||
           /^[A-Z]{1,3}-[0-9]+-[0-9]+$/.test(r);
  }

  // ============================================================
  // MODAL DE REGISTRO DGI — Entrada Manual
  // ============================================================
  function abrirModalDGI() {
    var existing = byId('gn-modal-dgi');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'gn-modal-dgi';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;';

    modal.innerHTML = [
      '<div style="background:#111E17;border-radius:14px;padding:32px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;border:1px solid rgba(197,162,83,0.2);">',

        // Header
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">',
          '<div>',
            '<h3 style="margin:0;color:#F0F0F5;font-size:18px;"><i class="ph ph-identification-card"></i> Agregar Cliente / Contribuyente</h3>',
            '<p style="margin:6px 0 0;color:#8FAB9A;font-size:12px;">Registra los datos del contribuyente según la DGI Panamá</p>',
          '</div>',
          '<button type="button" id="dgi-modal-close" style="background:none;border:none;color:#9CA3AF;font-size:24px;cursor:pointer;line-height:1;">&#x2715;</button>',
        '</div>',

        // Aviso informativo
        '<div style="background:rgba(197,162,83,0.08);border:1px solid rgba(197,162,83,0.25);border-radius:8px;padding:12px 14px;margin-bottom:20px;font-size:12px;color:#C5A253;">',
          '<i class="ph ph-info" style="margin-right:6px;"></i>',
          'Consulta el RUC en <a href="https://www.dgi.mef.gob.pa" target="_blank" rel="noopener" style="color:#C5A253;text-decoration:underline;">dgi.mef.gob.pa</a> e ingresa los datos manualmente.',
        '</div>',

        // Formulario
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">',

          // Nombre / Razón Social
          '<div style="grid-column:1/-1;">',
            '<label style="display:block;font-size:11px;font-weight:700;color:#8FAB9A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Nombre / Razón Social *</label>',
            '<input id="dgi-f-nombre" type="text" placeholder="Ej: Proyintel, S.A." style="width:100%;padding:10px 14px;background:#0D1611;border:1px solid rgba(197,162,83,0.3);border-radius:8px;color:#F0F0F5;font-size:14px;outline:none;box-sizing:border-box;" />',
          '</div>',

          // Nombre Comercial
          '<div style="grid-column:1/-1;">',
            '<label style="display:block;font-size:11px;font-weight:700;color:#8FAB9A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Nombre Comercial</label>',
            '<input id="dgi-f-nombre-comercial" type="text" placeholder="Ej: Proyintel" style="width:100%;padding:10px 14px;background:#0D1611;border:1px solid rgba(197,162,83,0.3);border-radius:8px;color:#F0F0F5;font-size:14px;outline:none;box-sizing:border-box;" />',
          '</div>',

          // RUC
          '<div>',
            '<label style="display:block;font-size:11px;font-weight:700;color:#8FAB9A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">RUC *</label>',
            '<input id="dgi-f-ruc" type="text" placeholder="Ej: 155666899-2-2018" style="width:100%;padding:10px 14px;background:#0D1611;border:1px solid rgba(197,162,83,0.3);border-radius:8px;color:#F0F0F5;font-size:14px;outline:none;box-sizing:border-box;" />',
          '</div>',

          // DV
          '<div>',
            '<label style="display:block;font-size:11px;font-weight:700;color:#8FAB9A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Dígito Verificador (DV)</label>',
            '<input id="dgi-f-dv" type="text" placeholder="Ej: 45" maxlength="4" style="width:100%;padding:10px 14px;background:#0D1611;border:1px solid rgba(197,162,83,0.3);border-radius:8px;color:#F0F0F5;font-size:14px;outline:none;box-sizing:border-box;" />',
          '</div>',

          // Tipo
          '<div>',
            '<label style="display:block;font-size:11px;font-weight:700;color:#8FAB9A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Tipo de Contribuyente</label>',
            '<select id="dgi-f-tipo" style="width:100%;padding:10px 14px;background:#0D1611;border:1px solid rgba(197,162,83,0.3);border-radius:8px;color:#F0F0F5;font-size:14px;outline:none;box-sizing:border-box;">',
              '<option value="">— Seleccionar —</option>',
              '<option value="Persona Jurídica">Persona Jurídica</option>',
              '<option value="Persona Natural">Persona Natural</option>',
              '<option value="Empresa Extranjera">Empresa Extranjera</option>',
              '<option value="Entidad Gubernamental">Entidad Gubernamental</option>',
            '</select>',
          '</div>',

          // Estado
          '<div>',
            '<label style="display:block;font-size:11px;font-weight:700;color:#8FAB9A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Estado</label>',
            '<select id="dgi-f-estado" style="width:100%;padding:10px 14px;background:#0D1611;border:1px solid rgba(197,162,83,0.3);border-radius:8px;color:#F0F0F5;font-size:14px;outline:none;box-sizing:border-box;">',
              '<option value="Activo">Activo</option>',
              '<option value="Inactivo">Inactivo</option>',
              '<option value="Suspendido">Suspendido</option>',
            '</select>',
          '</div>',

          // Actividad Económica
          '<div style="grid-column:1/-1;">',
            '<label style="display:block;font-size:11px;font-weight:700;color:#8FAB9A;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;">Actividad Económica</label>',
            '<input id="dgi-f-actividad" type="text" placeholder="Ej: Servicios de construcción y diseño" style="width:100%;padding:10px 14px;background:#0D1611;border:1px solid rgba(197,162,83,0.3);border-radius:8px;color:#F0F0F5;font-size:14px;outline:none;box-sizing:border-box;" />',
          '</div>',

        '</div>',

        // Botones
        '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;">',
          '<button type="button" id="dgi-btn-cancelar" style="padding:10px 20px;background:transparent;border:1px solid rgba(197,162,83,0.25);border-radius:8px;color:#8FAB9A;font-size:14px;cursor:pointer;">Cancelar</button>',
          '<button type="button" id="dgi-btn-guardar" style="padding:10px 24px;background:#C5A253;border:none;border-radius:8px;color:#111;font-weight:700;font-size:14px;cursor:pointer;"><i class="ph ph-check"></i> Guardar Cliente</button>',
        '</div>',

      '</div>'
    ].join('');

    document.body.appendChild(modal);

    byId('dgi-modal-close').addEventListener('click', cerrarModalDGI);
    byId('dgi-btn-cancelar').addEventListener('click', cerrarModalDGI);
    modal.addEventListener('click', function (e) { if (e.target === modal) cerrarModalDGI(); });
    byId('dgi-btn-guardar').addEventListener('click', _guardarFormulario);

    setTimeout(function () {
      var el = byId('dgi-f-nombre');
      if (el) el.focus();
    }, 100);
  }

  function cerrarModalDGI() {
    var m = byId('gn-modal-dgi');
    if (m) m.remove();
  }

  // ============================================================
  // Leer formulario y guardar
  // ============================================================
  async function _guardarFormulario() {
    var nombre   = (byId('dgi-f-nombre')           && byId('dgi-f-nombre').value.trim())           || '';
    var nomCom   = (byId('dgi-f-nombre-comercial') && byId('dgi-f-nombre-comercial').value.trim()) || '';
    var ruc      = (byId('dgi-f-ruc')              && byId('dgi-f-ruc').value.trim())              || '';
    var dv       = (byId('dgi-f-dv')               && byId('dgi-f-dv').value.trim())               || '';
    var tipo     = (byId('dgi-f-tipo')             && byId('dgi-f-tipo').value)                    || '';
    var estado   = (byId('dgi-f-estado')           && byId('dgi-f-estado').value)                  || 'Activo';
    var actividad= (byId('dgi-f-actividad')        && byId('dgi-f-actividad').value.trim())        || '';

    if (!nombre) {
      toast('warning', 'Campo requerido', 'El nombre / razón social es obligatorio.');
      byId('dgi-f-nombre').focus();
      return;
    }
    if (!ruc) {
      toast('warning', 'Campo requerido', 'El RUC es obligatorio.');
      byId('dgi-f-ruc').focus();
      return;
    }

    var item = {
      nombre:            nombre,
      nombre_comercial:  nomCom,
      ruc:               ruc,
      dv:                dv,
      tipo_contribuyente: tipo,
      estado:            estado,
      actividad:         actividad
    };

    var btn = byId('dgi-btn-guardar');
    await _guardarClienteDGI(item, btn);
  }

  // ============================================================
  // GUARDAR CLIENTE EN SUPABASE
  // ============================================================
  async function _guardarClienteDGI(item, btnEl) {
    if (!item) return;
    try {
      if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Guardando...'; }

      var userId = null;
      if (typeof window.getSessionUserId === 'function') userId = await window.getSessionUserId();

      var payload = {
        user_id:           userId,
        nombre:            item.nombre || '',
        nombre_comercial:  item.nombre_comercial || '',
        ruc:               item.ruc || '',
        dv:                item.dv || '',
        tipo_contribuyente: item.tipo_contribuyente || '',
        actividad:         item.actividad || '',
        tipo:              'activo',
        fuente:            'dgi',
        notas:             'Registrado manualmente — DGI Panamá'
      };

      var CLIENTES_TABLE = (window.STORAGE_KEYS && window.STORAGE_KEYS.CLIENTES) ? window.STORAGE_KEYS.CLIENTES : 'clientes';

      var resultado = null;
      if (typeof window.addItem === 'function') {
        resultado = await window.addItem(CLIENTES_TABLE, payload);
      }

      if (resultado) {
        toast('success', '¡Cliente guardado!', item.nombre + ' fue agregado a tus clientes.');
        cerrarModalDGI();
        if (typeof window.renderClientes === 'function') window.renderClientes();
        if (typeof window.actualizarSelectClientes === 'function') window.actualizarSelectClientes();
      } else {
        toast('error', 'Error', 'No se pudo guardar el cliente.');
        if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="ph ph-check"></i> Guardar Cliente'; }
      }
    } catch (e) {
      console.error('[DGI] Error guardando cliente:', e);
      toast('error', 'Error', 'Error al guardar: ' + (e.message || e));
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="ph ph-check"></i> Guardar Cliente'; }
    }
  }

  // buscarEnDGI se mantiene como stub para compatibilidad con código existente
  async function buscarEnDGI(query) {
    console.info('[DGI] buscarEnDGI: API no accesible desde browser. Usar abrirModalDGI() para registro manual.');
    return [];
  }

  // ============================================================
  // EXPONER
  // ============================================================
  window.abrirModalDGI = abrirModalDGI;
  window.cerrarModalDGI = cerrarModalDGI;
  window.buscarEnDGI = buscarEnDGI;

})(window, document);
