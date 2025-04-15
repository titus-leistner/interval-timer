/* ----- Cookie Helper Functions ----- */
function setCookie(name, value, days) {
	let expires = '';
	if (days) {
		const date = new Date();
		date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
		expires = '; expires=' + date.toUTCString();
	}

	document.cookie = name + '=' + (value || '') + expires + '; path=/';
}

function getCookie(name) {
	const nameEQ = name + '=';
	const ca = document.cookie.split(';');
	for (let c of ca) {
		while (c.charAt(0) === ' ') {
			c = c.slice(1);
		}

		if (c.indexOf(nameEQ) === 0) {
			return c.slice(nameEQ.length);
		}
	}

	return null;
}

/* ----- Settings Cookie Functions ----- */
function updateCookieSettings() {
	const settings = {
		sets: setSelect.value,
		prep: prepSelect.value,
		work: workSelect.value,
		rest: restSelect.value,
	};
	// Save cookie for 7 days (adjust as needed)
	setCookie('intervalTimerSettings', JSON.stringify(settings), 7);
}

/* ----- Audio Beep Functions (Web Audio API) ----- */
let audioContext = null;

function initAudio() {
	// Create an AudioContext if one doesn't already exist.
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
let currentPhase = 'prep'; // "prep", "work", or "rest"
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
// Indicates that the timer is in a reset state so inputs may be modified.
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

	// Update phase color classes (BEM-style)
	mainTimerDisplay.classList.remove(
		'interval-timer__phase--prep',
		'interval-timer__phase--work',
		'interval-timer__phase--rest',
	);
	currentPhaseDisplay.classList.remove(
		'interval-timer__phase--prep',
		'interval-timer__phase--work',
		'interval-timer__phase--rest',
	);
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
async function startTimer() {
	beepShort();

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
	// Inputs remain disabled until a reset.
}

function resetTimer() {
	stopTimer();
	isReset = true;
	// Read the values from the selectors.
	const numberSets = Number.parseInt(setSelect.value, 10);
	// WorkDuration of -1 indicates STOP mode.
	workDuration = workSelect.value === 'stop' ? -1 : Number.parseInt(workSelect.value, 10);
	restDuration = Number.parseInt(restSelect.value, 10);
	prepDuration = Number.parseInt(prepSelect.value, 10);
	totalSets = numberSets;
	currentSet = 1;

	// Begin with preparation if defined.
	if (prepDuration > 0) {
		currentPhase = 'prep';
		timerRemaining = prepDuration;
	} else {
		currentPhase = 'work';
		if (workDuration === -1) {
			// If in STOP mode, set timerRemaining to 1, update display, and stop.
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
				// Transition from prep to work.
				beepLong();
				currentPhase = 'work';
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
					// No rest configured; increment set and transition back to work.
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
				// After rest, transition back to work.
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
// Start/Stop button handler.
startStopButton.addEventListener('click', () => {
	// Special handling in STOP mode (workDuration === -1) when timerRemaining is 1.
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
			timerRemaining = workDuration === -1 ? 1 : workDuration;
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

// Reset button simply reloads the page.
resetButton.addEventListener('click', () => {
	location.reload();
});

// Always update the settings cookie when the user changes any input.
for (const sel of [setSelect, prepSelect, workSelect, restSelect]) {
	sel.addEventListener('change', () => {
		updateCookieSettings();
		// If the timer is in reset state, update global variables too.
		if (isReset) {
			resetTimer();
		}
	});
}

/* ----- Auto-load Saved Settings on Page Load ----- */
window.addEventListener('load', () => {
	const cookieData = getCookie('intervalTimerSettings');
	if (cookieData) {
		try {
			const settings = JSON.parse(cookieData);
			setSelect.value = settings.sets;
			prepSelect.value = settings.prep;
			workSelect.value = settings.work;
			restSelect.value = settings.rest;
		} catch (error) {
			console.error('Error parsing settings cookie:', error);
		}
	}

	// Initialize the timer display based on current values.
	resetTimer();
});
