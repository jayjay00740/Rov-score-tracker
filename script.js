// --- Firebase SDK imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, collection, addDoc, query, writeBatch, runTransaction, updateDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// --- App State ---
let db, auth;
let teamsData = {};
let matchesData = [];
let isLoggedIn = false;
let competitionState = { isOver: false };
const teamIds = ['team1', 'team2'];
const appId = typeof __app_id !== 'undefined' ? __app_id : 'rov-audit-league-app-local';

// --- DOM Elements ---
const scoreboard = {
    team1: { name: document.getElementById('team-1-name'), score: document.getElementById('team-1-score'), editBtn: document.getElementById('edit-team-1-btn') },
    team2: { name: document.getElementById('team-2-name'), score: document.getElementById('team-2-score'), editBtn: document.getElementById('edit-team-2-btn') }
};
const modals = {
    teamDetails: document.getElementById('team-details-modal'),
    recordMatch: document.getElementById('record-match-modal'),
    summary: document.getElementById('summary-modal'),
    matchHistory: document.getElementById('match-history-modal'),
    login: document.getElementById('login-modal'),
    editTeam: document.getElementById('edit-team-modal'),
    inProgress: document.getElementById('in-progress-modal'),
    confirmEnd: document.getElementById('confirm-end-modal'),
};
const authButton = document.getElementById('auth-button');
const recordMatchBtn = document.getElementById('record-match-btn');
const summaryBtn = document.getElementById('summary-btn');
const endCompetitionBtn = document.getElementById('end-competition-btn');
const confirmEndBtn = document.getElementById('confirm-end-btn');
const resetCompetitionBtn = document.getElementById('reset-competition-btn');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const editTeamForm = document.getElementById('edit-team-form');
const recordMatchForm = document.getElementById('record-match-form');
const winningTeamSelect = document.getElementById('winning-team');
const mvpPlayerSelect = document.getElementById('mvp-player');
const matchDateInput = document.getElementById('match-date');

// --- Initial Data Structure ---
const initialTeamsData = {
    team1: {
        name: "หมูเด้งFC",
        score: 0,
        players: [
            { id: "t1p1", name: "สมาชิกหลัก 1", mvp: 0, isSubstitute: false },
            { id: "t1p2", name: "สมาชิกหลัก 2", mvp: 0, isSubstitute: false },
            { id: "t1p3", name: "สมาชิกหลัก 3", mvp: 0, isSubstitute: false },
            { id: "t1p4", name: "สมาชิกหลัก 4", mvp: 0, isSubstitute: false },
            { id: "t1p5", name: "สมาชิกหลัก 5", mvp: 0, isSubstitute: false },
            { id: "t1s1", name: "ผู้เล่นสำรอง 1", mvp: 0, isSubstitute: true },
            { id: "t1s2", name: "ผู้เล่นสำรอง 2", mvp: 0, isSubstitute: true },
        ]
    },
    team2: {
        name: "ยุ้ยอ้วน United",
        score: 0,
        players: [
            { id: "t2p1", name: "สมาชิกหลัก 1", mvp: 0, isSubstitute: false },
            { id: "t2p2", name: "สมาชิกหลัก 2", mvp: 0, isSubstitute: false },
            { id: "t2p3", name: "สมาชิกหลัก 3", mvp: 0, isSubstitute: false },
            { id: "t2p4", name: "สมาชิกหลัก 4", mvp: 0, isSubstitute: false },
            { id: "t2p5", name: "สมาชิกหลัก 5", mvp: 0, isSubstitute: false },
            { id: "t2s1", name: "ผู้เล่นสำรอง 1", mvp: 0, isSubstitute: true },
            { id: "t2s2", name: "ผู้เล่นสำรอง 2", mvp: 0, isSubstitute: true },
        ]
    }
};

// --- Firebase Initialization ---
async function initializeFirebase() {
    const firebaseConfigPlaceholder = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };
    
    try {
        const config = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : firebaseConfigPlaceholder;
        const app = initializeApp(config);
        db = getFirestore(app);
        auth = getAuth(app);
        
        let listenersAttached = false;

        onAuthStateChanged(auth, (user) => {
            if (user) {
                isLoggedIn = !user.isAnonymous;
                
                if (!listenersAttached) {
                    listenersAttached = true;
                    checkAndInitializeData();
                    setupListeners();
                }
            } else {
                isLoggedIn = false;
                signInAnonymously(auth).catch(err => console.error("Failed to re-sign in anonymously:", err));
            }
            updateUIVisibility();
        });

    } catch (e) {
        console.error("Firebase initialization failed.", e);
    }
}

// --- Data Initialization & Listeners ---
async function checkAndInitializeData() {
    const batch = writeBatch(db);
    let shouldCommit = false;

    // Check teams
    for (const teamId of teamIds) {
        const teamRef = doc(db, "artifacts", appId, "public", "data", "teams", teamId);
        const teamDoc = await getDoc(teamRef);
        if (!teamDoc.exists()) {
            batch.set(teamRef, initialTeamsData[teamId]);
            shouldCommit = true;
        }
    }

    // Check league state
    const leagueStateRef = doc(db, "artifacts", appId, "public", "data", "leagueState", "status");
    const leagueStateDoc = await getDoc(leagueStateRef);
    if (!leagueStateDoc.exists()) {
        batch.set(leagueStateRef, { isOver: false });
        shouldCommit = true;
    }

    if (shouldCommit) {
        await batch.commit();
        console.log("Initial data set.");
    }
}

function setupListeners() {
    // Team listeners
    teamIds.forEach(teamId => {
        const teamRef = doc(db, "artifacts", appId, "public", "data", "teams", teamId);
        onSnapshot(teamRef, (doc) => {
            if (doc.exists()){
                teamsData[teamId] = doc.data();
                renderTeam(teamId);
            }
        }, (error) => console.error(`Error listening to team ${teamId}:`, error));
    });

    // Matches listener
    const matchesCollectionRef = collection(db, "artifacts", appId, "public", "data", "matches");
    onSnapshot(query(matchesCollectionRef), (querySnapshot) => {
        matchesData = [];
        querySnapshot.forEach((doc) => {
            matchesData.push({ id: doc.id, ...doc.data() });
        });
        matchesData.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, (error) => console.error("Error listening to matches:", error));
    
    // League state listener
    const leagueStateRef = doc(db, "artifacts", appId, "public", "data", "leagueState", "status");
    onSnapshot(leagueStateRef, (doc) => {
        if (doc.exists()) {
            competitionState = doc.data();
        } else {
            competitionState = { isOver: false };
        }
        updateUIVisibility();
    });
}

// --- UI Update Functions ---
function updateUIVisibility() {
    // Auth button
    authButton.textContent = isLoggedIn ? 'ออกจากระบบ' : 'ผู้ดูแลระบบ';

    // Admin-only buttons
    const adminButtons = [recordMatchBtn, scoreboard.team1.editBtn, scoreboard.team2.editBtn];
    adminButtons.forEach(btn => btn.classList.toggle('hidden', !isLoggedIn));

    // Competition state buttons
    endCompetitionBtn.classList.toggle('hidden', !isLoggedIn || competitionState.isOver);
    resetCompetitionBtn.classList.toggle('hidden', !isLoggedIn || !competitionState.isOver);
}

function renderTeam(teamId) {
    const team = teamsData[teamId];
    if (!team) return;
    scoreboard[teamId].name.textContent = team.name;
    scoreboard[teamId].score.textContent = team.score;
}

// --- Modal Logic ---
window.showTeamDetails = (teamId) => {
    const team = teamsData[teamId];
    if (!team) return;
    const modalTeamName = document.getElementById('modal-team-name');
    const modalPlayerList = document.getElementById('modal-player-list');
    modalTeamName.textContent = team.name;
    modalTeamName.className = `font-orbitron text-2xl font-bold mb-4 text-center ${teamId === 'team1' ? 'text-cyan-300' : 'text-pink-400'}`;
    modalPlayerList.innerHTML = '';
    const createPlayerElement = (player) => {
        const playerDiv = document.createElement('div');
        playerDiv.className = 'flex items-center justify-between bg-black/20 p-3 rounded-md';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.value = player.name;
        nameInput.readOnly = !isLoggedIn;
        nameInput.className = 'bg-transparent text-white w-full focus:outline-none focus:bg-white/10 rounded px-2 py-1';
        if (!isLoggedIn) nameInput.classList.add('cursor-default');
        nameInput.onblur = () => updatePlayerName(teamId, player.id, nameInput.value);
        const mvpSpan = document.createElement('span');
        mvpSpan.className = 'text-yellow-400 font-bold ml-4';
        mvpSpan.textContent = `MVP: ${player.mvp}`;
        playerDiv.appendChild(nameInput);
        playerDiv.appendChild(mvpSpan);
        return playerDiv;
    };
    modalPlayerList.innerHTML += '<h4 class="font-bold text-gray-400 text-sm uppercase tracking-wider">ผู้เล่นหลัก</h4>';
    team.players.filter(p => !p.isSubstitute).forEach(p => modalPlayerList.appendChild(createPlayerElement(p)));
    modalPlayerList.innerHTML += '<h4 class="font-bold text-gray-400 text-sm uppercase tracking-wider mt-4">ผู้เล่นสำรอง</h4>';
    team.players.filter(p => p.isSubstitute).forEach(p => modalPlayerList.appendChild(createPlayerElement(p)));
    modals.teamDetails.classList.remove('hidden');
};

window.showRecordMatchModal = () => {
    if (!isLoggedIn) return;
    matchDateInput.valueAsDate = new Date();
    populateWinningTeamSelect();
    updateMvpPlayerSelect();
    modals.recordMatch.classList.remove('hidden');
};

window.showEditTeamModal = (teamId) => {
    if (!isLoggedIn) return;
    const team = teamsData[teamId];
    document.getElementById('edit-team-id').value = teamId;
    document.getElementById('new-team-name').value = team.name;
    modals.editTeam.classList.remove('hidden');
};

window.showSummaryModal = () => {
    if (!competitionState.isOver) {
        modals.inProgress.classList.remove('hidden');
        return;
    }
    const summaryContent = document.getElementById('summary-content');
    const showDetailsBtn = document.getElementById('show-details-btn');
    summaryContent.innerHTML = '';
    if (Object.keys(teamsData).length < 2 || !teamsData.team1 || !teamsData.team2) {
        summaryContent.innerHTML = '<p>ข้อมูลทีมยังไม่พร้อม</p>';
        modals.summary.classList.remove('hidden');
        return;
    }
    const team1 = teamsData.team1;
    const team2 = teamsData.team2;
    let winner, loser;
    if (team1.score > team2.score) {
        winner = team1;
        loser = team2;
    } else if (team2.score > team1.score) {
        winner = team2;
        loser = team1;
    } else {
        summaryContent.innerHTML = `<p class="text-2xl">ผลการแข่งขันคือเสมอ!</p><p>ด้วยคะแนน <span class="font-bold text-cyan-300">${team1.score}</span> คะแนน</p>`;
        showDetailsBtn.classList.remove('hidden');
        modals.summary.classList.remove('hidden');
        return;
    }
    const topMvpPlayer = [...winner.players].sort((a, b) => b.mvp - a.mvp)[0];
    summaryContent.innerHTML = `<p class="text-xl">แชมป์เปี้ยนคือ</p><p class="font-orbitron text-4xl font-bold text-yellow-400 my-2" style="text-shadow: 0 0 10px #facc15;">${winner.name}</p><p class="text-2xl">ด้วยคะแนน <span class="font-bold text-cyan-300">${winner.score}</span> ต่อ <span class="font-bold text-pink-400">${loser.score}</span></p><hr class="border-gray-600 my-4"><p class="text-xl">ผู้เล่นทรงคุณค่า</p><p class="font-orbitron text-3xl font-bold text-yellow-400">${topMvpPlayer.name}</p><p>ด้วยผลงาน <span class="font-bold">${topMvpPlayer.mvp} MVP</span></p>`;
    showDetailsBtn.classList.remove('hidden');
    modals.summary.classList.remove('hidden');
};

window.showMatchHistoryModal = () => {
    const listEl = document.getElementById('match-history-list');
    listEl.innerHTML = '';
    if (matchesData.length === 0) {
        listEl.innerHTML = '<p class="text-center text-gray-400">ยังไม่มีประวัติการแข่งขัน</p>';
    } else {
        matchesData.forEach(match => {
            const item = document.createElement('div');
            item.className = 'bg-black/20 p-4 rounded-md flex justify-between items-center';
            const teamColor = match.winningTeamId === 'team1' ? 'text-cyan-300' : 'text-pink-400';
            item.innerHTML = `<div><p class="font-bold">${new Date(match.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p><p class="text-sm text-gray-300">ชนะ: <span class="font-bold ${teamColor}">${match.winningTeamName}</span></p></div><div class="text-right"><p class="font-bold text-yellow-400">MVP</p><p class="text-sm text-gray-300">${match.mvpPlayerName}</p></div>`;
            listEl.appendChild(item);
        });
    }
    modals.summary.classList.add('hidden');
    modals.matchHistory.classList.remove('hidden');
};

window.closeAllModals = () => {
    Object.values(modals).forEach(modal => modal.classList.add('hidden'));
};

// --- UI Population Functions ---
function populateWinningTeamSelect() {
    winningTeamSelect.innerHTML = '';
    teamIds.forEach(id => {
        if (teamsData[id]) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = teamsData[id].name;
            winningTeamSelect.appendChild(option);
        }
    });
}

function updateMvpPlayerSelect() {
    const selectedTeamId = winningTeamSelect.value;
    const team = teamsData[selectedTeamId];
    mvpPlayerSelect.innerHTML = '';
    if (!team) return;
    team.players.forEach(player => {
        const option = document.createElement('option');
        option.value = player.id;
        option.textContent = player.name;
        mvpPlayerSelect.appendChild(option);
    });
}

// --- Event Listeners ---
authButton.addEventListener('click', () => isLoggedIn ? signOut(auth) : modals.login.classList.remove('hidden'));
summaryBtn.addEventListener('click', showSummaryModal);
recordMatchBtn.addEventListener('click', showRecordMatchModal);
document.getElementById('show-details-btn').addEventListener('click', showMatchHistoryModal);

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value)
        .then(() => { closeAllModals(); e.target.reset(); })
        .catch((error) => loginError.textContent = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
});

editTeamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isLoggedIn) return;
    const teamId = e.target['edit-team-id'].value;
    const newName = e.target['new-team-name'].value.trim();
    if (newName) {
        await updateTeamName(teamId, newName);
        closeAllModals();
    }
});

winningTeamSelect.addEventListener('change', updateMvpPlayerSelect);
recordMatchForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isLoggedIn) return;
    const date = matchDateInput.value;
    const winningTeamId = winningTeamSelect.value;
    const mvpPlayerId = mvpPlayerSelect.value;
    if (!date || !winningTeamId || !mvpPlayerId) return;
    try {
        await runTransaction(db, async (transaction) => {
            const teamRef = doc(db, "artifacts", appId, "public", "data", "teams", winningTeamId);
            const teamDoc = await transaction.get(teamRef);
            if (!teamDoc.exists()) throw "Team document does not exist!";
            const teamData = teamDoc.data();
            const newScore = teamData.score + 1;
            const newPlayers = teamData.players.map(p => p.id === mvpPlayerId ? { ...p, mvp: p.mvp + 1 } : p);
            transaction.update(teamRef, { score: newScore, players: newPlayers });
            const mvpPlayer = newPlayers.find(p => p.id === mvpPlayerId);
            const matchesCollectionRef = collection(db, "artifacts", appId, "public", "data", "matches");
            transaction.set(doc(matchesCollectionRef), { date, winningTeamId, winningTeamName: teamData.name, mvpPlayerId, mvpPlayerName: mvpPlayer.name });
        });
        closeAllModals();
    } catch (error) {
        console.error("Transaction failed: ", error);
    }
});

endCompetitionBtn.addEventListener('click', () => modals.confirmEnd.classList.remove('hidden'));
confirmEndBtn.addEventListener('click', async () => {
    if (!isLoggedIn) return;
    const leagueStateRef = doc(db, "artifacts", appId, "public", "data", "leagueState", "status");
    await updateDoc(leagueStateRef, { isOver: true });
    closeAllModals();
});

resetCompetitionBtn.addEventListener('click', async () => {
    if (!isLoggedIn) return;
    if (confirm("คุณแน่ใจหรือไม่ว่าจะเริ่มการแข่งขันใหม่? ข้อมูลคะแนนและ MVP ของทุกทีมจะถูกรีเซ็ต")) {
        const batch = writeBatch(db);
        // Reset teams data
        for (const teamId of teamIds) {
            const teamRef = doc(db, "artifacts", appId, "public", "data", "teams", teamId);
            const initialPlayers = initialTeamsData[teamId].players.map(p => ({...p, mvp: 0}));
            batch.update(teamRef, { score: 0, players: initialPlayers });
        }
        // Reset league state
        const leagueStateRef = doc(db, "artifacts", appId, "public", "data", "leagueState", "status");
        batch.update(leagueStateRef, { isOver: false });
        await batch.commit();
        console.log("Competition has been reset.");
        // Note: Match history is not deleted in this version.
    }
});

// --- Data Update Functions ---
async function updateTeamName(teamId, newName) {
    if (!isLoggedIn) return;
    const teamRef = doc(db, "artifacts", appId, "public", "data", "teams", teamId);
    await updateDoc(teamRef, { name: newName });
}

async function updatePlayerName(teamId, playerId, newName) {
    if (!isLoggedIn) return;
    const team = teamsData[teamId];
    const player = team.players.find(p => p.id === playerId);
    if (player && player.name !== newName && newName.trim() !== '') {
        const updatedPlayers = team.players.map(p => p.id === playerId ? { ...p, name: newName } : p);
        const teamRef = doc(db, "artifacts", appId, "public", "data", "teams", teamId);
        await updateDoc(teamRef, { players: updatedPlayers });
    }
}

// --- App Initialization ---
document.addEventListener('DOMContentLoaded', initializeFirebase);
