(function () {
    const CHICAGO_CENTER = [41.8781, -87.6298];
    const CHICAGO_NEIGHBORHOODS_GEOJSON = 'https://raw.githubusercontent.com/blackmad/neighborhoods/master/chicago.geojson';
    const TEAM_KEY = 'catchme-team-runs-v4';
    const FREE_KEY = 'catchme-free-runs-v4';
    const MAP_STYLE_KEY = 'catchme-map-style';
    const MAX_ACCEPTABLE_ACCURACY_METERS = 20;
    const MAX_RUN_SPEED_MPS = 8.5;

    const MAP_STYLES = {
        streets: { label: 'Streets', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap contributors' },
        outdoors: { label: 'Outdoors', url: 'https://tile.thunderforest.com/outdoors/{z}/{x}/{y}.png?apikey=8f4c3d5b111c4e2ab0d0c61b6d4f17c5', attr: '&copy; Thunderforest, OSM' },
        light: { label: 'Light', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', attr: '&copy; CARTO, OSM' },
        dark: { label: 'Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '&copy; CARTO, OSM' }
    };

    const state = {
        mode: 'free', color: '#f43f5e', map: null, currentTileLayer: null, neighborhoodsLayer: null,
        claimsLayer: null, liveLayer: null, runnerLine: null, runWatchId: null, runPath: [], runSamples: [],
        freeClaims: [], teamClaims: [], cityUnion: null, cityArea: 0, unsubscribeClaims: null,
        unsubscribePresence: null, liveMarkers: new Map(), distanceUnits: localStorage.getItem('catchme-distance-units') || 'km',
        mapStyle: localStorage.getItem(MAP_STYLE_KEY) || 'streets', totalDistanceKm: 0, lastAccepted: null
    };
    const ui = {};
    const fbReady = () => !!(window.firebaseServices && window.currentUser);
    const uid = () => window.currentUser?.uid || 'guest';

    const toArea = (m2) => state.distanceUnits === 'mi' ? `${(m2 / 2589988.110336).toFixed(2)} mi²` : `${(m2 / 1000000).toFixed(2)} km²`;
    const toDist = (km) => state.distanceUnits === 'mi' ? `${(km * 0.621371).toFixed(2)} mi` : `${km.toFixed(2)} km`;
    const setMessage = (m) => { ui.message.textContent = m; };

    function loadClaims() {
        try { state.freeClaims = JSON.parse(localStorage.getItem(FREE_KEY) || '[]'); } catch { state.freeClaims = []; }
        try { state.teamClaims = JSON.parse(localStorage.getItem(TEAM_KEY) || '[]'); } catch { state.teamClaims = []; }
    }
    function saveClaims() {
        localStorage.setItem(FREE_KEY, JSON.stringify(state.freeClaims.slice(-800)));
        localStorage.setItem(TEAM_KEY, JSON.stringify(state.teamClaims.slice(-2000)));
    }
    const claims = () => state.mode === 'free' ? state.freeClaims : state.teamClaims;

    function setMapStyle(styleKey) {
        const style = MAP_STYLES[styleKey] || MAP_STYLES.streets;
        state.mapStyle = styleKey;
        localStorage.setItem(MAP_STYLE_KEY, styleKey);
        if (state.currentTileLayer) state.map.removeLayer(state.currentTileLayer);
        state.currentTileLayer = L.tileLayer(style.url, { maxZoom: 20, attribution: style.attr });
        state.currentTileLayer.addTo(state.map);
    }

    function pointsFormula(claimArea, stolenArea) {
        return Math.max(10, Math.round(claimArea / 500)) + Math.round(stolenArea / 350);
    }
    function updatePointExplanation(lastPoints = null) {
        const p = lastPoints === null ? '' : `Last capture: ${lastPoints} pts. `;
        ui.points.textContent = `${p}Points = 1 per 500m² captured + 1 bonus per 350m² stolen. GPS only (no manual drawing).`;
    }

    function setMode(mode) {
        state.mode = mode;
        ui.freeBtn.classList.toggle('active', mode === 'free');
        ui.teamBtn.classList.toggle('active', mode === 'team');
        renderClaims();
        updateProgress();
    }

    async function loadNeighborhoods() {
        const res = await fetch(CHICAGO_NEIGHBORHOODS_GEOJSON);
        const geo = await res.json();
        state.neighborhoodsLayer = L.geoJSON(geo, {
            style: (f) => ({ fillColor: `hsl(${((f.properties?.name || '').length * 47) % 360},56%,76%)`, fillOpacity: 0.4, color: '#334155', weight: 1 }),
            onEachFeature: (f, layer) => layer.bindTooltip(f.properties?.name || 'Neighborhood', { sticky: true })
        }).addTo(state.map);
        let union = null;
        for (const f of geo.features) { try { union = union ? turf.union(turf.featureCollection([union, f])) : f; } catch {} }
        state.cityUnion = union; state.cityArea = union ? turf.area(union) : 1;
        state.map.fitBounds(state.neighborhoodsLayer.getBounds(), { padding: [12, 12] });
    }

    function renderClaims() {
        state.claimsLayer.clearLayers();
        claims().forEach((c) => L.geoJSON(c.geojson, { style: { fillColor: c.color, fillOpacity: c.owner === uid() ? 0.58 : 0.3, color: c.color, weight: 2 } })
            .bindPopup(`<strong>${c.name || 'Unnamed Capture'}</strong><br>${c.ownerName || 'Runner'} · ${toArea(c.area)} · ${c.points || 0} pts`).addTo(state.claimsLayer));
    }

    function updateProgress() {
        const all = claims();
        const total = all.reduce((s, c) => s + (c.area || 0), 0);
        const mine = all.filter((c) => c.owner === uid()).reduce((s, c) => s + (c.area || 0), 0);
        ui.progress.textContent = `Chicago progression · ${state.mode === 'free' ? 'Free' : 'Team'} ${Math.min(100, (total / state.cityArea) * 100).toFixed(2)}% · You ${Math.min(100, (mine / state.cityArea) * 100).toFixed(2)}%`;
    }

    function closeEnough(a, b) { return turf.distance(turf.point(a), turf.point(b), { units: 'kilometers' }) <= 0.05; }
    function buildClosedPolygon(path) {
        if (path.length < 7 || !closeEnough(path[0], path[path.length - 1])) return null;
        const poly = turf.polygon([[...path, path[0]]]);
        return turf.area(poly) < 2500 ? null : poly;
    }
    function clipToChicago(poly) { try { return turf.intersect(turf.featureCollection([state.cityUnion, poly])); } catch { return null; } }

    function shouldAcceptSample(last, curr) {
        if (curr.accuracy > MAX_ACCEPTABLE_ACCURACY_METERS) return { ok: false, reason: `GPS ±${curr.accuracy.toFixed(2)}m too noisy` };
        if (!last) return { ok: true, km: 0 };
        const km = turf.distance(turf.point(last.point), turf.point(curr.point), { units: 'kilometers' });
        const dt = Math.max(1, (curr.ts - last.ts) / 1000);
        const mps = (km * 1000) / dt;
        if (mps > MAX_RUN_SPEED_MPS) return { ok: false, reason: 'GPS jump filtered' };
        if (km < 0.002) return { ok: false, reason: 'Micro-jitter filtered' };
        return { ok: true, km };
    }

    async function publishPresence(sample, running) {
        if (!fbReady()) return;
        const fb = window.firebaseServices;
        await fb.setDoc(fb.doc(fb.db, 'catchmePresence', uid()), {
            uid: uid(), name: window.currentUser.displayName || 'Runner', mode: state.mode, color: state.color, running,
            lat: sample ? sample.point[1] : null, lon: sample ? sample.point[0] : null, accuracy: sample?.accuracy || null,
            updatedAt: fb.serverTimestamp()
        }, { merge: true });
    }

    async function saveClaim(claim) {
        if (!fbReady()) return;
        const fb = window.firebaseServices;
        await fb.addDoc(fb.collection(fb.db, 'catchmeClaims'), claim);
    }

    async function finalizeCapture(clipped) {
        const captureName = (window.prompt('Name this capture area:', `Run ${new Date().toLocaleTimeString()}`) || '').trim() || 'Unnamed Capture';
        const next = [];
        let stolenArea = 0;
        for (const c of claims()) {
            if (c.owner === uid()) { next.push(c); continue; }
            try {
                const overlap = turf.intersect(turf.featureCollection([c.geojson, clipped]));
                if (!overlap) { next.push(c); continue; }
                stolenArea += turf.area(overlap);
                const remaining = turf.difference(turf.featureCollection([c.geojson, clipped]));
                if (remaining) next.push({ ...c, geojson: remaining, area: turf.area(remaining) });
            } catch { next.push(c); }
        }
        const area = turf.area(clipped);
        const points = pointsFormula(area, stolenArea);
        const newClaim = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, name: captureName, owner: uid(), ownerName: window.currentUser?.displayName || 'Runner', color: state.color, mode: state.mode, geojson: clipped, area, stolenArea, points, createdAt: new Date().toISOString() };
        next.push(newClaim);
        if (state.mode === 'free') state.freeClaims = next; else state.teamClaims = next;
        saveClaims();
        await saveClaim(newClaim);
        updatePointExplanation(points);
    }

    async function onPosition(pos) {
        const sample = { point: [pos.coords.longitude, pos.coords.latitude], accuracy: pos.coords.accuracy || 999, ts: pos.timestamp || Date.now() };
        const gate = shouldAcceptSample(state.lastAccepted, sample);
        if (!gate.ok) { setMessage(`Tracking... ${gate.reason}. Keep moving in open sky.`); return; }

        state.lastAccepted = sample;
        state.runSamples.push(sample);
        state.runPath.push(sample.point);
        state.totalDistanceKm += gate.km || 0;
        state.runnerLine.setLatLngs(state.runPath.map((p) => [p[1], p[0]]));
        await publishPresence(sample, true);

        const candidate = buildClosedPolygon(state.runPath);
        if (!candidate) {
            setMessage(`Tracking run · ${state.runPath.length} accepted pts · ${toDist(state.totalDistanceKm)} · accuracy ±${sample.accuracy.toFixed(2)}m`);
            return;
        }
        const clipped = clipToChicago(candidate);
        if (!clipped || turf.area(clipped) < 2500) { setMessage('Loop closed but did not capture a valid Chicago area.'); stopRun(false); return; }

        await finalizeCapture(clipped);
        renderClaims();
        updateProgress();
        setMessage(`Loop complete and saved: ${toArea(turf.area(clipped))}.`);
        stopRun(false);
    }

    function onPositionError(err) { setMessage(`GPS error (${err.code}). Enable precise location + disable battery saver.`); stopRun(false); }

    function startRun() {
        if (!navigator.geolocation || state.runWatchId !== null) return;
        state.runPath = []; state.runSamples = []; state.totalDistanceKm = 0; state.lastAccepted = null; state.runnerLine.setLatLngs([]);
        state.runWatchId = navigator.geolocation.watchPosition(onPosition, onPositionError, { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 });
        ui.startRunBtn.disabled = true; ui.stopRunBtn.disabled = false;
        setMessage('Run started. For best precision: wait for stable GPS, keep open sky view, and avoid tunnels.');
    }

    function stopRun(showMsg = true) {
        if (state.runWatchId !== null) navigator.geolocation.clearWatch(state.runWatchId);
        state.runWatchId = null; publishPresence(null, false);
        ui.startRunBtn.disabled = false; ui.stopRunBtn.disabled = true;
        state.runPath = []; state.runSamples = []; state.totalDistanceKm = 0; state.lastAccepted = null; state.runnerLine.setLatLngs([]);
        if (showMsg) setMessage('Run stopped.');
    }

    function subscribeLive() {
        if (!fbReady()) return;
        const fb = window.firebaseServices;
        state.unsubscribeClaims?.(); state.unsubscribePresence?.();
        state.unsubscribeClaims = fb.onSnapshot(fb.collection(fb.db, 'catchmeClaims'), (snap) => {
            const team = []; snap.forEach((d) => { const data = d.data(); if (data.mode === 'team') team.push(data); });
            state.teamClaims = team; saveClaims(); if (state.mode === 'team') { renderClaims(); updateProgress(); }
        });
        state.unsubscribePresence = fb.onSnapshot(fb.collection(fb.db, 'catchmePresence'), (snap) => {
            state.liveLayer.clearLayers();
            snap.forEach((d) => {
                const r = d.data();
                if (!r || r.uid === uid() || !r.running || !r.lat || !r.lon) return;
                L.circleMarker([r.lat, r.lon], { radius: 6, color: r.color || '#0ea5e9', fillOpacity: 0.9 }).bindTooltip(`${r.name || 'Runner'} · ±${(r.accuracy || 0).toFixed(1)}m`).addTo(state.liveLayer);
            });
        });
    }

    async function bootstrap() {
        if (state.map) return;
        ui.freeBtn = document.getElementById('catchme-free'); ui.teamBtn = document.getElementById('catchme-team');
        ui.colorInput = document.getElementById('catchme-color'); ui.units = document.getElementById('catchme-units');
        ui.style = document.getElementById('catchme-style'); ui.message = document.getElementById('catchme-message');
        ui.progress = document.getElementById('catchme-progress'); ui.points = document.getElementById('catchme-points');
        ui.startRunBtn = document.getElementById('catchme-start-run'); ui.stopRunBtn = document.getElementById('catchme-stop-run');

        state.map = L.map('catchme-map', { zoomControl: false }).setView(CHICAGO_CENTER, 12);
        L.control.zoom({ position: 'bottomright' }).addTo(state.map);
        setMapStyle(state.mapStyle);
        state.claimsLayer = L.layerGroup().addTo(state.map);
        state.liveLayer = L.layerGroup().addTo(state.map);
        state.runnerLine = L.polyline([], { color: state.color, weight: 4 }).addTo(state.map);

        loadClaims(); await loadNeighborhoods(); renderClaims(); updateProgress(); updatePointExplanation();
        ui.freeBtn.onclick = () => setMode('free'); ui.teamBtn.onclick = () => setMode('team');
        ui.colorInput.oninput = (e) => { state.color = e.target.value; state.runnerLine.setStyle({ color: state.color }); };
        ui.units.value = state.distanceUnits;
        ui.units.onchange = (e) => { state.distanceUnits = e.target.value; localStorage.setItem('catchme-distance-units', state.distanceUnits); renderClaims(); updateProgress(); updatePointExplanation(); };
        ui.style.value = state.mapStyle;
        ui.style.onchange = (e) => setMapStyle(e.target.value);
        ui.startRunBtn.onclick = startRun; ui.stopRunBtn.onclick = () => stopRun(true);
        subscribeLive(); setMode('free');
    }

    window.initCatchMe = async function initCatchMe(reset = false) {
        await bootstrap();
        if (reset) { stopRun(false); state.freeClaims = []; state.teamClaims = []; saveClaims(); renderClaims(); updateProgress(); }
        setTimeout(() => state.map?.invalidateSize(), 100);
    };
})();
