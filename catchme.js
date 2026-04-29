(function () {
    const CITY = { x: 20, y: 20, w: 380, h: 510 };
    const NEIGHBORHOODS = [
        { name: 'Rogers Park', color: '#dbeafe', poly: [[20,20],[180,20],[170,105],[20,120]] },
        { name: 'Lincoln Park', color: '#bfdbfe', poly: [[180,20],[400,20],[400,120],[170,105]] },
        { name: 'West Loop', color: '#c7d2fe', poly: [[20,120],[170,105],[195,235],[20,255]] },
        { name: 'The Loop', color: '#ddd6fe', poly: [[170,105],[400,120],[400,255],[195,235]] },
        { name: 'Pilsen', color: '#fde68a', poly: [[20,255],[195,235],[215,360],[20,390]] },
        { name: 'Bronzeville', color: '#fecaca', poly: [[195,235],[400,255],[400,390],[215,360]] },
        { name: 'Hyde Park', color: '#fed7aa', poly: [[20,390],[215,360],[245,530],[20,530]] },
        { name: 'South Shore', color: '#bbf7d0', poly: [[215,360],[400,390],[400,530],[245,530]] }
    ];

    const state = {
        canvas: null, ctx: null, mode: 'free', color: '#f43f5e', drawing: false,
        path: [], freeClaims: [], teamClaims: [], progress: { free: 0, team: 0 }
    };

    function polyPath(ctx, poly) {
        ctx.beginPath();
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i += 1) ctx.lineTo(poly[i][0], poly[i][1]);
        ctx.closePath();
    }

    function loadTeamClaims() {
        try { state.teamClaims = JSON.parse(localStorage.getItem('catchme-team-claims') || '[]'); } catch { state.teamClaims = []; }
    }
    function saveTeamClaims() { localStorage.setItem('catchme-team-claims', JSON.stringify(state.teamClaims.slice(-600))); }

    function updateStatus() {
        const claims = state.mode === 'free' ? state.freeClaims : state.teamClaims;
        const mine = claims.filter((c) => c.owner === (window.currentUser?.uid || 'guest')).length;
        const totalCells = Math.floor(CITY.w / 10) * Math.floor(CITY.h / 10);
        const pct = Math.round((claims.length / totalCells) * 100);
        state.progress[state.mode] = pct;
        const msg = `Mode: ${state.mode === 'free' ? 'Free Run' : 'Team Run'} · Coverage ${pct}% · Your tiles ${mine}`;
        document.getElementById('catchme-message').textContent = msg;
        document.getElementById('catchme-progress').textContent = `Chicago progression · Free ${state.progress.free}% · Team ${state.progress.team}%`;
    }

    function drawMap() {
        const { ctx } = state;
        ctx.clearRect(0,0,state.canvas.width,state.canvas.height);
        ctx.fillStyle = '#f8fafc'; ctx.fillRect(0,0,state.canvas.width,state.canvas.height);
        NEIGHBORHOODS.forEach((n) => {
            polyPath(ctx, n.poly);
            ctx.fillStyle = n.color; ctx.fill();
            ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.stroke();
            const [x,y] = n.poly[0];
            ctx.fillStyle = '#334155'; ctx.font = '12px Arial'; ctx.fillText(n.name, x + 6, y + 15);
        });
        const claims = state.mode === 'free' ? state.freeClaims : state.teamClaims;
        claims.forEach((claim) => {
            ctx.fillStyle = claim.color;
            ctx.globalAlpha = claim.owner === (window.currentUser?.uid || 'guest') ? 0.6 : 0.4;
            ctx.fillRect(claim.x, claim.y, 10, 10);
            ctx.globalAlpha = 1;
        });
        if (state.path.length > 1) {
            ctx.strokeStyle = state.color;
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(state.path[0].x, state.path[0].y);
            for (let i = 1; i < state.path.length; i += 1) ctx.lineTo(state.path[i].x, state.path[i].y);
            ctx.stroke();
        }
    }

    function snapCell(v) { return Math.max(20, Math.min(400, Math.floor(v / 10) * 10)); }

    function commitPath() {
        if (state.path.length < 2) return;
        const owner = window.currentUser?.uid || 'guest';
        const claims = state.mode === 'free' ? state.freeClaims : state.teamClaims;
        state.path.forEach((p) => {
            const x = snapCell(p.x); const y = snapCell(p.y);
            const i = claims.findIndex((c) => c.x === x && c.y === y);
            if (i >= 0 && claims[i].owner !== owner) {
                claims[i] = { x, y, color: state.color, owner }; // steal tile
            } else if (i < 0) {
                claims.push({ x, y, color: state.color, owner });
            }
        });
        if (state.mode === 'team') saveTeamClaims();
        state.path = [];
        drawMap();
        updateStatus();
    }

    function getPoint(evt) {
        const r = state.canvas.getBoundingClientRect();
        const touch = evt.touches && evt.touches[0];
        const cx = touch ? touch.clientX : evt.clientX;
        const cy = touch ? touch.clientY : evt.clientY;
        return { x: Math.max(CITY.x, Math.min(CITY.x + CITY.w, cx - r.left)), y: Math.max(CITY.y, Math.min(CITY.y + CITY.h, cy - r.top)) };
    }

    function setMode(mode) { state.mode = mode; drawMap(); updateStatus(); }

    window.initCatchMe = function initCatchMe(reset = false) {
        state.canvas = document.getElementById('catchme-canvas');
        if (!state.canvas) return;
        state.ctx = state.canvas.getContext('2d');
        if (reset) { state.freeClaims = []; state.teamClaims = []; saveTeamClaims(); }
        loadTeamClaims();

        document.getElementById('catchme-free').onclick = () => setMode('free');
        document.getElementById('catchme-team').onclick = () => setMode('team');
        document.getElementById('catchme-color').oninput = (e) => { state.color = e.target.value; };

        state.canvas.onmousedown = (e) => { state.drawing = true; state.path = [getPoint(e)]; };
        state.canvas.onmousemove = (e) => { if (!state.drawing) return; state.path.push(getPoint(e)); drawMap(); };
        window.onmouseup = () => { if (state.drawing) commitPath(); state.drawing = false; };

        state.canvas.ontouchstart = (e) => { state.drawing = true; state.path = [getPoint(e)]; e.preventDefault(); };
        state.canvas.ontouchmove = (e) => { if (!state.drawing) return; state.path.push(getPoint(e)); drawMap(); e.preventDefault(); };
        state.canvas.ontouchend = () => { if (state.drawing) commitPath(); state.drawing = false; };

        drawMap();
        updateStatus();
    };
})();
