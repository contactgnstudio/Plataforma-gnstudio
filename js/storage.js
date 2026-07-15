// ============================================================
// js/storage.js — LocalStorage utilities
// ============================================================

var STORAGE_KEYS = {
  SERVICIOS: 'gn_servicios',
  CLIENTES: 'gn_clientes',
  COTIZACIONES: 'gn_cotizaciones',
  PROYECTOS: 'gn_proyectos',
  GASTOS: 'gn_gastos',
  PAGOS: 'gn_pagos',
  TAREAS: 'gn_tareas'
};

function getData(key) {
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return [];
    var parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error leyendo ' + key + ':', e);
    return [];
  }
}

function setData(key, data) {
  try {
    if (!Array.isArray(data) && typeof data !== 'object') {
      throw new Error('Dato inválido para guardar en ' + key);
    }
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error guardando ' + key + ':', e);
    return false;
  }
}

function addItem(key, item) {
  var data = getData(key);
  data.push(item);
  return setData(key, data);
}

function findItem(key, id) {
  var data = getData(key);
  for (var i = 0; i < data.length; i++) {
    if (data[i] && data[i].id === id) {
      return data[i];
    }
  }
  return null;
}

function updateItem(key, id, changes) {
  var data = getData(key);

  for (var i = 0; i < data.length; i++) {
    if (data[i] && data[i].id === id) {
      for (var prop in changes) {
        if (Object.prototype.hasOwnProperty.call(changes, prop)) {
          data[i][prop] = changes[prop];
        }
      }
      return setData(key, data);
    }
  }

  return false;
}

function deleteItem(key, id) {
  var data = getData(key);
  var filtered = [];

  for (var i = 0; i < data.length; i++) {
    if (data[i] && data[i].id !== id) {
      filtered.push(data[i]);
    }
  }

  return setData(key, filtered);
}

function clearData(key) {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.error('Error eliminando ' + key + ':', e);
    return false;
  }
}

function resetearDatos() {
  var keys = Object.keys(STORAGE_KEYS);
  for (var i = 0; i < keys.length; i++) {
    clearData(STORAGE_KEYS[keys[i]]);
  }
  console.log('✅ Datos reiniciados');
}
