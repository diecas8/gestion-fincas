// productor.js - Versión Corregida y Limpia
console.log('✅ productor.js cargado correctamente');

let map, drawnItems, currentDrawControl = null;
let fincas = [], lotes = [];
let fincaSeleccionada = null;
let capaFincas = null, capaLotes = null;
let currentUser = null, propietario = null;
let modal = null;

const basemaps = {
  googleSat: L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', { subdomains: ['mt0','mt1','mt2','mt3'], attribution: 'Google' }),
  esriSat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: 'Esri' }),
  topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { attribution: 'OpenTopoMap' }),
  osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: 'OSM' })
};
let currentBasemap = 'googleSat';

async function initProductorApp() {
  currentUser = await getCurrentUser();
  if (!currentUser) {
    window.location.href = 'index.html';
    return;
  }
  modal = document.getElementById('modal');
  await cargarPropietario();
  initMap();
}

async function cargarPropietario() {
  const { data, error } = await sb.from('propietarios').select('*').eq('user_id', currentUser.id).maybeSingle();
  if (error) toast('Error cargando propietario: ' + error.message);
  propietario = data;
  
  const div = document.getElementById('propietarioInfo');
  if (propietario) {
    div.innerHTML = `<strong>${propietario.nombre_completo}</strong><br>${propietario.cedula}<br>${propietario.telefono}<br>${propietario.correo}`;
  } else {
    div.innerHTML = 'Completa tus datos personales';
  }
}

function initMap() {
  map = L.map('map').setView([1.5, -75.0], 9);
  basemaps.googleSat.addTo(map);
  drawnItems = L.featureGroup().addTo(map);

  // Selector de Mapas Base
  const container = document.getElementById('basemapSelector');
  if (container) {
    container.innerHTML = `
      <button class="btn-primary btn-outline" data-bm="googleSat">🛰️ Satélite</button>
      <button class="btn-primary btn-outline" data-bm="esriSat">🌍 ESRI</button>
      <button class="btn-primary btn-outline" data-bm="topo">🏔️ Topo</button>
      <button class="btn-primary btn-outline" data-bm="osm">🗺️ OSM</button>
    `;

    document.querySelectorAll('[data-bm]').forEach(btn => {
      btn.onclick = () => {
        map.removeLayer(basemaps[currentBasemap]);
        currentBasemap = btn.dataset.bm;
        basemaps[currentBasemap].addTo(map);
      };
    });
  }

  cargarFincas();
}

async function cargarFincas() {
  const { data, error } = await sb.from('fincas').select('*').eq('user_id', currentUser.id).order('id');
  if (error) toast('Error cargando fincas: ' + error.message);
  fincas = data || [];
  renderFincasList();
  if (fincas.length && !fincaSeleccionada) seleccionarFinca(fincas[0]);
}

function renderFincasList() {
  const container = document.getElementById('fincasList');
  if (!container) return;
  
  if (!fincas.length) { 
    container.innerHTML = '<small style="color:#94a3b8;">Sin fincas. Crea una.</small>'; 
    return; 
  }
  
  container.innerHTML = fincas.map(f => `
    <div class="finca-card" data-id="${f.id}">
      <strong>🏡 ${f.nombre}</strong><br>
      ${f.area_total_ha ? f.area_total_ha + ' ha' : ''}
      <br><small>${f.ubicacion || ''}</small>
    </div>
  `).join('');

  document.querySelectorAll('.finca-card').forEach(card => {
    card.onclick = () => seleccionarFinca(fincas.find(f => f.id == card.dataset.id));
  });
}

async function seleccionarFinca(finca) {
  fincaSeleccionada = finca;
  document.getElementById('fincaActualNombre').innerText = finca.nombre;
  document.getElementById('lotesSection').style.display = 'block';
  await cargarLotes(finca.id);
  cargarCapasMapa();
}

async function cargarLotes(fincaId) {
  const { data, error } = await sb.from('lotes').select('*').eq('finca_id', fincaId).eq('user_id', currentUser.id);
  if (error) toast('Error cargando lotes: ' + error.message);
  lotes = data || [];
  renderLotesList();
}

function renderLotesList() {
  const container = document.getElementById('lotesList');
  if (!container) return;

  if (!lotes.length) { 
    container.innerHTML = '<small style="color:#94a3b8;">Sin lotes. Dibuja el primero.</small>'; 
    return; 
  }
  
  container.innerHTML = lotes.map(l => `
    <div class="lote-card" data-id="${l.id}">
      <strong>${l.nombre}</strong> 
      <span style="background:#e2e8f0; padding:2px 8px; border-radius:20px;">${l.cultivo || 'General'}</span>
      <br> ${l.area_ha ? l.area_ha.toFixed(2)+' ha' : ''} ${l.variedad ? '· '+l.variedad : ''}
    </div>
  `).join('');
}

function cargarCapasMapa() {
  if (capaFincas) map.removeLayer(capaFincas);
  if (capaLotes) map.removeLayer(capaLotes);
  if (!fincaSeleccionada) return;

  if (fincaSeleccionada.geom) {
    let geom = fincaSeleccionada.geom;
    if (typeof geom === 'string') geom = JSON.parse(geom);
    capaFincas = L.geoJSON({ type: 'Feature', geometry: geom }, { 
      style: { color: '#1565c0', weight: 3, fillOpacity: 0.1 } 
    }).addTo(map);
  }

  const features = [];
  lotes.forEach(l => {
    if (!l.geom) return;
    let geom = l.geom;
    if (typeof geom === 'string') geom = JSON.parse(geom);
    let color = l.cultivo === 'cafe' ? '#d97706' : (l.cultivo === 'platano' ? '#fbbf24' : '#10b981');
    features.push({ type: 'Feature', geometry: geom, properties: { ...l, color } });
  });

  if (features.length) {
    capaLotes = L.geoJSON({ type: 'FeatureCollection', features }, {
      style: (f) => ({ color: f.properties.color, weight: 2.5, fillOpacity: 0.2 }),
      onEachFeature: (f, l) => l.bindPopup(`
        <b>${f.properties.nombre}</b><br>
        ${f.properties.cultivo}<br>
        ${f.properties.area_ha ? f.properties.area_ha.toFixed(2)+' ha' : ''}
      `)
    }).addTo(map);
    map.fitBounds(capaLotes.getBounds());
  }
}

function iniciarDibujo(callback) {
  if (currentDrawControl) {
    try { map.removeControl(currentDrawControl); } catch (e) {}
    currentDrawControl = null;
  }
  
  currentDrawControl = new L.Control.Draw({
    position: 'topright',
    draw: { 
      polygon: { allowIntersection: false, shapeOptions: { color: '#1565c0', weight: 3 } }, 
      polyline: false, rectangle: false, circle: false, marker: false 
    },
    edit: false
  });
  
  map.addControl(currentDrawControl);
  
  map.once(L.Draw.Event.CREATED, (e) => {
    const layer = e.layer;
    const geom = layer.toGeoJSON().geometry;
    const areaHa = turf.area(geom) / 10000;
    
    try { map.removeControl(currentDrawControl); } catch (e) {}
    currentDrawControl = null;
    
    callback(geom, areaHa, layer);
  });
}

// --- FORMULARIO FINCAS ---
function mostrarFormularioFinca(fincaExistente, geom, areaHa, layerTemp) {
  const isEdit = !!fincaExistente;
  document.getElementById('modalTitle').innerText = isEdit ? 'Editar finca' : 'Nueva finca';
  
  document.getElementById('modalBody').innerHTML = `
    <input id="fincaNombre" class="modal-input" placeholder="Nombre de la finca" value="${fincaExistente?.nombre || ''}">
    <input id="fincaUbicacion" class="modal-input" placeholder="Ubicación" value="${fincaExistente?.ubicacion || ''}">
    <input id="fincaArea" class="modal-input" type="number" step="0.01" placeholder="Área (ha)" value="${fincaExistente?.area_total_ha || areaHa.toFixed(2)}">
    <textarea id="fincaDesc" class="modal-input" placeholder="Descripción">${fincaExistente?.descripcion || ''}</textarea>
  `;
  
  modal.style.display = 'flex';

  const guardar = async () => {
    const nombre = document.getElementById('fincaNombre').value.trim();
    if (!nombre) { toast('Nombre requerido'); return; }
    
    const data = {
      nombre,
      ubicacion: document.getElementById('fincaUbicacion').value,
      area_total_ha: parseFloat(document.getElementById('fincaArea').value) || null,
      descripcion: document.getElementById('fincaDesc').value,
      propietario_id: propietario ? propietario.id : null,
      user_id: currentUser.id
    };

    if (geom) {
      // Aseguramos formato MultiPolygon para consistencia
      const geomMulti = geom.type === 'Polygon' ? { type: 'MultiPolygon', coordinates: [geom.coordinates] } : geom;
      data.geom = geomMulti;
    }

    const { error } = isEdit 
      ? await sb.from('fincas').update(data).eq('id', fincaExistente.id)
      : await sb.from('fincas').insert([data]);
    
    if (error) toast('Error: ' + error.message);
    else {
      toast(isEdit ? 'Finca actualizada' : 'Finca guardada');
      if (layerTemp) layerTemp.addTo(drawnItems);
      modal.style.display = 'none';
      await cargarFincas();
    }
  };

  document.getElementById('modalConfirm').onclick = guardar;
  document.getElementById('modalCancel').onclick = () => { 
    modal.style.display = 'none'; 
    if (layerTemp) layerTemp.remove(); 
  };
}

// --- FORMULARIO LOTES ---
function mostrarFormularioLote(geom, areaHa, layerTemp) {
  document.getElementById('modalTitle').innerText = 'Nuevo Lote';
  
  document.getElementById('modalBody').innerHTML = `
    <input id="loteNombre" class="modal-input" placeholder="Nombre del lote (ej: Lote 1)">
    <select id="loteCultivo" class="modal-input" style="cursor:pointer;">
      <option value="">Seleccionar cultivo...</option>
      <option value="cafe">☕ Café</option>
      <option value="platano">🍌 Plátano</option>
      <option value="cacao">🍫 Cacao</option>
      <option value="ganado">🐄 Ganadería</option>
      <option value="otros">🌱 Otros</option>
    </select>
    <input id="loteVariedad" class="modal-input" placeholder="Variedad (ej: Castillo)">
    <input id="loteArea" class="modal-input" type="number" step="0.01" placeholder="Área (ha)" value="${areaHa.toFixed(2)}">
    <textarea id="loteNotas" class="modal-input" placeholder="Notas adicionales"></textarea>
  `;
  
  modal.style.display = 'flex';

  const guardar = async () => {
    const nombre = document.getElementById('loteNombre').value.trim();
    if (!nombre) { toast('Nombre del lote requerido'); return; }
    
    const data = {
      nombre,
      cultivo: document.getElementById('loteCultivo').value,
      variedad: document.getElementById('loteVariedad').value,
      area_ha: parseFloat(document.getElementById('loteArea').value) || areaHa,
      notas: document.getElementById('loteNotas').value,
      finca_id: fincaSeleccionada.id,
      user_id: currentUser.id
    };

    if (geom) {
      const geomMulti = geom.type === 'Polygon' ? { type: 'MultiPolygon', coordinates: [geom.coordinates] } : geom;
      data.geom = geomMulti;
    }

    console.log('Enviando lote:', data); // Para depuración

    const { error } = await sb.from('lotes').insert([data]);
    
    if (error) {
      toast('Error al guardar lote: ' + error.message);
      console.error(error);
    } else {
      toast('Lote guardado correctamente');
      if (layerTemp) layerTemp.addTo(drawnItems);
      modal.style.display = 'none';
      await cargarLotes(fincaSeleccionada.id);
      cargarCapasMapa();
    }
  };

  document.getElementById('modalConfirm').onclick = guardar;
  document.getElementById('modalCancel').onclick = () => { 
    modal.style.display = 'none'; 
    if (layerTemp) layerTemp.remove(); 
  };
}

// --- EVENTOS ---
document.getElementById('editarPropietarioBtn').onclick = () => {
  document.getElementById('modalTitle').innerText = 'Mis datos';
  document.getElementById('modalBody').innerHTML = `
    <input id="propCedula" class="modal-input" placeholder="Cédula" value="${propietario?.cedula || ''}">
    <input id="propNombre" class="modal-input" placeholder="Nombre completo" value="${propietario?.nombre_completo || ''}">
    <input id="propTelefono" class="modal-input" placeholder="Teléfono" value="${propietario?.telefono || ''}">
    <input id="propCorreo" class="modal-input" placeholder="Correo electrónico" value="${propietario?.correo || currentUser.email}">
  `;
  
  modal.style.display = 'flex';

  const guardarProp = async () => {
    const data = {
      cedula: document.getElementById('propCedula').value,
      nombre_completo: document.getElementById('propNombre').value,
      telefono: document.getElementById('propTelefono').value,
      correo: document.getElementById('propCorreo').value,
      user_id: currentUser.id
    };

    const { error } = propietario
      ? await sb.from('propietarios').update(data).eq('id', propietario.id)
      : await sb.from('propietarios').insert([data]);

    if (error) toast('Error: ' + error.message);
    else toast(propietario ? 'Datos actualizados' : 'Datos guardados');
    
    modal.style.display = 'none';
    await cargarPropietario();
  };

  document.getElementById('modalConfirm').onclick = guardarProp;
  document.getElementById('modalCancel').onclick = () => modal.style.display = 'none';
};

document.getElementById('nuevaFincaBtn').onclick = () => {
  if (!propietario) { toast('Primero completa tus datos personales'); return; }
  iniciarDibujo((geom, areaHa, layer) => mostrarFormularioFinca(null, geom, areaHa, layer));
};

document.getElementById('nuevoLoteBtn').onclick = () => {
  if (!fincaSeleccionada) { toast('Selecciona una finca primero'); return; }
  iniciarDibujo((geom, areaHa, layer) => mostrarFormularioLote(geom, areaHa, layer));
};

// Evita error si el botón no existe en el HTML
const exportBtn = document.getElementById('exportarMapaBtn');
if (exportBtn) exportBtn.onclick = () => toast('Función de exportación en desarrollo');

document.getElementById('modalClose').onclick = () => {
  modal.style.display = 'none';
};

window.initProductorApp = initProductorApp;