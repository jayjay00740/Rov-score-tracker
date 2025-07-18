document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const teamNameElements = document.querySelectorAll('.team-name');
    const addTeamBtn = document.getElementById('addTeamBtn');
    const addMatchBtn = document.getElementById('addMatchBtn');
    const summarizeBtn = document.getElementById('summarizeBtn');

    const addMatchModal = document.getElementById('addMatchModal');
    const summaryModal = document.getElementById('summaryModal');
    const addTeamModal = document.getElementById('addTeamModal');

    const closeButtons = document.querySelectorAll('.close-button');
    const matchForm = document.getElementById('matchForm');
    const winningTeamSelect = document.getElementById('winningTeam');
    const mvpPlayerSelect = document.getElementById('mvpPlayer');
    const matchDateInput = document.getElementById('matchDate');
    const matchLog = document.getElementById('matchLog');
    const summaryContent = document.getElementById('summaryContent');
    const calendarEl = document.getElementById('calendar');
    const newTeamForm = document.getElementById('newTeamForm');
    const mainContainer = document.querySelector('main');

    // --- Data Storage (using localStorage for persistence) ---
    let teams = JSON.parse(localStorage.getItem('rovTeams')) || {
        team1: {
            name: 'หมูเด้งFC',
            score: 0,
            players: {
                'team1-p1': { name: 'ผู้เล่น 1', mvp: 0 },
                'team1-p2': { name: 'ผู้เล่น 2', mvp: 0 },
                'team1-p3': { name: 'ผู้เล่น 3', mvp: 0 },
                'team1-p4': { name: 'ผู้เล่น 4', mvp: 0 },
                'team1-p5': { name: 'ผู้เล่น 5', mvp: 0 },
                'team1-r1': { name: 'สำรอง 1', mvp: 0 },
                'team1-r2': { name: 'สำรอง 2', mvp: 0 },
            }
        },
        team2: {
            name: 'ยุ้ยอ้วน United',
            score: 0,
            players: {
                'team2-p1': { name: 'ผู้เล่น A', mvp: 0 },
                'team2-p2': { name: 'ผู้เล่น B', mvp: 0 },
                'team2-p3': { name: 'ผู้เล่น C', mvp: 0 },
                'team2-p4': { name: 'ผู้เล่น D', mvp: 0 },
                'team2-p5': { name: 'ผู้เล่น E', mvp: 0 },
                'team2-r1': { name: 'สำรอง A', mvp: 0 },
                'team2-r2': { name: 'สำรอง B', mvp: 0 },
            }
        }
    };

    let matchHistory = JSON.parse(localStorage.getItem('rovMatchHistory')) || [];
    let currentSelectedDate = null; // To store the date selected from the calendar

    // --- Helper Functions ---

    // Save data to localStorage
    const saveData = () => {
        localStorage.setItem('rovTeams', JSON.stringify(teams));
        localStorage.setItem('rovMatchHistory', JSON.stringify(matchHistory));
        renderUI(); // Re-render UI after saving
    };

    // Render team scores and player MVPs
    const renderUI = () => {
        for (const teamId in teams) {
            const team = teams[teamId];
            document.getElementById(`score-${teamId}`).textContent = team.score;

            for (const playerId in team.players) {
                const player = team.players[playerId];
                const playerInput = document.querySelector(`#${teamId}-card input[data-player-id="${playerId}"]`);
                if (playerInput) {
                    playerInput.value = player.name;
                    document.getElementById(`mvp-${playerId}`).textContent = player.mvp;
                }
            }
        }
        renderMatchLog();
        renderCalendar();
    };

    // Render match history
    const renderMatchLog = () => {
        matchLog.innerHTML = ''; // Clear previous log
        if (matchHistory.length === 0) {
            matchLog.innerHTML = '<p style="color: grey; text-align: center;">ยังไม่มีบันทึกการแข่งขัน</p>';
            return;
        }
        matchHistory.forEach(match => {
            const entry = document.createElement('div');
            entry.classList.add('match-entry');
            entry.innerHTML = `
                <p><strong>วันที่:</strong> ${match.date}</p>
                <p><strong>ทีมที่ชนะ:</strong> ${teams[match.winnerTeamId].name}</p>
                <p><strong>MVP:</strong> ${teams[match.winnerTeamId].players[match.mvpPlayerId].name}</p>
            `;
            matchLog.prepend(entry); // Add newest first
        });
    };

    // Populate MVP player dropdown based on selected winning team
    const populateMvpPlayers = (teamId) => {
        mvpPlayerSelect.innerHTML = ''; // Clear existing options
        if (teams[teamId]) {
            for (const playerId in teams[teamId].players) {
                const player = teams[teamId].players[playerId];
                const option = document.createElement('option');
                option.value = playerId;
                option.textContent = player.name;
                mvpPlayerSelect.appendChild(option);
            }
        }
    };

    // Generate calendar
    const renderCalendar = (year = new Date().getFullYear(), month = new Date().getMonth()) => {
        calendarEl.innerHTML = ''; // Clear previous calendar

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 for Sunday, 1 for Monday

        const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('span');
            dayHeader.classList.add('day-header');
            dayHeader.textContent = day;
            calendarEl.appendChild(dayHeader);
        });

        // Add empty cells for days before the 1st
        for (let i = 0; i < firstDayOfMonth; i++) {
            const emptySpan = document.createElement('span');
            emptySpan.classList.add('empty');
            calendarEl.appendChild(emptySpan);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const daySpan = document.createElement('span');
            daySpan.classList.add('day');
            daySpan.textContent = day;
            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            daySpan.dataset.date = fullDate;

            // Highlight selected date
            if (fullDate === currentSelectedDate) {
                daySpan.classList.add('selected');
            }

            daySpan.addEventListener('click', () => {
                // Remove existing selection
                document.querySelectorAll('.calendar .day.selected').forEach(el => el.classList.remove('selected'));
                daySpan.classList.add('selected');
                currentSelectedDate = fullDate;
                matchDateInput.value = fullDate; // Update input field
                addMatchModal.style.display = 'flex'; // Show modal after date selection
            });
            calendarEl.appendChild(daySpan);
        }
    };


    // --- Event Listeners ---

    // Toggle player list visibility
    teamNameElements.forEach(teamNameEl => {
        teamNameEl.addEventListener('click', () => {
            const teamId = teamNameEl.dataset.teamId;
            const playerList = document.getElementById(`players-${teamId}`);
            playerList.classList.toggle('hidden');
        });
    });

    // Handle player name edits
    document.querySelectorAll('.player-list input[type="text"]').forEach(input => {
        input.addEventListener('change', (e) => {
            const playerId = e.target.dataset.playerId;
            const teamId = playerId.split('-')[0]; // e.g., 'team1' from 'team1-p1'
            if (teams[teamId] && teams[teamId].players[playerId]) {
                teams[teamId].players[playerId].name = e.target.value;
                saveData();
            }
        });
    });

    // Open add match modal
    addMatchBtn.addEventListener('click', () => {
        // Reset modal form
        matchForm.reset();
        currentSelectedDate = null; // Clear selected date on new match entry
        matchDateInput.value = '';
        renderCalendar(); // Re-render calendar to clear selection

        // Set default winning team and populate MVP players
        winningTeamSelect.value = 'team1';
        populateMvpPlayers('team1');

        addMatchModal.style.display = 'flex';
    });

    // Add Team Button (opens modal)
    addTeamBtn.addEventListener('click', () => {
        newTeamForm.reset();
        addTeamModal.style.display = 'flex';
    });

    // Close modals
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.closest('.modal').style.display = 'none';
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target === addMatchModal) {
            addMatchModal.style.display = 'none';
        } else if (event.target === summaryModal) {
            summaryModal.style.display = 'none';
        } else if (event.target === addTeamModal) {
            addTeamModal.style.display = 'none';
        }
    });

    // Dynamic MVP player selection based on winning team
    winningTeamSelect.addEventListener('change', (e) => {
        populateMvpPlayers(e.target.value);
    });

    // Submit match form
    matchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const date = matchDateInput.value;
        const winningTeamId = winningTeamSelect.value;
        const mvpPlayerId = mvpPlayerSelect.value;

        if (!date || !winningTeamId || !mvpPlayerId) {
            alert('โปรดกรอกข้อมูลให้ครบถ้วน');
            return;
        }

        // Update scores and MVP counts
        teams[winningTeamId].score += 1;
        teams[winningTeamId].players[mvpPlayerId].mvp += 1;

        // Record match history
        matchHistory.push({
            date: date,
            winnerTeamId: winningTeamId,
            mvpPlayerId: mvpPlayerId
        });

        saveData(); // Save and re-render
        addMatchModal.style.display = 'none'; // Close modal
    });

    // Submit new team form
    newTeamForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newTeamName = document.getElementById('newTeamName').value.trim();
        if (newTeamName) {
            // Generate a unique ID for the new team
            const newTeamId = `team${Object.keys(teams).length + 1}`;
            teams[newTeamId] = {
                name: newTeamName,
                score: 0,
                players: {} // Add default players for new team
            };

            // Add 5 main players and 2 reserves for the new team
            for (let i = 1; i <= 5; i++) {
                teams[newTeamId].players[`${newTeamId}-p${i}`] = { name: `ผู้เล่น ${i}`, mvp: 0 };
            }
            for (let i = 1; i <= 2; i++) {
                teams[newTeamId].players[`${newTeamId}-r${i}`] = { name: `สำรอง ${i}`, mvp: 0 };
            }

            // Dynamically add team card to UI
            const teamCardHtml = `
                <section class="team-section" id="${newTeamId}-card">
                    <h2 class="team-name" data-team-id="${newTeamId}">${newTeamName} <span class="score" id="score-${newTeamId}">0</span></h2>
                    <div class="player-list hidden" id="players-${newTeamId}">
                        <h3>สมาชิกทีม</h3>
                        <ul>
                            ${Object.keys(teams[newTeamId].players).map(playerId => `
                                <li ${playerId.includes('-r') ? 'class="reserve"' : ''}>
                                    <input type="text" value="${teams[newTeamId].players[playerId].name}" data-player-id="${playerId}"> - MVP: <span id="mvp-${playerId}">0</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </section>
            `;
            mainContainer.insertAdjacentHTML('afterbegin', teamCardHtml); // Add at the beginning of main

            // Re-select all team name elements and add event listeners for the new one
            document.querySelectorAll('.team-name').forEach(teamNameEl => {
                if (!teamNameEl._hasClickListener) { // Check if listener already added
                    teamNameEl.addEventListener('click', () => {
                        const teamId = teamNameEl.dataset.teamId;
                        const playerList = document.getElementById(`players-${teamId}`);
                        playerList.classList.toggle('hidden');
                    });
                    teamNameEl._hasClickListener = true; // Mark as having listener
                }
            });

            // Re-select all player inputs and add event listeners for the new ones
            document.querySelectorAll('.player-list input[type="text"]').forEach(input => {
                if (!input._hasChangeListener) {
                    input.addEventListener('change', (e) => {
                        const playerId = e.target.dataset.playerId;
                        const teamId = playerId.split('-')[0];
                        if (teams[teamId] && teams[teamId].players[playerId]) {
                            teams[teamId].players[playerId].name = e.target.value;
                            saveData();
                        }
                    });
                    input._hasChangeListener = true;
                }
            });

            // Add the new team to the winningTeamSelect dropdown
            const option = document.createElement('option');
            option.value = newTeamId;
            option.textContent = newTeamName;
            winningTeamSelect.appendChild(option);

            saveData();
            addTeamModal.style.display = 'none';
        }
    });


    // Summarize results
    summarizeBtn.addEventListener('click', () => {
        let winningTeam = null;
        let maxScore = -1;

        for (const teamId in teams) {
            if (teams[teamId].score > maxScore) {
                maxScore = teams[teamId].score;
                winningTeam = teams[teamId];
            } else if (teams[teamId].score === maxScore && winningTeam) {
                // Handle tie: if scores are equal, don't change winningTeam unless explicitly decided
                // For simplicity, the first team encountered with max score wins.
                // You could add more complex tie-breaking rules here if needed.
            }
        }

        let mvpOfWinningTeam = null;
        let maxMvp = -1;

        if (winningTeam) {
            for (const playerId in winningTeam.players) {
                const player = winningTeam.players[playerId];
                if (player.mvp > maxMvp) {
                    maxMvp = player.mvp;
                    mvpOfWinningTeam = player;
                }
            }
        }

        summaryContent.innerHTML = '';
        if (winningTeam) {
            summaryContent.innerHTML += `<p>ทีมที่ชนะเลิศ: <strong>${winningTeam.name}</strong> ด้วยคะแนน <strong>${winningTeam.score}</strong> คะแนน</p>`;
            if (mvpOfWinningTeam) {
                summaryContent.innerHTML += `<p>ผู้เล่น MVP ของทีมชนะ: <strong>${mvpOfWinningTeam.name}</strong> (${mvpOfWinningTeam.mvp} MVP)</p>`;
            } else {
                summaryContent.innerHTML += `<p>ไม่มีผู้เล่น MVP ที่บันทึกไว้ในทีมชนะ.</p>`;
            }
        } else {
            summaryContent.innerHTML += `<p>ยังไม่มีข้อมูลการแข่งขันที่เพียงพอที่จะสรุปผล.</p>`;
        }

        summaryModal.style.display = 'flex';
    });

    // Initial render when the page loads
    renderUI();
});
