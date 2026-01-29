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
let pendingInviteUid = null;
let selectedScoresGame = 'wordle';

function getInviteParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('invite');
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    showLanding();
    if (getInviteParam()) {
        showAuth('signup');
    }
    setupMenuDropdown();
    document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);
    document.getElementById('google-signin').addEventListener('click', handleGoogleSignIn);
    document.querySelectorAll('.score-game-card').forEach((card) => {
        card.addEventListener('click', () => {
            setScoresGame(card.dataset.game || 'wordle');
        });
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
                await handleInviteLink(user);
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
    loadLeaderboards(selectedScoresGame, scoresMode);
}

function showConnect() {
    hideAllScreens();
    document.getElementById('connect-screen').classList.add('active');
    renderInviteLink();
    document.getElementById('connect-message').textContent = '';
    renderFriendRequests();
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
    let friendTag = snapshot.exists() ? snapshot.data().friendTag : null;
    if (!friendTag) {
        friendTag = await generateFriendTag();
    }
    if (!snapshot.exists()) {
        await firebase.setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            displayName,
            photoURL,
            friendTag,
            createdAt: firebase.serverTimestamp()
        });
    } else if (displayName && snapshot.data().displayName !== displayName) {
        await firebase.setDoc(userRef, { displayName }, { merge: true });
    }
    if (snapshot.exists() && !snapshot.data().friendTag) {
        await firebase.setDoc(userRef, { friendTag }, { merge: true });
    }
    await ensurePublicProfile({
        uid: user.uid,
        displayName,
        photoURL,
        friendTag
    });
}

async function ensurePublicProfile({ uid, displayName, photoURL, friendTag }) {
    if (!firebase || !uid) return;
    const publicRef = firebase.doc(firebase.db, 'publicProfiles', uid);
    await firebase.setDoc(publicRef, {
        uid,
        displayName: displayName || 'Player',
        photoURL: photoURL || null,
        friendTag
    }, { merge: true });
}

async function generateFriendTag() {
    const tagId = Math.floor(100000000 + Math.random() * 900000000);
    return `🥬${tagId}`;
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
    loadLeaderboards(selectedScoresGame, scoresMode);
}

function setScoresGame(game) {
    selectedScoresGame = game;
    document.querySelectorAll('.score-game-card').forEach((card) => {
        card.classList.toggle('active', card.dataset.game === game);
    });
    loadLeaderboards(selectedScoresGame, scoresMode);
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
    const userRef = firebase.doc(firebase.db, 'users', currentUser.uid);
    const userSnap = await firebase.getDoc(userRef);
    const userPhotoURL = userSnap.exists() ? userSnap.data().photoURL : null;
    await firebase.setDoc(scoreRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || 'Player',
        photoURL: userPhotoURL || null,
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
        const avatar = data.photoURL || 'https://www.gravatar.com/avatar/?d=mp';
        item.innerHTML = `
            <img class="leader-avatar" src="${avatar}" alt="${data.displayName || 'Player'}">
            <span>${data.displayName || data.uid} · ${data.score}</span>
        `;
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
    const photoURL = data.photoURL || '';
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
    if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const maxSizeBytes = 5 * 1024 * 1024;
        if (file.size > maxSizeBytes) {
            throw new Error('Photo is too large. Please upload an image under 5MB.');
        }
        if (!firebase?.storage) {
            throw new Error('Storage is not configured.');
        }
        const filePath = `profilePhotos/${currentUser.uid}/${Date.now()}_${file.name}`;
        const storageRef = firebase.ref(firebase.storage, filePath);
        await firebase.uploadBytes(storageRef, file, { contentType: file.type });
        return await firebase.getDownloadURL(storageRef);
    }
    return '';
}

async function saveProfileChanges() {
    if (!firebase || !currentUser) return;
    const messageEl = document.getElementById('profile-message');
    messageEl.textContent = '';
    const displayName = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    try {
        const photoURL = await getSelectedProfilePhoto();
        const nextPhotoURL = photoURL || currentUser.photoURL;
        await firebase.updateProfile(currentUser, {
            displayName: displayName || currentUser.displayName
        });
        if (email && email !== currentUser.email) {
            await firebase.updateEmail(currentUser, email);
        }
        const userRef = firebase.doc(firebase.db, 'users', currentUser.uid);
        await firebase.setDoc(userRef, {
            displayName: displayName || currentUser.displayName || 'Player',
            email: email || currentUser.email,
            photoURL: nextPhotoURL || null
        }, { merge: true });
        const updatedSnap = await firebase.getDoc(userRef);
        const updatedData = updatedSnap.exists() ? updatedSnap.data() : {};
        await ensurePublicProfile({
            uid: currentUser.uid,
            displayName: displayName || currentUser.displayName || 'Player',
            photoURL: photoURL || currentUser.photoURL || null,
            friendTag: updatedData.friendTag || null
        });
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
    const userRef = firebase.doc(firebase.db, 'users', currentUser.uid);
    const userSnap = await firebase.getDoc(userRef);
    const tag = userSnap.exists() ? userSnap.data().friendTag : '';
    const friendTagInput = document.getElementById('friend-tag');
    if (friendTagInput) {
        friendTagInput.value = tag || '';
    }
}

async function copyFriendTag() {
    const input = document.getElementById('friend-tag');
    if (!input) return;
    input.select();
    document.execCommand('copy');
}

async function handleInviteLink(user) {
    if (!firebase || !user) return;
    if (!pendingInviteUid) {
        pendingInviteUid = getInviteParam();
    }
    if (!pendingInviteUid || pendingInviteUid === user.uid) return;
    await addFriendConnection(user.uid, pendingInviteUid);
    await addFriendConnection(pendingInviteUid, user.uid);
    pendingInviteUid = null;
    if (window.history && window.history.replaceState) {
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState({}, document.title, url.toString());
    }
}

async function acceptInvite() {
    if (!firebase || !currentUser) return;
    const friendTag = document.getElementById('invite-code').value.trim();
    const messageEl = document.getElementById('connect-message');
    if (!friendTag || !friendTag.startsWith('🥬')) {
        messageEl.textContent = 'Enter a valid friend tag.';
        return;
    }
    const profileSnapshot = await firebase.getDocs(firebase.query(
        firebase.collection(firebase.db, 'publicProfiles'),
        firebase.where('friendTag', '==', friendTag)
    ));
    if (profileSnapshot.empty) {
        messageEl.textContent = 'No user found with that friend tag.';
        return;
    }
    const target = profileSnapshot.docs[0].data();
    if (!target || target.uid === currentUser.uid) {
        messageEl.textContent = 'That friend tag belongs to you.';
        return;
    }
    await sendFriendRequest(target);
    messageEl.textContent = 'Friend request sent!';
    document.getElementById('invite-code').value = '';
}

async function addFriendConnection(ownerId, friendId) {
    const friendRef = firebase.doc(firebase.db, 'users', ownerId, 'friends', friendId);
    await firebase.setDoc(friendRef, { uid: friendId, connectedAt: firebase.serverTimestamp() });
}

async function sendFriendRequest(target) {
    const currentUserRef = firebase.doc(firebase.db, 'users', currentUser.uid);
    const userSnap = await firebase.getDoc(currentUserRef);
    const currentTag = userSnap.exists() ? userSnap.data().friendTag : null;
    const currentPhoto = userSnap.exists() ? userSnap.data().photoURL : null;
    const requestRef = firebase.doc(firebase.db, 'users', target.uid, 'requests', currentUser.uid);
    await firebase.setDoc(requestRef, {
        fromUid: currentUser.uid,
        fromName: currentUser.displayName || 'Player',
        fromTag: currentTag || null,
        fromPhotoURL: currentPhoto || null,
        createdAt: firebase.serverTimestamp()
    });
}

async function renderFriendRequests() {
    if (!firebase || !currentUser) return;
    const list = document.getElementById('friend-requests');
    if (!list) return;
    list.innerHTML = '';
    const requestsRef = firebase.collection(firebase.db, 'users', currentUser.uid, 'requests');
    const snapshot = await firebase.getDocs(firebase.query(
        requestsRef,
        firebase.orderBy('createdAt', 'desc')
    ));
    if (snapshot.empty) {
        list.innerHTML = '<p class="request-empty">No requests yet.</p>';
        return;
    }
    snapshot.forEach((docSnap) => {
        const request = docSnap.data();
        const item = document.createElement('div');
        item.className = 'request-card';
        item.innerHTML = `
            <img src="${request.fromPhotoURL || 'https://www.gravatar.com/avatar/?d=mp'}" alt="${request.fromName}">
            <div>
                <strong>${request.fromName || 'Player'}</strong>
                <span>${request.fromTag || ''}</span>
            </div>
            <div class="request-actions">
                <button class="primary-button" type="button">Accept</button>
                <button class="secondary-button" type="button">Decline</button>
            </div>
        `;
        const [acceptBtn, declineBtn] = item.querySelectorAll('button');
        acceptBtn.addEventListener('click', async () => {
            await addFriendConnection(currentUser.uid, request.fromUid);
            await addFriendConnection(request.fromUid, currentUser.uid);
            await firebase.deleteDoc(firebase.doc(firebase.db, 'users', currentUser.uid, 'requests', docSnap.id));
            renderFriendRequests();
        });
        declineBtn.addEventListener('click', async () => {
            await firebase.deleteDoc(firebase.doc(firebase.db, 'users', currentUser.uid, 'requests', docSnap.id));
            renderFriendRequests();
        });
        list.appendChild(item);
    });
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
