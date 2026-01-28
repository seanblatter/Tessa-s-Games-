// Main App Logic

let firebase = null;
let currentUser = null;
let authMode = 'signin';
const games = ['wordle', 'sudoku', 'crossword'];
const gameLabels = {
    wordle: 'Wordle',
    sudoku: 'Sudoku',
    crossword: 'Crossword'
};
let dailyScoresCache = {};
let scoresMode = 'daily';

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    showLanding();
    setupMenuDropdown();
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    document.getElementById('google-signin').addEventListener('click', handleGoogleSignIn);
    document.getElementById('scores-game-select').addEventListener('change', (event) => {
        loadLeaderboards(event.target.value, scoresMode);
    });
    document.querySelectorAll('.toggle-button').forEach((button) => {
        button.addEventListener('click', () => {
            setScoresMode(button.dataset.mode || 'daily');
        });
    });
});

let firebaseInitialized = false;

function initializeFirebaseServices() {
    if (firebaseInitialized || !window.firebaseServices) return;
    firebase = window.firebaseServices;
    firebaseInitialized = true;

    firebase.getRedirectResult(firebase.auth)
        .then(async (result) => {
            if (result && result.user) {
                await ensureUserProfile(result.user);
                clearAuthMessage();
            }
        })
        .catch((error) => {
            setAuthMessage(formatAuthError(error));
        });

    firebase.onAuthStateChanged(firebase.auth, async (user) => {
        currentUser = user;
        try {
            if (user) {
                await ensureUserProfile(user);
                await refreshUserUI();
                showMenu();
            } else {
                showLanding();
            }
        } catch (error) {
            setAuthMessage(formatAuthError(error));
            showAuth('signin');
        }
    });
}

window.addEventListener('firebase-ready', initializeFirebaseServices);
if (window.firebaseServices) {
    initializeFirebaseServices();
}

// Screen navigation
function showLanding() {
    hideAllScreens();
    document.getElementById('landing-screen').classList.add('active');
}

function showAuth(mode) {
    hideAllScreens();
    document.getElementById('auth-screen').classList.add('active');
    setAuthMode(mode);
}

function setAuthMode(mode) {
    authMode = mode;
    const title = document.getElementById('auth-title');
    const subtitle = document.getElementById('auth-subtitle');
    const submit = document.getElementById('auth-submit');
    const nameField = document.getElementById('auth-name-field');
    const signinTab = document.getElementById('signin-tab');
    const signupTab = document.getElementById('signup-tab');

    if (mode === 'signup') {
        title.textContent = 'Create your account';
        subtitle.textContent = 'Start tracking your daily scores and friends.';
        submit.textContent = 'Create Account';
        nameField.style.display = 'flex';
        signupTab.classList.add('active');
        signinTab.classList.remove('active');
    } else {
        title.textContent = 'Welcome back';
        subtitle.textContent = 'Sign in to continue playing.';
        submit.textContent = 'Sign In';
        nameField.style.display = 'none';
        signinTab.classList.add('active');
        signupTab.classList.remove('active');
    }
    clearAuthMessage();
}

function showMenu() {
    hideAllScreens();
    document.getElementById('menu-screen').classList.add('active');
    closeMenuDropdown();
}

function showProfile() {
    hideAllScreens();
    document.getElementById('profile-screen').classList.add('active');
    renderProfile();
}

function showTopScores() {
    hideAllScreens();
    document.getElementById('scores-screen').classList.add('active');
    const game = document.getElementById('scores-game-select').value;
    loadLeaderboards(game, scoresMode);
}

function showConnect() {
    hideAllScreens();
    document.getElementById('connect-screen').classList.add('active');
    renderInviteLink();
    document.getElementById('connect-message').textContent = '';
}

function showGame(gameName) {
    hideAllScreens();
    const screenId = `${gameName}-screen`;
    document.getElementById(screenId).classList.add('active');

    // Initialize the game
    switch (gameName) {
        case 'wordle':
            initWordle();
            break;
        case 'sudoku':
            initSudoku();
            break;
        case 'crossword':
            initCrossword();
            break;
    }
}

function hideAllScreens() {
    document.querySelectorAll('.screen').forEach((screen) => {
        screen.classList.remove('active');
    });
}

// Auth helpers
async function handleAuthSubmit(event) {
    event.preventDefault();
    if (!firebase) return;

    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value.trim();
    const displayName = document.getElementById('auth-name').value.trim();

    try {
        if (authMode === 'signup') {
            const result = await firebase.createUserWithEmailAndPassword(firebase.auth, email, password);
            if (displayName) {
                await firebase.updateProfile(result.user, { displayName });
            }
            await ensureUserProfile(result.user, displayName);
        } else {
            await firebase.signInWithEmailAndPassword(firebase.auth, email, password);
        }
        clearAuthMessage();
    } catch (error) {
        setAuthMessage(formatAuthError(error));
        if (error.code === 'auth/email-already-in-use' && authMode === 'signup') {
            setAuthMode('signin');
        }
    }
}

async function handleGoogleSignIn() {
    if (!firebase) return;
    try {
        const result = await firebase.signInWithPopup(firebase.auth, firebase.provider);
        await ensureUserProfile(result.user);
        clearAuthMessage();
    } catch (error) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
            setAuthMessage('Pop-up blocked. Redirecting to Google sign-in...');
            await firebase.signInWithRedirect(firebase.auth, firebase.provider);
            return;
        }
        if (error.code === 'auth/unauthorized-domain') {
            setAuthMessage('This domain is not authorized for Google sign-in. Add it in Firebase Authentication settings.');
            return;
        }
        setAuthMessage(formatAuthError(error));
    }
}

async function signOutUser() {
    if (!firebase) return;
    await firebase.signOut(firebase.auth);
    currentUser = null;
    showLanding();
}

function setAuthMessage(message) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = message;
}

function clearAuthMessage() {
    setAuthMessage('');
}

function formatAuthError(error) {
    if (!error) return 'Something went wrong. Please try again.';
    const code = error.code || '';
    switch (code) {
        case 'auth/email-already-in-use':
            return 'That email is already registered. Try signing in instead.';
        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';
        case 'auth/user-not-found':
            return 'No account found for that email. Try signing up.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/weak-password':
            return 'Password is too weak. Use at least 6 characters.';
        case 'auth/operation-not-allowed':
            return 'Email/password sign-in is disabled. Enable it in Firebase Authentication settings.';
        case 'auth/api-key-not-valid':
            return 'Firebase API key is invalid or restricted. Check your API key settings.';
        case 'auth/requests-from-referer-blocked':
            return 'This domain is blocked for the Firebase API key. Add this site to the API key allowlist in Google Cloud.';
        case 'auth/unauthorized-domain':
            return 'This domain is not authorized for Firebase Authentication. Add it under Authentication > Settings > Authorized domains.';
        case 'auth/configuration-not-found':
            return 'Firebase Auth is not configured correctly. Verify your project settings and that Email/Password sign-in is enabled.';
        case 'permission-denied':
            return 'Firestore permissions are blocking access. Update your Firestore rules to allow authenticated users to read/write.';
        case 'failed-precondition':
            return 'Firestore is not fully configured. Ensure Firestore is enabled and the rules allow access.';
        case 'auth/popup-blocked':
            return 'Pop-up blocked by the browser. Please allow pop-ups and try again.';
        case 'auth/popup-closed-by-user':
            return 'The sign-in pop-up was closed before completing. Please try again.';
        case 'auth/requires-recent-login':
            return 'Please sign in again to update your email.';
        case 'auth/invalid-photo-url':
            return 'Photo URL is invalid. Use a valid image URL.';
        default:
            return error.message || 'Something went wrong. Please try again.';
    }
}

async function ensureUserProfile(user, displayNameOverride) {
    if (!firebase || !user) return;
    const userRef = firebase.doc(firebase.db, 'users', user.uid);
    const snapshot = await firebase.getDoc(userRef);
    const displayName = displayNameOverride || user.displayName || 'Player';
    const photoURL = user.photoURL || null;
    if (!snapshot.exists()) {
        await firebase.setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName,
            photoURL,
            createdAt: firebase.serverTimestamp()
        });
    } else if (displayName && snapshot.data().displayName !== displayName) {
        await firebase.setDoc(userRef, { displayName }, { merge: true });
    }
}

async function refreshUserUI() {
    if (!currentUser) return;
    document.getElementById('menu-user-name').textContent = currentUser.displayName || 'Player';
    await loadDailyScores();
}

// Menu dropdown
function setupMenuDropdown() {
    const toggle = document.getElementById('menu-dropdown-toggle');
    const dropdown = document.getElementById('menu-dropdown');
    toggle.addEventListener('click', () => {
        const isOpen = dropdown.classList.toggle('open');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target) && event.target !== toggle) {
            closeMenuDropdown();
        }
    });
}

function closeMenuDropdown() {
    const dropdown = document.getElementById('menu-dropdown');
    const toggle = document.getElementById('menu-dropdown-toggle');
    dropdown.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
}

// Scores and leaderboard
function getTodayKey() {
    return new Date().toISOString().split('T')[0];
}

function formatDuration(durationSeconds) {
    if (!durationSeconds && durationSeconds !== 0) return '—';
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatGameLabel(game) {
    return gameLabels[game] || game;
}

function setScoresMode(mode) {
    scoresMode = mode;
    document.querySelectorAll('.toggle-button').forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === mode);
    });
    const game = document.getElementById('scores-game-select').value;
    loadLeaderboards(game, scoresMode);
}

function scoreForGame(game, details) {
    if (game === 'wordle') {
        const attempts = details.attempts || 6;
        return Math.max(10, 100 - (attempts - 1) * 15);
    }
    const duration = details.durationSeconds || 0;
    return Math.max(10, 120 - Math.round(duration));
}

async function recordScore(game, details = {}) {
    if (!firebase || !currentUser) return;
    const date = getTodayKey();
    const score = scoreForGame(game, details);
    const scoreRef = firebase.doc(firebase.db, 'scores', `${currentUser.uid}_${game}_${date}`);
    await firebase.setDoc(scoreRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Player',
        game,
        date,
        score,
        attempts: details.attempts || null,
        durationSeconds: details.durationSeconds || null,
        wordlePattern: details.wordlePattern || null,
        updatedAt: firebase.serverTimestamp()
    }, { merge: true });
    await loadDailyScores();
}

async function loadDailyScores() {
    if (!firebase || !currentUser) return;
    const date = getTodayKey();
    const scoresRef = firebase.collection(firebase.db, 'scores');
    const snapshot = await firebase.getDocs(firebase.query(
        scoresRef,
        firebase.where('uid', '==', currentUser.uid),
        firebase.where('date', '==', date)
    ));
    const scores = {};
    snapshot.forEach((docSnap) => {
        scores[docSnap.data().game] = docSnap.data();
    });
    dailyScoresCache = scores;
    const container = document.getElementById('dropdown-scores');
    container.innerHTML = '';
    games.forEach((game) => {
        const data = scores[game];
        const displayValue = (() => {
            if (!data) return '—';
            if (game === 'wordle') return data.wordlePattern || '—';
            if (game === 'sudoku' || game === 'crossword') return formatDuration(data.durationSeconds);
            return data.score ?? '—';
        })();
        const row = document.createElement('div');
        row.className = 'score-row';
        row.innerHTML = `<span>${formatGameLabel(game)}</span><span>${displayValue}</span>`;
        container.appendChild(row);
    });
    updateDailyGameLockUI();
}

async function loadLeaderboards(game, mode = 'daily') {
    if (!firebase) return;
    document.getElementById('global-leaderboard').innerHTML = '';
    document.getElementById('friends-leaderboard').innerHTML = '';

    const scoresRef = firebase.collection(firebase.db, 'scores');
    const globalConstraints = [
        firebase.where('game', '==', game)
    ];
    if (mode === 'daily') {
        globalConstraints.push(firebase.where('date', '==', getTodayKey()));
    }
    globalConstraints.push(firebase.orderBy('score', 'desc'));
    globalConstraints.push(firebase.limit(30));
    const globalSnapshot = await firebase.getDocs(firebase.query(scoresRef, ...globalConstraints));
    renderLeaderboard('global-leaderboard', globalSnapshot, mode);

    if (currentUser) {
        const friends = await getFriendIds();
        if (friends.length) {
            const friendConstraints = [
                firebase.where('game', '==', game),
                firebase.where('uid', 'in', friends.slice(0, 10))
            ];
            if (mode === 'daily') {
                friendConstraints.push(firebase.where('date', '==', getTodayKey()));
            }
            friendConstraints.push(firebase.orderBy('score', 'desc'));
            friendConstraints.push(firebase.limit(50));
            const friendSnapshot = await firebase.getDocs(firebase.query(scoresRef, ...friendConstraints));
            renderLeaderboard('friends-leaderboard', friendSnapshot, mode, true);
        } else {
            document.getElementById('friends-leaderboard').innerHTML = '<li>No friends yet.</li>';
        }
    }
}

function renderLeaderboard(elementId, snapshot, mode = 'daily', dedupeByUser = false) {
    const list = document.getElementById(elementId);
    if (snapshot.empty) {
        list.innerHTML = '<li>No scores yet.</li>';
        return;
    }
    list.innerHTML = '';
    const entries = [];
    snapshot.forEach((docSnap) => entries.push(docSnap.data()));

    let finalEntries = entries;
    if (dedupeByUser && mode === 'all') {
        const bestByUser = {};
        entries.forEach((entry) => {
            const existing = bestByUser[entry.uid];
            if (!existing || entry.score > existing.score) {
                bestByUser[entry.uid] = entry;
            }
        });
        finalEntries = Object.values(bestByUser).sort((a, b) => b.score - a.score).slice(0, 10);
    } else {
        finalEntries = entries.slice(0, 10);
    }

    finalEntries.forEach((data) => {
        const item = document.createElement('li');
        item.textContent = `${data.displayName || data.uid} · ${data.score}`;
        list.appendChild(item);
    });
}

async function renderProfile() {
    if (!firebase || !currentUser) return;
    const profile = document.getElementById('profile-details');
    const userRef = firebase.doc(firebase.db, 'users', currentUser.uid);
    const userSnap = await firebase.getDoc(userRef);
    const data = userSnap.exists() ? userSnap.data() : {};
    const displayName = data.displayName || currentUser.displayName || 'Player';
    const email = currentUser.email || '—';
    const photoURL = data.photoURL || currentUser.photoURL || '';
    const friendCount = (await getFriendIds()).length;
    profile.innerHTML = `
        <div class="panel profile-card">
            <div class="profile-header">
                <img class="profile-avatar" id="profile-avatar" src="${photoURL || 'https://www.gravatar.com/avatar/?d=mp'}" alt="Profile photo">
                <div class="profile-meta">
                    <h3>${displayName}</h3>
                    <p>${email}</p>
                    <p>Member since ${data.createdAt?.toDate?.().toLocaleDateString?.() || 'Today'}</p>
                    <p>${friendCount} friends</p>
                </div>
            </div>
            <div class="profile-form">
                <label class="form-field">
                    <span>Display name</span>
                    <input type="text" id="profile-name" value="${displayName}" placeholder="Tessa">
                </label>
                <label class="form-field">
                    <span>Email</span>
                    <input type="email" id="profile-email" value="${email}" placeholder="you@example.com">
                </label>
                <label class="form-field">
                    <span>Profile photo URL</span>
                    <input type="text" id="profile-photo-url" value="${photoURL}" placeholder="https://">
                </label>
                <label class="form-field">
                    <span>Upload photo</span>
                    <input type="file" id="profile-photo-file" accept="image/*">
                </label>
            </div>
            <div class="profile-actions">
                <button class="primary-button" type="button" onclick="saveProfileChanges()">Save changes</button>
                <button class="secondary-button" type="button" onclick="resetProfileForm()">Reset</button>
            </div>
            <p class="auth-message" id="profile-message"></p>
        </div>
    `;
}

async function getSelectedProfilePhoto() {
    const fileInput = document.getElementById('profile-photo-file');
    const urlInput = document.getElementById('profile-photo-url');
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    return urlInput ? urlInput.value.trim() : '';
}

async function saveProfileChanges() {
    if (!firebase || !currentUser) return;
    const messageEl = document.getElementById('profile-message');
    messageEl.textContent = '';
    const displayName = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    try {
        const photoURL = await getSelectedProfilePhoto();
        await firebase.updateProfile(currentUser, {
            displayName: displayName || currentUser.displayName,
            photoURL: photoURL || currentUser.photoURL
        });
        if (email && email !== currentUser.email) {
            await firebase.updateEmail(currentUser, email);
        }
        const userRef = firebase.doc(firebase.db, 'users', currentUser.uid);
        await firebase.setDoc(userRef, {
            displayName: displayName || currentUser.displayName || 'Player',
            email: email || currentUser.email,
            photoURL: photoURL || currentUser.photoURL || null
        }, { merge: true });
        messageEl.textContent = 'Profile updated!';
        await refreshUserUI();
        renderProfile();
    } catch (error) {
        messageEl.textContent = formatAuthError(error);
    }
}

async function resetProfileForm() {
    await renderProfile();
}

// Friends and invites
async function renderInviteLink() {
    if (!currentUser) return;
    const link = `${window.location.origin}${window.location.pathname}?invite=${currentUser.uid}`;
    document.getElementById('invite-link').value = link;
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    if (invite) {
        document.getElementById('invite-code').value = invite;
    }
}

async function copyInviteLink() {
    const input = document.getElementById('invite-link');
    input.select();
    document.execCommand('copy');
}

async function acceptInvite() {
    if (!firebase || !currentUser) return;
    const friendId = document.getElementById('invite-code').value.trim();
    const messageEl = document.getElementById('connect-message');
    if (!friendId || friendId === currentUser.uid) {
        messageEl.textContent = 'Enter a valid friend code.';
        return;
    }
    await addFriendConnection(currentUser.uid, friendId);
    await addFriendConnection(friendId, currentUser.uid);
    messageEl.textContent = 'Friend connection saved!';
}

async function addFriendConnection(ownerId, friendId) {
    const friendRef = firebase.doc(firebase.db, 'users', ownerId, 'friends', friendId);
    await firebase.setDoc(friendRef, { uid: friendId, connectedAt: firebase.serverTimestamp() });
}

async function getFriendIds() {
    if (!firebase || !currentUser) return [];
    const friendsRef = firebase.collection(firebase.db, 'users', currentUser.uid, 'friends');
    const snapshot = await firebase.getDocs(friendsRef);
    return snapshot.docs.map((docSnap) => docSnap.id);
}

// Message handling
function showMessage(game, text, type) {
    const messageDiv = document.getElementById(`${game}-message`);
    if (messageDiv) {
        messageDiv.textContent = text;
        messageDiv.className = `message ${type}`;
        messageDiv.style.display = 'block';

        // Auto-hide after 3 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 3000);
    }
}

function clearMessage(game) {
    const messageDiv = document.getElementById(`${game}-message`);
    if (messageDiv) {
        messageDiv.textContent = '';
        messageDiv.className = 'message';
        messageDiv.style.display = 'none';
    }
}

function updateDailyGameLockUI() {
    document.querySelectorAll('.new-game-button').forEach((button) => {
        const game = button.dataset.game;
        if (!game) return;
        const alreadyPlayed = Boolean(dailyScoresCache[game]);
        button.disabled = alreadyPlayed;
        button.textContent = alreadyPlayed ? 'Played Today' : 'New Game';
    });
}

window.canPlayDailyGame = (game) => {
    if (dailyScoresCache[game]) {
        showMessage(game, 'You already played today. Come back tomorrow!', 'info');
        return false;
    }
    return true;
};

window.recordScore = recordScore;
