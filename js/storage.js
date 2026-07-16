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
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error leyendo ' + key + ':', e);
    return [];
  }
}

function setData(key, data) {
  try {
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
  setData(key, data);
  return item;
}

function findItem(key, id) {
  var data = getData(key);
  for (var i = 0; i < data.length; i++) {
    if (data[i].id === id) return data[i];
  }
  return null;
}

function updateItem(key, id, changes) {
  var data = getData(key);

  for (var i = 0; i < data.length; i++) {
    if (data[i].id === id) {
      for (var prop in changes) {
        data[i][prop] = changes[prop];
      }
      setData(key, data);
      return true;
    }
  }

  return false;
}

function deleteItem(key, id) {
  var data = getData(key);
  var filtered = [];

  for (var i = 0; i < data.length; i++) {
    if (data[i].id !== id) filtered.push(data[i]);
  }

  setData(key, filtered);
  return true;
}
