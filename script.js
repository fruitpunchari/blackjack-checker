// ======================================================
// Blackjack Hole Card Checker
// Version 2.0
// TensorFlow.js + Teachable Machine
// ======================================================

// ----------------------------
// Model
// ----------------------------

const MODEL_URL = "./my_model/";

let model = null;

// ----------------------------
// Camera
// ----------------------------

const video = document.getElementById("video");

let stream = null;

// ----------------------------
// UI
// ----------------------------

const statusText = document.getElementById("status");

const scannerTitle =
    document.getElementById("scannerTitle");

// ----------------------------
// Settings
// ----------------------------

const CONFIDENCE_THRESHOLD = 0.95;

const REQUIRED_STREAK = 5;

const SCAN_INTERVAL = 200;

const COUNTDOWN_SECONDS = 3;

const SCAN_TIMEOUT = 10000;

// ----------------------------
// Runtime variables
// ----------------------------

let dealerMode = null;

let scanTimer = null;

let timeoutTimer = null;

let previousPrediction = "";

let currentStreak = 0;

let scanningEnabled = false;

// ======================================================
// Load AI Model
// ======================================================

async function loadModel() {

    if (model !== null)
        return;

    statusText.innerText =
        "Loading AI model...";

    model = await tmImage.load(

        MODEL_URL + "model.json",

        MODEL_URL + "metadata.json"

    );

}

// ======================================================
// Start Scan
// ======================================================

async function startScan(mode) {

    dealerMode = mode;

    previousPrediction = "";

    currentStreak = 0;

    scanningEnabled = false;

    document
        .getElementById("menu")
        .classList
        .add("hidden");

    document
        .getElementById("scanner")
        .classList
        .remove("hidden");

    scannerTitle.innerText =
        "Preparing Camera...";

    statusText.innerText =
        "Loading AI...";

    try {

        await loadModel();

        stream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    facingMode: "user"

                }

            });

        video.srcObject = stream;

        await video.play();

        await beginCountdown();

    }

    catch (err) {

        console.log(err);

        finishError(
            "Unable to access camera."
        );

    }

}

// ======================================================
// Countdown
// ======================================================

async function beginCountdown() {

    scannerTitle.innerText =
        "Position Card";

    for (

        let i = COUNTDOWN_SECONDS;

        i >= 1;

        i--

    ) {

        statusText.innerText =

            "Scanning begins in\n\n" + i;

        await sleep(1000);

    }

    scannerTitle.innerText =
        "Scanning";

    scanningEnabled = true;

    timeoutTimer =

        setTimeout(

            timeoutReached,

            SCAN_TIMEOUT

        );

    scanTimer =

        setInterval(

            scanFrame,

            SCAN_INTERVAL

        );

}

// ======================================================
// Main Scan Loop
// ======================================================

async function scanFrame() {

    if (!scanningEnabled)
        return;

    if (video.videoWidth === 0)
        return;

    const predictions =

        await model.predict(video);

    let best = predictions[0];

    for (

        let i = 1;

        i < predictions.length;

        i++

    ) {

        if (

            predictions[i].probability >

            best.probability

        ) {

            best = predictions[i];

        }

    }

    if (

        best.probability <

        CONFIDENCE_THRESHOLD

    ) {

        statusText.innerText =

            "Waiting for a confident prediction...";

        return;

    }

    updatePrediction(best);

}

// ======================================================
// Prediction Stability
// ======================================================

function updatePrediction(prediction) {

    const name = prediction.className;

    const confidence =

        prediction.probability;

    if (

        name === previousPrediction

    ) {

        currentStreak++;

    }

    else {

        previousPrediction = name;

        currentStreak = 1;

    }

    statusText.innerText =

        "Prediction\n\n" +

        name +

        "\n\nConfidence\n\n" +

        (confidence * 100).toFixed(1) +

        "%\n\nStable\n\n" +

        currentStreak +

        " / " +

        REQUIRED_STREAK;

    if (

        currentStreak >=

        REQUIRED_STREAK

    ) {

        decideResult(name);

    }

}

// ======================================================
// Decide Blackjack
// ======================================================

function decideResult(className) {

    let blackjack = false;

    if (dealerMode === "ten") {

        blackjack = (className === "ACE");

    } else {

        blackjack = (className === "TEN_VALUE");

    }

    if (blackjack) {

        finishResult("BLACKJACK");

    } else {

        finishResult("NO BLACKJACK");

    }

}

// ======================================================
// Timeout
// ======================================================

function timeoutReached() {

    finishError(
        "Unable to identify card.\n\nPlease try again."
    );

}

// ======================================================
// Finish Result
// ======================================================

function finishResult(message) {

    stopScanning();

    document
        .getElementById("scanner")
        .classList
        .add("hidden");

    document
        .getElementById("result")
        .classList
        .remove("hidden");

    document
        .getElementById("resultText")
        .innerText = message;

}

// ======================================================
// Finish Error
// ======================================================

function finishError(message) {

    stopScanning();

    document
        .getElementById("scanner")
        .classList
        .add("hidden");

    document
        .getElementById("result")
        .classList
        .remove("hidden");

    document
        .getElementById("resultText")
        .innerText = message;

}

// ======================================================
// Stop Everything
// ======================================================

function stopScanning() {

    scanningEnabled = false;

    clearInterval(scanTimer);

    clearTimeout(timeoutTimer);

    scanTimer = null;

    timeoutTimer = null;

    if (stream) {

        stream
            .getTracks()
            .forEach(track => track.stop());

        stream = null;

    }

}

// ======================================================
// Reset
// ======================================================

function resetApp() {

    stopScanning();

    previousPrediction = "";

    currentStreak = 0;

    dealerMode = null;

    document
        .getElementById("result")
        .classList
        .add("hidden");

    document
        .getElementById("scanner")
        .classList
        .add("hidden");

    document
        .getElementById("menu")
        .classList
        .remove("hidden");

}

// ======================================================
// Utility
// ======================================================

function sleep(ms) {

    return new Promise(resolve =>

        setTimeout(resolve, ms)

    );

}
