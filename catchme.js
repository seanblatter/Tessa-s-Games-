(function () {
    const CHICAGO_CENTER = [41.8781, -87.6298];
    const CHICAGO_NEIGHBORHOODS_GEOJSON = 'https://raw.githubusercontent.com/blackmad/neighborhoods/master/chicago.geojson';
    const TEAM_KEY = 'catchme-team-runs-v3';
    const FREE_KEY = 'catchme-free-runs-v3';

    const state = {
        mode: 'free',
        color: '#f43f5e',
        map: null,
        neighborhoodsLayer: null,
        claimsLayer: null,
        liveLayer: null,
        runnerLine: null,
        runWatchId: null,
        runPath: [],
        freeClaims: [],
        teamClaims: [],
        cityUnion: null,
        cityArea: 0,
        unsubscribeClaims: null,
        unsubscribePresence: null,
        liveMarkers: new Map(),
        distanceUnits: localStorage.getItem('catchme-distance-units') || 'km'
    };
    const ui = {};

    function firebaseReady() {
        return !!(window.firebaseServices && window.currentUser);
    }
    function userId() { return window.currentUser?.uid || 'guest'; }

    function loadClaims() {
        try { state.freeClaims = JSON.parse(localStorage.getItem(FREE_KEY) || '[]'); } catch { state.freeClaims = []; }
        try { state.teamClaims = JSON.parse(localStorage.getItem(TEAM_KEY) || '[]'); } catch { state.teamClaims = []; }
    }
    function saveClaims() {
        localStorage.setItem(FREE_KEY, JSON.stringify(state.freeClaims.slice(-500)));
        localStorage.setItem(TEAM_KEY, JSON.stringify(state.teamClaims.slice(-1500)));
    }
    function getClaims() { return state.mode === 'free' ? state.freeClaims : state.teamClaims; }
    function setMessage(text) { ui.message.textContent = text; }


    function formatArea(m2) {
        if (state.distanceUnits === 'mi') return `${(m2 / 2589988.110336).toFixed(2)} mi²`;
        return `${(m2 / 1000000).toFixed(2)} km²`;
    }

    function formatDistanceKm(km) {
        return state.distanceUnits === 'mi' ? `${(km * 0.621371).toFixed(2)} mi` : `${km.toFixed(2)} km`;
    }

    function explainPoints(claimArea, stolenArea) {
        const claimPoints = Math.max(10, Math.round(claimArea / 500));
        const stealPoints = Math.round(stolenArea / 350);
        return claimPoints + stealPoints;
    }

    function updatePointExplanation(lastPoints = null) {
        const prefix = lastPoints === null ? '' : `Last capture: ${lastPoints} pts. `;
        ui.points.textContent = `${prefix}Points: 1 point / 500m² captured + 1 bonus point / 350m² stolen. Area and distance shown in ${state.distanceUnits === 'mi' ? 'miles' : 'kilometers'}.`;
    }

    function setMode(mode) {
        state.mode = mode;
        ui.freeBtn.classList.toggle('active', mode === 'free');
        ui.teamBtn.classList.toggle('active', mode === 'team');
        renderClaims();
        updateProgress();
    }

    function randomNeighborhoodColor(name) {
        let h = 0; for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 360;
        return `hsl(${h}, 56%, 76%)`;
    }

    async function loadNeighborhoods() {
        const res = await fetch(CHICAGO_NEIGHBORHOODS_GEOJSON);
        const geo = await res.json();
        state.neighborhoodsLayer = L.geoJSON(geo, {
            style: (feature) => ({ fillColor: randomNeighborhoodColor(feature.properties?.name || 'Area'), fillOpacity: 0.5, color: '#334155', weight: 1 }),
            onEachFeature: (feature, layer) => layer.bindTooltip(feature.properties?.name || 'Neighborhood', { sticky: true })
        }).addTo(state.map);
        let union = null;
        for (const f of geo.features) {
            try { union = union ? turf.union(turf.featureCollection([union, f])) : f; } catch {}
        }
        state.cityUnion = union;
        state.cityArea = union ? turf.area(union) : 1;
        state.map.fitBounds(state.neighborhoodsLayer.getBounds(), { padding: [15, 15] });
    }

    function renderClaims() {
        state.claimsLayer.clearLayers();
        getClaims().forEach((claim) => {
            L.geoJSON(claim.geojson, {
                style: { fillColor: claim.color, fillOpacity: claim.owner === userId() ? 0.55 : 0.3, color: claim.color, weight: 2 }
            }).bindPopup(`${claim.ownerName || 'Runner'} · ${formatArea(claim.area)} · ${claim.points || 0} pts`).addTo(state.claimsLayer);
        });
    }

    function updateProgress() {
        const claims = getClaims();
        const totalCoverage = claims.reduce((sum, c) => sum + (c.area || 0), 0);
        const myCoverage = claims.filter((c) => c.owner === userId()).reduce((sum, c) => sum + (c.area || 0), 0);
        ui.progress.textContent = `Chicago progression · ${state.mode === 'free' ? 'Free' : 'Team'} total ${Math.min(100, Math.round((totalCoverage / state.cityArea) * 100))}% · You ${Math.min(100, Math.round((myCoverage / state.cityArea) * 100))}%`;
    }

    function closeEnough(a, b) { return turf.distance(turf.point(a), turf.point(b), { units: 'kilometers' }) <= 0.07; }
    function buildClosedPolygon(path) {
        if (path.length < 6 || !closeEnough(path[0], path[path.length - 1])) return null;
        const poly = turf.polygon([[...path, path[0]]]);
        return turf.area(poly) < 2500 ? null : poly;
    }
    function clipToChicago(poly) {
        try { return turf.intersect(turf.featureCollection([state.cityUnion, poly])); } catch { return null; }
    }

    async function publishPresence(point, isRunning) {
        if (!firebaseReady()) return;
        const fb = window.firebaseServices;
        const ref = fb.doc(fb.db, 'catchmePresence', userId());
        await fb.setDoc(ref, {
            uid: userId(),
            name: window.currentUser.displayName || 'Runner',
            mode: state.mode,
            color: state.color,
            running: isRunning,
            lat: point ? point[1] : null,
            lon: point ? point[0] : null,
            updatedAt: fb.serverTimestamp()
        }, { merge: true });
    }

    async function saveClaimToDb(claim) {
        if (!firebaseReady()) return;
        const fb = window.firebaseServices;
        await fb.addDoc(fb.collection(fb.db, 'catchmeClaims'), claim);
    }

    async function applyCapture(clipped) {
        const claims = getClaims();
        const next = [];
        let stolenArea = 0;
        for (const claim of claims) {
            if (claim.owner === userId()) { next.push(claim); continue; }
            try {
                const overlap = turf.intersect(turf.featureCollection([claim.geojson, clipped]));
                if (overlap) {
                    stolenArea += turf.area(overlap);
                    const remaining = turf.difference(turf.featureCollection([claim.geojson, clipped]));
                    if (remaining) next.push({ ...claim, geojson: remaining, area: turf.area(remaining) });
                } else next.push(claim);
            } catch { next.push(claim); }
        }
        const points = explainPoints(turf.area(clipped), stolenArea);
        const newClaim = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            owner: userId(), ownerName: window.currentUser?.displayName || 'Runner',
            color: state.color, mode: state.mode, geojson: clipped, area: turf.area(clipped),
            stolenArea, points, createdAt: new Date().toISOString()
        };
        next.push(newClaim);
        if (state.mode === 'free') state.freeClaims = next; else state.teamClaims = next;
        saveClaims();
        await saveClaimToDb(newClaim);
        updatePointExplanation(points);
    }

    async function onPosition(pos) {
        const point = [pos.coords.longitude, pos.coords.latitude];
        state.runPath.push(point);
        state.runnerLine.setLatLngs(state.runPath.map((p) => [p[1], p[0]]));
        await publishPresence(point, true);

        const candidate = buildClosedPolygon(state.runPath);
        if (!candidate) { const dist = turf.length(turf.lineString(state.runPath), { units: 'kilometers' });
            setMessage(`Tracking run... ${state.runPath.length} GPS points · ${formatDistanceKm(dist)} traveled.`); return; }
        const clipped = clipToChicago(candidate);
        if (!clipped || turf.area(clipped) < 2500) { setMessage('Loop closed but no valid Chicago area captured.'); stopRun(false); return; }

        await applyCapture(clipped);
        renderClaims();
        updateProgress();
        setMessage(`Loop complete. Area filled and saved. Captured ${formatArea(turf.area(clipped))}.`);
        stopRun(false);
    }
    function onPositionError(err) { setMessage(`GPS error (${err.code}). Enable precise location.`); stopRun(false); }

    function startRun() {
        if (!navigator.geolocation || state.runWatchId !== null) return;
        state.runPath = []; state.runnerLine.setLatLngs([]);
        state.runWatchId = navigator.geolocation.watchPosition(onPosition, onPositionError, { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 });
        ui.startRunBtn.disabled = true; ui.stopRunBtn.disabled = false;
        setMessage('Run started. Physically run and close your loop to fill an area.');
    }
    function stopRun(showMsg = true) {
        if (state.runWatchId !== null) navigator.geolocation.clearWatch(state.runWatchId);
        state.runWatchId = null;
        publishPresence(null, false);
        ui.startRunBtn.disabled = false; ui.stopRunBtn.disabled = true;
        state.runPath = []; state.runnerLine.setLatLngs([]);
        if (showMsg) setMessage('Run stopped.');
    }

    function renderPresenceDoc(docData) {
        if (!docData || docData.uid === userId() || !docData.running || !docData.lat || !docData.lon) return;
        let marker = state.liveMarkers.get(docData.uid);
        const ll = [docData.lat, docData.lon];
        if (!marker) {
            marker = L.circleMarker(ll, { radius: 7, color: docData.color || '#0ea5e9', fillOpacity: 0.9 }).addTo(state.liveLayer);
            state.liveMarkers.set(docData.uid, marker);
        } else marker.setLatLng(ll);
        marker.bindTooltip(`${docData.name || 'Runner'} (${docData.mode})`, { permanent: false });
    }

    function subscribeLiveData() {
        if (!firebaseReady()) return;
        const fb = window.firebaseServices;
        if (state.unsubscribeClaims) state.unsubscribeClaims();
        if (state.unsubscribePresence) state.unsubscribePresence();

        state.unsubscribeClaims = fb.onSnapshot(fb.collection(fb.db, 'catchmeClaims'), (snap) => {
            const team = [];
            snap.forEach((d) => {
                const data = d.data();
                if (data.mode === 'team') team.push(data);
            });
            state.teamClaims = team;
            saveClaims();
            if (state.mode === 'team') { renderClaims(); updateProgress(); }
        });

        state.unsubscribePresence = fb.onSnapshot(fb.collection(fb.db, 'catchmePresence'), (snap) => {
            state.liveLayer.clearLayers();
            state.liveMarkers.clear();
            snap.forEach((d) => renderPresenceDoc(d.data()));
        });
    }

    async function bootstrap() {
        if (state.map) return;
        ui.freeBtn = document.getElementById('catchme-free'); ui.teamBtn = document.getElementById('catchme-team');
        ui.colorInput = document.getElementById('catchme-color'); ui.message = document.getElementById('catchme-message');
        ui.progress = document.getElementById('catchme-progress'); ui.points = document.getElementById('catchme-points');
        ui.startRunBtn = document.getElementById('catchme-start-run'); ui.stopRunBtn = document.getElementById('catchme-stop-run');
        ui.units = document.getElementById('catchme-units');

        state.map = L.map('catchme-map', { zoomControl: true }).setView(CHICAGO_CENTER, 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(state.map);
        state.claimsLayer = L.layerGroup().addTo(state.map);
        state.liveLayer = L.layerGroup().addTo(state.map);
        state.runnerLine = L.polyline([], { color: state.color, weight: 4 }).addTo(state.map);

        loadClaims(); await loadNeighborhoods(); renderClaims(); updateProgress(); updatePointExplanation();
        ui.freeBtn.onclick = () => setMode('free'); ui.teamBtn.onclick = () => setMode('team');
        ui.colorInput.oninput = (e) => { state.color = e.target.value; state.runnerLine.setStyle({ color: state.color }); };
        ui.units.value = state.distanceUnits;
        ui.units.onchange = (e) => { state.distanceUnits = e.target.value; localStorage.setItem('catchme-distance-units', state.distanceUnits); renderClaims(); updateProgress(); updatePointExplanation(); };
        ui.startRunBtn.onclick = startRun; ui.stopRunBtn.onclick = () => stopRun(true);
        subscribeLiveData();
        setMode('free');
    }

    window.initCatchMe = async function initCatchMe(reset = false) {
        await bootstrap();
        if (reset) {
            stopRun(false); state.freeClaims = []; state.teamClaims = []; saveClaims(); renderClaims(); updateProgress();
            if (firebaseReady()) {
                const fb = window.firebaseServices;
                await fb.setDoc(fb.doc(fb.db, 'catchmePresence', userId()), { running: false, updatedAt: fb.serverTimestamp() }, { merge: true });
            }
        }
        setTimeout(() => state.map?.invalidateSize(), 80);
    };
})();
