/* ----- Audio Elements for Beeps ----- */
const audioShort = new Audio('audio/beep_short.wav');
const audioLong = new Audio('audio/beep_long.wav');
const audioDouble = new Audio('audio/beep_double.wav');

/* Preload for smoother playback */
audioShort.preload = 'auto';
audioLong.preload = 'auto';
audioDouble.preload = 'auto';

/* Unlock audio playback on iOS */
document.addEventListener('touchstart', () => {
	audioShort.play().then(() => audioShort.pause());
	audioLong.play().then(() => audioLong.pause());
	audioDouble.play().then(() => audioDouble.pause());
}, {once: true});

/* ----- Beep Functions ----- */
function beepShort() {
	audioShort.volume = 1;
	audioShort.currentTime = 0;
	audioShort.play();
}

function beepLong() {
	audioLong.volume = 1;
	audioLong.currentTime = 0;
	audioLong.play();
}

function beepDouble() {
	audioDouble.volume = 1;
	audioDouble.currentTime = 0;
	audioDouble.play();
}

/* ----- Timer Variables ----- */
let timerInterval = null;
let timerRunning = false;
let timerRemaining = 0;
let currentPhase = 'prep'; // "prep", "work", or "rest"
let currentSet = 1;
let totalSets = 1;
let workDuration = 0; // If -1 then stop mode for work
let restDuration = 0;
let prepDuration = 0;

/* ----- Element References ----- */
const currentSetDisplay = document.querySelector('#currentSetDisplay');
const currentPhaseDisplay = document.querySelector('#currentPhaseDisplay');
const mainTimerDisplay = document.querySelector('#mainTimerDisplay');
const startStopButton = document.querySelector('#startStopButton');
const resetButton = document.querySelector('#resetButton');
const workSelect = document.querySelector('#workTime');
const restSelect = document.querySelector('#restTime');
const prepSelect = document.querySelector('#prepTime');
const setSelect = document.querySelector('#sets');

/* ----- Control Flag ----- */
// isReset indicates that the timer inputs may be changed.
let isReset = true;

/* ----- Functions to Disable Inputs ----- */
function setSelectorsDisabled(disabled) {
	workSelect.disabled = disabled;
	restSelect.disabled = disabled;
	prepSelect.disabled = disabled;
	setSelect.disabled = disabled;
}

/* ----- Display & Formatting ----- */
function formatTime(seconds) {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function updateDisplay() {
	mainTimerDisplay.textContent = formatTime(timerRemaining);

	currentSetDisplay.textContent = 'SET ' + String(currentSet).padStart(2, '0');
	currentPhaseDisplay.textContent = currentPhase.toUpperCase();

	// Remove any previous phase classes then add the proper class.
	mainTimerDisplay.classList.remove('phase-prep', 'phase-work', 'phase-rest');
	currentPhaseDisplay.classList.remove('phase-prep', 'phase-work', 'phase-rest');
	if (currentPhase === 'work') {
		mainTimerDisplay.classList.add('phase-work');
		currentPhaseDisplay.classList.add('phase-work');
	} else if (currentPhase === 'rest') {
		mainTimerDisplay.classList.add('phase-rest');
		currentPhaseDisplay.classList.add('phase-rest');
	} else {
		mainTimerDisplay.classList.add('phase-prep');
		currentPhaseDisplay.classList.add('phase-prep');
	}
}

/* ----- Timer Control Functions ----- */
function startTimer() {
	isReset = false;
	timerRunning = true;
	startStopButton.textContent = 'Stop';
	startStopButton.classList.remove('btn-stopped');
	startStopButton.classList.add('btn-running');
	// Keep inputs disabled when running.
	setSelectorsDisabled(true);
	timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
	timerRunning = false;
	startStopButton.textContent = 'Start';
	startStopButton.classList.remove('btn-running');
	startStopButton.classList.add('btn-stopped');
	clearInterval(timerInterval);
	timerInterval = null;
	// Do not re-enable inputs unless the timer is reset.
}

function resetTimer() {
	stopTimer();
	isReset = true;
	// Ensure the number of sets is at least 1.
	const numberSets = Number.parseInt(setSelect.value, 10);

	workDuration = (workSelect.value === 'stop') ? -1 : Number.parseInt(workSelect.value, 10);
	restDuration = Number.parseInt(restSelect.value, 10);
	prepDuration = Number.parseInt(prepSelect.value, 10);
	totalSets = numberSets;
	currentSet = 1;

	if (prepDuration > 0) {
		currentPhase = 'prep';
		timerRemaining = prepDuration;
	} else {
		currentPhase = 'work';
		if (workDuration === -1) {
			timerRemaining = 1;
			updateDisplay();
			stopTimer();
			setSelectorsDisabled(false);
			return;
		}

		timerRemaining = workDuration;
	}

	updateDisplay();
	startStopButton.classList.remove('btn-running');
	startStopButton.classList.add('btn-stopped');
	// Re-enable inputs only on reset.
	setSelectorsDisabled(false);
}

function updateTimer() {
	if (timerRemaining > 1) {
		timerRemaining--;
		if (timerRemaining <= 5) {
			beepShort();
		}

		updateDisplay();
	} else {
		switch (currentPhase) {
			case 'prep': {
				beepLong();
				currentPhase = 'work';
				if (workDuration === -1) {
					timerRemaining = 1;
					updateDisplay();
					stopTimer();
					return;
				}

				timerRemaining = workDuration;

				break;
			}

			case 'work': {
				if (currentSet >= totalSets) {
					beepDouble();
					resetTimer();
					return;
				}

				beepLong();
				if (restDuration > 0) {
					currentPhase = 'rest';
					timerRemaining = restDuration;
				} else {
					currentSet++;
					currentPhase = 'work';
					if (workDuration === -1) {
						timerRemaining = 1;
						updateDisplay();
						stopTimer();
						return;
					}

					timerRemaining = workDuration;
				}

				break;
			}

			case 'rest': {
				beepLong();
				currentSet++;
				currentPhase = 'work';
				if (workDuration === -1) {
					timerRemaining = 1;
					updateDisplay();
					stopTimer();
					return;
				}

				timerRemaining = workDuration;

				break;
			}
		// No default
		}

		updateDisplay();
	}
}

/* ----- Button Event Handlers ----- */
startStopButton.addEventListener('click', () => {
	if (!timerRunning && currentPhase === 'work' && workDuration === -1 && timerRemaining === 1) {
		if (currentSet >= totalSets) {
			beepDouble();
			resetTimer();
			return;
		}

		beepLong();
		if (restDuration > 0) {
			currentPhase = 'rest';
			timerRemaining = restDuration;
		} else {
			currentSet++;
			currentPhase = 'work';
			if (workDuration === -1) {
				timerRemaining = 1;
				updateDisplay();
				stopTimer();
				return;
			}

			timerRemaining = workDuration;
		}

		updateDisplay();
		startTimer();
		return;
	}

	if (timerRunning) {
		stopTimer();
	} else if (timerRemaining === 1 && currentPhase === 'work' && workDuration === -1) {
		resetTimer();
	} else {
		startTimer();
	}
});

resetButton.addEventListener('click', resetTimer);

for (const sel of [setSelect, prepSelect, workSelect, restSelect]) {
	sel.addEventListener('change', () => {
		// Only allow changes when the timer is reset.
		if (isReset) {
			resetTimer();
		}
	});
}

// Initialize on page load.
resetTimer();
