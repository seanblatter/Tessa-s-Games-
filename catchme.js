(function () {
  const CHICAGO_CENTER = [41.8781, -87.6298];
  const CHICAGO_GEOJSON = 'https://raw.githubusercontent.com/blackmad/neighborhoods/master/chicago.geojson';
  const state = {
    map: null,
    mode: 'free',
    activity: 'run',
    color: '#f43f5e',
    units: localStorage.getItem('catchme-distance-units') || 'mi',
    runWatchId: null,
    runPath: [],
    totalKm: 0,
    startTs: null,
    timer: null,
    claimsLayer: null,
    routeLine: null,
    freeClaims: [],
    teamClaims: [],
    followUser: true,
    profileOpen: false
  };
  const ui = {};

  const kmToUnit = (km) => state.units === 'mi' ? km * 0.621371 : km;
  const distUnitLabel = () => (state.units === 'mi' ? 'mi' : 'km');
  const formatTime = (ms) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  };

  function getClaims() { return state.mode === 'free' ? state.freeClaims : state.teamClaims; }

  function setMessage(text) { ui.message.textContent = text; }

  function setStatsVisible(visible) {
    ui.statsCard.style.display = visible ? 'grid' : 'none';
  }

  function updateStats() {
    const elapsed = state.startTs ? Date.now() - state.startTs : 0;
    ui.runtime.textContent = formatTime(elapsed);
    ui.distance.textContent = kmToUnit(state.totalKm).toFixed(2);
    const hours = elapsed / 3600000;
    const spd = hours > 0 ? kmToUnit(state.totalKm) / hours : 0;
    ui.speed.textContent = spd.toFixed(1);
  }

  function renderSavedAreas() {
    const myClaims = getClaims().slice(-8).reverse();
    ui.savedAreas.innerHTML = myClaims.length
      ? myClaims.map((c) => `<div class="saved-area-pill">${c.name} · ${(c.area / 1000000).toFixed(2)} km²</div>`).join('')
      : '<div class="saved-area-pill">No captures yet.</div>';
  }

  function renderClaims() {
    state.claimsLayer.clearLayers();
    getClaims().forEach((c) => {
      L.geoJSON(c.geojson, { style: { fillColor: c.color, color: c.color, fillOpacity: 0.42, weight: 2 } })
        .bindPopup(`<strong>${c.name}</strong><br>${(c.area / 1000000).toFixed(2)} km²`)
        .addTo(state.claimsLayer);
    });
    renderSavedAreas();
  }

  function setMode(mode) {
    if (state.runWatchId !== null) return;
    state.mode = mode;
    ui.freeBtn.classList.toggle('active', mode === 'free');
    ui.teamBtn.classList.toggle('active', mode === 'team');
    renderClaims();
  }

  function toggleProfileSheet() {
    state.profileOpen = !state.profileOpen;
    ui.profileSheet.style.display = state.profileOpen ? 'grid' : 'none';
  }

  function completeLoop() {
    if (state.runPath.length < 8) return;
    const loopGap = turf.distance(turf.point(state.runPath[0]), turf.point(state.runPath[state.runPath.length - 1]), { units: 'kilometers' });
    if (loopGap > 0.05) return;

    const poly = turf.polygon([[...state.runPath, state.runPath[0]]]);
    const area = turf.area(poly);
    if (area < 2000) return;

    const name = (window.prompt('Name your captured area:', `Capture ${new Date().toLocaleTimeString()}`) || '').trim() || 'Unnamed Capture';
    getClaims().push({ name, color: state.color, geojson: poly, area, createdAt: Date.now() });
    renderClaims();
    setMessage(`Saved “${name}” · ${(area / 1000000).toFixed(2)} km² · ${ui.runtime.textContent} · ${ui.distance.textContent} ${distUnitLabel()}`);
    stopRun(false);
  }

  function onPosition(position) {
    const current = [position.coords.longitude, position.coords.latitude];
    const last = state.runPath[state.runPath.length - 1];
    if (last) {
      const stepKm = turf.distance(turf.point(last), turf.point(current), { units: 'kilometers' });
      if (stepKm > 0.0015 && stepKm < 0.2) state.totalKm += stepKm;
    }
    state.runPath.push(current);
    state.routeLine.setLatLngs(state.runPath.map((p) => [p[1], p[0]]));

    if (state.followUser) {
      state.map.setView([current[1], current[0]], 16, { animate: true, duration: 0.5 });
    }

    updateStats();
    setMessage(`Tracking ${state.activity} · ${ui.distance.textContent} ${distUnitLabel()} · ±${(position.coords.accuracy || 0).toFixed(1)}m`);
    completeLoop();
  }

  function onPositionError(err) {
    setMessage(`GPS error ${err.code}. Please enable precise location.`);
    stopRun(false);
  }

  function startRun() {
    if (state.runWatchId !== null) return;
    state.runPath = [];
    state.totalKm = 0;
    state.startTs = Date.now();
    updateStats();
    setStatsVisible(true);
    ui.startBtn.classList.add('recording');
    ui.startBtn.innerHTML = '⏹️<small>Stop</small>';
    ui.freeBtn.disabled = true;
    ui.teamBtn.disabled = true;
    ui.activityBtn.disabled = true;

    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(updateStats, 1000);

    state.runWatchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 8000
    });
    setMessage(`Started ${state.activity}. Close the loop to capture.`);
  }

  function stopRun(showStoppedMessage = true) {
    if (state.runWatchId !== null) navigator.geolocation.clearWatch(state.runWatchId);
    state.runWatchId = null;
    if (state.timer) clearInterval(state.timer);
    state.timer = null;

    ui.startBtn.classList.remove('recording');
    ui.startBtn.innerHTML = '▶️<small>Start</small>';
    ui.freeBtn.disabled = false;
    ui.teamBtn.disabled = false;
    ui.activityBtn.disabled = false;
    setStatsVisible(false);

    if (showStoppedMessage) {
      setMessage(`Run ended · ${ui.runtime.textContent} · ${ui.distance.textContent} ${distUnitLabel()}`);
    }
  }

  async function loadNeighborhoodOverlay() {
    const res = await fetch(CHICAGO_GEOJSON);
    const geo = await res.json();
    L.geoJSON(geo, {
      style: { color: '#334155', weight: 1, fillOpacity: 0.25 },
      onEachFeature: (f, layer) => layer.bindTooltip(f.properties?.name || 'Neighborhood')
    }).addTo(state.map);
  }

  async function initOnce() {
    if (state.map) return;
    ui.freeBtn = document.getElementById('catchme-free');
    ui.teamBtn = document.getElementById('catchme-team');
    ui.activityBtn = document.getElementById('catchme-activity');
    ui.startBtn = document.getElementById('catchme-start-run');
    ui.profileBtn = document.getElementById('catchme-profile');
    ui.profileSheet = document.getElementById('catchme-profile-sheet');
    ui.username = document.getElementById('catchme-username');
    ui.colorInput = document.getElementById('catchme-color');
    ui.savedAreas = document.getElementById('catchme-saved-areas');
    ui.runtime = document.getElementById('catchme-runtime');
    ui.distance = document.getElementById('catchme-distance');
    ui.speed = document.getElementById('catchme-speed');
    ui.statsCard = document.querySelector('.catchme-stats-card');
    ui.units = document.getElementById('catchme-units');
    ui.style = document.getElementById('catchme-style');
    ui.message = document.getElementById('catchme-message');
    ui.centerBtn = document.getElementById('catchme-center-map');
    ui.drawer = document.getElementById('catchme-drawer');
    ui.drawerToggle = document.getElementById('catchme-drawer-toggle');

    state.map = L.map('catchme-map', { zoomControl: false }).setView(CHICAGO_CENTER, 14);
    L.control.zoom({ position: 'bottomright' }).addTo(state.map);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(state.map);
    state.claimsLayer = L.layerGroup().addTo(state.map);
    state.routeLine = L.polyline([], { color: state.color, weight: 5 }).addTo(state.map);
    await loadNeighborhoodOverlay();

    ui.freeBtn.onclick = () => setMode('free');
    ui.teamBtn.onclick = () => setMode('team');
    ui.activityBtn.onclick = () => {
      if (state.runWatchId !== null) return;
      state.activity = state.activity === 'run' ? 'walk' : 'run';
      ui.activityBtn.innerHTML = state.activity === 'run' ? '🏃<small>Run</small>' : '🚶<small>Walk</small>';
    };
    ui.startBtn.onclick = () => state.runWatchId === null ? startRun() : stopRun(true);
    ui.profileBtn.onclick = toggleProfileSheet;
    ui.colorInput.oninput = (e) => {
      state.color = e.target.value;
      state.routeLine.setStyle({ color: state.color });
      ui.profileBtn.style.borderColor = state.color;
      ui.profileBtn.style.boxShadow = `0 0 0 3px ${state.color}33`;
    };
    ui.units.value = state.units;
    ui.units.onchange = (e) => { state.units = e.target.value; localStorage.setItem('catchme-distance-units', state.units); updateStats(); };
    ui.centerBtn.onclick = () => { state.followUser = true; state.map.setView(CHICAGO_CENTER, 14); };
    ui.drawerToggle.onclick = () => ui.drawer.classList.toggle('collapsed');

    setStatsVisible(false);
    updateStats();
    renderSavedAreas();
  }

  window.initCatchMe = async function initCatchMe() {
    await initOnce();
    setTimeout(() => state.map.invalidateSize(), 120);
  };
})();
