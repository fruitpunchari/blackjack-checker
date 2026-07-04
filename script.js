
// =======================================================
// Blackjack Checker — Core Engine
// Version 3.0
// =======================================================

// -------------------------------
// Model
// -------------------------------

const MODEL_URL = "./my_model/";

let model = null;

// -------------------------------
// Camera
// -------------------------------

const video = document.getElementById("video");

let stream = null;

// -------------------------------
// UI
// -------------------------------

const statusText = document.getElementById("status");
const scannerTitle = document.getElementById("scannerTitle");
const resultText = document.getElementById("resultText");

// -------------------------------
// App Configuration
// -------------------------------

const COUNTDOWN_SECONDS = 3;

const SCAN_INTERVAL = 200;

const SCAN_TIMEOUT = 10000;

const AUTOFOCUS_DELAY = 500;

const STABLE_REQUIRED = 3;

const CONFIDENCE_THRESHOLD = 0.92;

// -------------------------------
// State Machine
// -------------------------------

const STATE = {
    IDLE: "IDLE",
    LOADING: "LOADING",
    COUNTDOWN: "COUNTDOWN",
    WAITING: "WAITING",
    SCANNING: "SCANNING",
    RESULT: "RESULT",
    ERROR: "ERROR"
};

let currentState = STATE.IDLE;

// -------------------------------
// Runtime Variables
// -------------------------------

let dealerMode = null;

let scanInterval = null;

let timeoutTimer = null;

let countdownTimer = null;

let autofocusTimer = null;

// Prediction tracking

let lastClass = "";

let streak = 0;

// -------------------------------
// Model Loading
// -------------------------------

async function loadModel() {

    if (model) return;

    setState(STATE.LOADING);

    statusText.innerText = "Loading AI model...";

    model = await tmImage.load(
        MODEL_URL + "model.json",
        MODEL_URL + "metadata.json"
    );

}

// -------------------------------
// Start Scan
// -------------------------------

async function startScan(mode) {

    dealerMode = mode;

    resetRuntime();

    setState(STATE.LOADING);

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("scanner").classList.remove("hidden");

    scannerTitle.innerText = "Preparing Camera...";
    statusText.innerText = "Loading...";

    try {

        await loadModel();

        await startCamera();

        startCountdown();

    } catch (err) {

        console.error(err);
        showError("Camera or model failed to load.");

    }
}

// -------------------------------
// Camera Setup
// -------------------------------

async function startCamera() {

    stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" }
    });

    video.srcObject = stream;

    await video.play();

}

// -------------------------------
// Countdown
// -------------------------------

function startCountdown() {

    setState(STATE.COUNTDOWN);

    let t = COUNTDOWN_SECONDS;

    countdownTimer = setInterval(() => {

        statusText.innerText = `Starting in ${t}`;

        t--;

        if (t < 0) {

            clearInterval(countdownTimer);

            startScanning();

        }

    }, 1000);

}

// -------------------------------
// Begin Scanning Phase
// -------------------------------

function startScanning() {

    setState(STATE.WAITING);

    statusText.innerText = "Hold card steady...";

    autofocusTimer = setTimeout(() => {

        beginPredictionLoop();

    }, AUTOFOCUS_DELAY);

}

// -------------------------------
// Prediction loop starts in Part 2
// -------------------------------

function beginPredictionLoop() {

    setState(STATE.SCANNING);

    statusText.innerText = "Scanning...";

    timeoutTimer = setTimeout(() => {

        showError("Scan timed out.");

    }, SCAN_TIMEOUT);

    scanInterval = setInterval(scanFrame, SCAN_INTERVAL);

}

// -------------------------------
// Utility
// -------------------------------

function setState(newState) {
    currentState = newState;
}

function resetRuntime() {

    clearInterval(scanInterval);
    clearInterval(countdownTimer);
    clearTimeout(timeoutTimer);
    clearTimeout(autofocusTimer);

    scanInterval = null;
    countdownTimer = null;
    timeoutTimer = null;
    autofocusTimer = null;

    lastClass = "";
    streak = 0;
}

function showError(msg) {

    setState(STATE.ERROR);

    stopEverything();

    resultText.innerText = msg;

    document.getElementById("scanner").classList.add("hidden");
    document.getElementById("result").classList.remove("hidden");
}

// -------------------------------
// Stop camera
// -------------------------------

function stopEverything() {

    resetRuntime();

    if (stream) {

        stream.getTracks().forEach(t => t.stop());
        stream = null;

    }
}


// =======================================================
// Blackjack Checker — AI Prediction Engine
// Version 3.0
// =======================================================

// -------------------------------
// Prediction Loop
// -------------------------------

async function scanFrame() {

    if (currentState !== STATE.SCANNING) return;

    if (!model || !video.videoWidth) return;

    try {

        const predictions = await model.predict(video);

        const best = getBestPrediction(predictions);

        if (best.probability < CONFIDENCE_THRESHOLD) {

            statusText.innerText = "Looking for card...";

            resetStreak();

            return;

        }

        processPrediction(best);

    } catch (err) {

        console.error(err);

    }
}

// -------------------------------
// Get highest confidence class
// -------------------------------

function getBestPrediction(predictions) {

    let best = predictions[0];

    for (let i = 1; i < predictions.length; i++) {

        if (predictions[i].probability > best.probability) {
            best = predictions[i];
        }

    }

    return best;
}

// -------------------------------
// Stability Engine
// -------------------------------

function processPrediction(pred) {

    const className = pred.className;
    const confidence = pred.probability;

    if (className === lastClass) {

        streak++;

    } else {

        lastClass = className;
        streak = 1;
    }

    statusText.innerText =
        `Detecting...\n\n${className}\n${(confidence * 100).toFixed(1)}%\nStability ${streak}/${STABLE_REQUIRED}`;

    if (streak >= STABLE_REQUIRED) {

        evaluateResult(className);

    }
}

// -------------------------------
// Convert AI output → Blackjack logic
// -------------------------------

function evaluateResult(className) {

    let isBlackjack = false;

    // Dealer shows TEN → hole card ACE = blackjack
    if (dealerMode === "ten") {

        isBlackjack = (className === "ACE");

    }

    // Dealer shows ACE → hole card TEN/J/Q/K = blackjack
    else if (dealerMode === "ace") {

        isBlackjack =
            className === "TEN_VALUE";
    }

    finishResult(isBlackjack);

}

// -------------------------------
// Final decision
// -------------------------------

function finishResult(isBlackjack) {

    setState(STATE.RESULT);

    stopEverything();

    document.getElementById("scanner").classList.add("hidden");
    document.getElementById("result").classList.remove("hidden");

    resultText.innerText =
        isBlackjack ? "BLACKJACK" : "NO BLACKJACK";
}

// -------------------------------
// Reset streak helper
// -------------------------------

function resetStreak() {

    lastClass = "";
    streak = 0;

}

// -------------------------------
// Timeout handler (hooked from Part 1)
// -------------------------------

function showTimeout() {

    showError("Unable to detect card.");
}
