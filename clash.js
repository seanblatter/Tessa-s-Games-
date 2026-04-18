// Clash desktop integration panel for the web hub.

function initClash() {
    const launch = document.getElementById('clash-launch-command');
    if (!launch) return;
    launch.textContent = 'python3 clash_of_clans_pygame.py';

    const note = document.getElementById('clash-message');
    note.textContent = 'Tip: install pygame first with `pip install pygame`.';
}

function copyClashCommand() {
    const command = 'python3 clash_of_clans_pygame.py';
    const msg = document.getElementById('clash-message');

    navigator.clipboard.writeText(command)
        .then(() => {
            msg.textContent = 'Command copied! Run it in your terminal from this project folder.';
        })
        .catch(() => {
            msg.textContent = 'Copy failed. Select the command manually and paste into your terminal.';
        });
}

window.initClash = initClash;
window.copyClashCommand = copyClashCommand;
