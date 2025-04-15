/* ----- Audio Beep Functions (Web Audio API) ----- */
let audioContext = null;
function initAudio() {
	// Create an AudioContext if one doesn't exist already.
	audioContext ||= new (globalThis.AudioContext || globalThis.webkitAudioContext)();
}

function playBeep(duration, frequency, volume) {
	initAudio();
	const osc = audioContext.createOscillator();
	const gain = audioContext.createGain();
	osc.connect(gain);
	gain.connect(audioContext.destination);
	osc.frequency.value = frequency;
	osc.type = 'sine';

	// Convert duration from milliseconds to seconds.
	const totalTime = duration / 1000;
	const fadeInTime = 0.01; // Short fade-in
	const fadeOutTime = 0.01; // Short fade-out

	// Schedule gain envelope for smooth fade in/out.
	gain.gain.setValueAtTime(0, audioContext.currentTime);
	gain.gain.linearRampToValueAtTime(volume, audioContext.currentTime + fadeInTime);
	gain.gain.setValueAtTime(volume, audioContext.currentTime + totalTime - fadeOutTime);
	gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + totalTime);

	osc.start();
	setTimeout(() => {
		osc.stop();
	}, duration);
}

function beepShort() {
	playBeep(150, 864, 1);
}

function beepLong() {
	playBeep(400, 864, 1);
}

function beepDouble() {
	beepShort();
	setTimeout(beepShort, 250);
}

/* ----- Timer Variables ----- */
let timerInterval = null;
let timerRunning = false;
let timerRemaining = 0;
let currentPhase = 'prep'; // 'prep', 'work', or 'rest'
let currentSet = 1;
let totalSets = 1;
let workDuration = 0; // If -1 then in STOP mode (no work timing)
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
// Indicates that the timer is in reset state so inputs may be modified.
let isReset = true;

/* ----- Utility: Enable/Disable Input Selectors ----- */
function setSelectorsDisabled(disabled) {
	workSelect.disabled = disabled;
	restSelect.disabled = disabled;
	prepSelect.disabled = disabled;
	setSelect.disabled = disabled;
}

/* ----- Time Formatting & Display Update ----- */
function formatTime(seconds) {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
}

function updateDisplay() {
	mainTimerDisplay.textContent = formatTime(timerRemaining);
	currentSetDisplay.textContent = 'SET ' + String(currentSet).padStart(2, '0');
	currentPhaseDisplay.textContent = currentPhase.toUpperCase();

	// Update phase color classes (using BEM-style phase classes)
	mainTimerDisplay.classList.remove('interval-timer__phase--prep', 'interval-timer__phase--work', 'interval-timer__phase--rest');
	currentPhaseDisplay.classList.remove('interval-timer__phase--prep', 'interval-timer__phase--work', 'interval-timer__phase--rest');
	if (currentPhase === 'work') {
		mainTimerDisplay.classList.add('interval-timer__phase--work');
		currentPhaseDisplay.classList.add('interval-timer__phase--work');
	} else if (currentPhase === 'rest') {
		mainTimerDisplay.classList.add('interval-timer__phase--rest');
		currentPhaseDisplay.classList.add('interval-timer__phase--rest');
	} else {
		mainTimerDisplay.classList.add('interval-timer__phase--prep');
		currentPhaseDisplay.classList.add('interval-timer__phase--prep');
	}
}

/* ----- Timer Control Functions ----- */
function startTimer() {
	// Resume the AudioContext upon user interaction (start button press)
	initAudio();
	if (audioContext.state === 'suspended') {
		audioContext.resume().then(() => {
			beepShort(); // Play the initial beep after resuming
		}).catch(error => console.error('Error resuming AudioContext:', error));
	} else {
		beepShort();
	}

	isReset = false;
	timerRunning = true;
	startStopButton.textContent = 'Stop';
	startStopButton.classList.remove('button--stopped');
	startStopButton.classList.add('button--running');
	setSelectorsDisabled(true);
	timerInterval = setInterval(updateTimer, 1000);
}

function stopTimer() {
	timerRunning = false;
	startStopButton.textContent = 'Start';
	startStopButton.classList.remove('button--running');
	startStopButton.classList.add('button--stopped');
	clearInterval(timerInterval);
	timerInterval = null;
	// Inputs remain disabled until reset.
}

function resetTimer() {
	stopTimer();
	isReset = true;
	// Ensure at least 1 set is configured.
	const numberSets = Number.parseInt(setSelect.value, 10);

	// WorkDuration of -1 indicates STOP mode.
	workDuration = (workSelect.value === 'stop') ? -1 : Number.parseInt(workSelect.value, 10);
	restDuration = Number.parseInt(restSelect.value, 10);
	prepDuration = Number.parseInt(prepSelect.value, 10);
	totalSets = numberSets;
	currentSet = 1;

	// Start with preparation if defined.
	if (prepDuration > 0) {
		currentPhase = 'prep';
		timerRemaining = prepDuration;
	} else {
		currentPhase = 'work';
		if (workDuration === -1) {
			// Immediately stop if in STOP mode.
			timerRemaining = 1;
			updateDisplay();
			stopTimer();
			setSelectorsDisabled(false);
			return;
		}

		timerRemaining = workDuration;
	}

	updateDisplay();
	startStopButton.classList.remove('button--running');
	startStopButton.classList.add('button--stopped');
	setSelectorsDisabled(false);
}

// Helper function to check if work is in STOP mode.
// Returns true if STOP mode is engaged, and performs the appropriate actions.
function handleStopMode() {
	if (workDuration === -1) {
		timerRemaining = 1;
		updateDisplay();
		stopTimer();
		return true;
	}

	return false;
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
				// Transitioning from prep to work.
				beepLong();
				currentPhase = 'work';
				// Call helper to manage STOP mode for work.
				if (handleStopMode()) {
					return;
				}

				timerRemaining = workDuration;
				break;
			}

			case 'work': {
				if (currentSet >= totalSets) {
					// End of all sets.
					beepDouble();
					resetTimer();
					return;
				}

				beepLong();
				if (restDuration > 0) {
					// Transition from work to rest.
					currentPhase = 'rest';
					timerRemaining = restDuration;
				} else {
					// No rest configured; increment set and transition to work.
					currentSet++;
					currentPhase = 'work';
					if (handleStopMode()) {
						return;
					}

					timerRemaining = workDuration;
				}

				break;
			}

			case 'rest': {
				// After rest, always transition to work.
				beepLong();
				currentSet++;
				currentPhase = 'work';
				if (handleStopMode()) {
					return;
				}

				timerRemaining = workDuration;
				break;
			}
		}

		updateDisplay();
	}
}

/* ----- Button Event Handlers ----- */
startStopButton.addEventListener('click', () => {
	// Special handling when in STOP mode (workDuration === -1)
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
			timerRemaining = (workDuration === -1) ? 1 : workDuration;
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

// Allow input changes only when timer is reset.
for (const sel of [setSelect, prepSelect, workSelect, restSelect]) {
	sel.addEventListener('change', () => {
		if (isReset) {
			resetTimer();
		}
	});
}

// Initialize timer on page load.
resetTimer();
