(function () {
    const CHICAGO_CENTER = [41.8781, -87.6298];
    const CHICAGO_NEIGHBORHOODS_GEOJSON = 'https://raw.githubusercontent.com/blackmad/neighborhoods/master/chicago.geojson';
    const TEAM_KEY = 'catchme-team-runs-v2';
    const FREE_KEY = 'catchme-free-runs-v2';

    const state = {
        mode: 'free',
        color: '#f43f5e',
        map: null,
        neighborhoodsLayer: null,
        claimsLayer: null,
        runnerLine: null,
        runWatchId: null,
        runPath: [],
        freeClaims: [],
        teamClaims: [],
        cityUnion: null,
        cityArea: 0
    };

    const ui = {};

    function userId() {
        return window.currentUser?.uid || 'guest';
    }

    function loadClaims() {
        try { state.freeClaims = JSON.parse(localStorage.getItem(FREE_KEY) || '[]'); } catch { state.freeClaims = []; }
        try { state.teamClaims = JSON.parse(localStorage.getItem(TEAM_KEY) || '[]'); } catch { state.teamClaims = []; }
    }

    function saveClaims() {
        localStorage.setItem(FREE_KEY, JSON.stringify(state.freeClaims.slice(-500)));
        localStorage.setItem(TEAM_KEY, JSON.stringify(state.teamClaims.slice(-1500)));
    }

    function getClaims() {
        return state.mode === 'free' ? state.freeClaims : state.teamClaims;
    }

    function setMessage(text) { ui.message.textContent = text; }

    function setMode(mode) {
        state.mode = mode;
        ui.freeBtn.classList.toggle('active', mode === 'free');
        ui.teamBtn.classList.toggle('active', mode === 'team');
        renderClaims();
        updateProgress();
    }

    function randomNeighborhoodColor(name) {
        let h = 0;
        for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) % 360;
        return `hsl(${h}, 56%, 76%)`;
    }

    async function loadNeighborhoods() {
        const res = await fetch(CHICAGO_NEIGHBORHOODS_GEOJSON);
        if (!res.ok) throw new Error('Could not load Chicago neighborhood map.');
        const geo = await res.json();

        state.neighborhoodsLayer = L.geoJSON(geo, {
            style: (feature) => ({
                fillColor: randomNeighborhoodColor(feature.properties?.name || 'Area'),
                fillOpacity: 0.5,
                color: '#334155',
                weight: 1
            }),
            onEachFeature: (feature, layer) => {
                layer.bindTooltip(feature.properties?.name || 'Neighborhood', { sticky: true });
            }
        }).addTo(state.map);

        const features = geo.features.filter((f) => f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon');
        let union = null;
        for (const f of features) {
            try {
                union = union ? turf.union(turf.featureCollection([union, f])) : f;
            } catch {
                // skip invalid geometry
            }
        }
        state.cityUnion = union;
        state.cityArea = union ? turf.area(union) : 1;
        state.map.fitBounds(state.neighborhoodsLayer.getBounds(), { padding: [15, 15] });
    }

    function renderClaims() {
        state.claimsLayer.clearLayers();
        const activeClaims = getClaims();
        activeClaims.forEach((claim) => {
            const poly = L.geoJSON(claim.geojson, {
                style: {
                    fillColor: claim.color,
                    fillOpacity: claim.owner === userId() ? 0.45 : 0.28,
                    color: claim.color,
                    weight: 2
                }
            });
            poly.bindPopup(`${claim.mode === 'free' ? 'Free Run' : 'Team Run'} · ${claim.ownerName || 'Runner'} · ${(claim.area / 1000000).toFixed(2)} km²`);
            poly.addTo(state.claimsLayer);
        });
    }

    function updateProgress() {
        const claims = getClaims();
        const myCoverage = claims.filter((c) => c.owner === userId()).reduce((sum, c) => sum + c.area, 0);
        const totalCoverage = claims.reduce((sum, c) => sum + c.area, 0);
        const pct = Math.min(100, Math.round((totalCoverage / state.cityArea) * 100));
        const myPct = Math.min(100, Math.round((myCoverage / state.cityArea) * 100));
        ui.progress.textContent = `Chicago progression · ${state.mode === 'free' ? 'Free' : 'Team'} total ${pct}% · You ${myPct}%`;
    }

    function closeEnough(a, b) {
        return turf.distance(turf.point(a), turf.point(b), { units: 'kilometers' }) <= 0.07;
    }

    function buildClosedPolygon(path) {
        if (path.length < 6) return null;
        const first = path[0];
        const last = path[path.length - 1];
        if (!closeEnough(first, last)) return null;
        const ring = [...path, first];
        const poly = turf.polygon([ring]);
        if (turf.area(poly) < 2500) return null;
        return poly;
    }

    function clipToChicago(poly) {
        if (!state.cityUnion) return poly;
        try {
            return turf.intersect(turf.featureCollection([state.cityUnion, poly]));
        } catch {
            return null;
        }
    }

    function stealAndInsert(claimFeature) {
        const claims = getClaims();
        const next = [];
        for (const claim of claims) {
            if (claim.owner === userId()) {
                next.push(claim);
                continue;
            }
            try {
                const overlap = turf.intersect(turf.featureCollection([claim.geojson, claimFeature]));
                if (!overlap) {
                    next.push(claim);
                } else {
                    const remaining = turf.difference(turf.featureCollection([claim.geojson, claimFeature]));
                    if (remaining) {
                        next.push({ ...claim, geojson: remaining, area: turf.area(remaining) });
                    }
                }
            } catch {
                next.push(claim);
            }
        }

        next.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            owner: userId(),
            ownerName: window.currentUser?.displayName || 'Runner',
            color: state.color,
            mode: state.mode,
            geojson: claimFeature,
            area: turf.area(claimFeature),
            createdAt: new Date().toISOString()
        });

        if (state.mode === 'free') state.freeClaims = next;
        else state.teamClaims = next;
        saveClaims();
    }

    function onPosition(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const point = [lon, lat];

        state.runPath.push(point);
        if (state.runPath.length > 1) {
            state.runnerLine.setLatLngs(state.runPath.map((p) => [p[1], p[0]]));
        }

        const candidate = buildClosedPolygon(state.runPath);
        if (!candidate) {
            setMessage(`Tracking run... ${state.runPath.length} points. Return near your starting point to close your loop.`);
            return;
        }

        const clipped = clipToChicago(candidate);
        if (!clipped || turf.area(clipped) < 2500) {
            setMessage('Loop closed, but area is outside Chicago neighborhoods. Try again in-city.');
            stopRun(false);
            return;
        }

        stealAndInsert(clipped);
        renderClaims();
        updateProgress();
        setMessage(`Loop complete! Captured ${(turf.area(clipped) / 1000000).toFixed(2)} km² in ${state.mode === 'free' ? 'Free Run' : 'Team Run'}.`);
        stopRun(false);
    }

    function onPositionError(err) {
        setMessage(`GPS error (${err.code}). Please allow location access and try again.`);
        stopRun(false);
    }

    function startRun() {
        if (!navigator.geolocation) {
            setMessage('Geolocation is not available in this browser/device.');
            return;
        }
        if (state.runWatchId !== null) return;
        state.runPath = [];
        state.runnerLine.setLatLngs([]);
        state.runWatchId = navigator.geolocation.watchPosition(onPosition, onPositionError, {
            enableHighAccuracy: true,
            maximumAge: 2000,
            timeout: 10000
        });
        ui.startRunBtn.disabled = true;
        ui.stopRunBtn.disabled = false;
        setMessage('Run started. Physically move to draw your route with GPS and close your loop.');
    }

    function stopRun(showMsg = true) {
        if (state.runWatchId !== null) {
            navigator.geolocation.clearWatch(state.runWatchId);
            state.runWatchId = null;
        }
        ui.startRunBtn.disabled = false;
        ui.stopRunBtn.disabled = true;
        state.runPath = [];
        state.runnerLine.setLatLngs([]);
        if (showMsg) setMessage('Run stopped. Start again when ready.');
    }

    function resetAll() {
        stopRun(false);
        state.freeClaims = [];
        state.teamClaims = [];
        saveClaims();
        renderClaims();
        updateProgress();
        setMessage('Catch Me map reset for both Free and Team runs.');
    }

    async function bootstrap() {
        if (state.map) return;
        const mapEl = document.getElementById('catchme-map');
        if (!mapEl || typeof L === 'undefined' || typeof turf === 'undefined') return;

        ui.freeBtn = document.getElementById('catchme-free');
        ui.teamBtn = document.getElementById('catchme-team');
        ui.colorInput = document.getElementById('catchme-color');
        ui.message = document.getElementById('catchme-message');
        ui.progress = document.getElementById('catchme-progress');
        ui.startRunBtn = document.getElementById('catchme-start-run');
        ui.stopRunBtn = document.getElementById('catchme-stop-run');

        state.map = L.map(mapEl, { zoomControl: true }).setView(CHICAGO_CENTER, 11);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(state.map);

        state.claimsLayer = L.layerGroup().addTo(state.map);
        state.runnerLine = L.polyline([], { color: '#ef4444', weight: 4, opacity: 0.9 }).addTo(state.map);

        loadClaims();
        await loadNeighborhoods();
        renderClaims();
        updateProgress();

        ui.freeBtn.onclick = () => setMode('free');
        ui.teamBtn.onclick = () => setMode('team');
        ui.colorInput.oninput = (e) => { state.color = e.target.value; state.runnerLine.setStyle({ color: state.color }); };
        ui.startRunBtn.onclick = startRun;
        ui.stopRunBtn.onclick = () => stopRun(true);
        setMode('free');
    }

    window.initCatchMe = async function initCatchMe(reset = false) {
        await bootstrap();
        if (reset) resetAll();
        setTimeout(() => state.map?.invalidateSize(), 80);
    };
})();
