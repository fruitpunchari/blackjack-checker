// ===========================================================
// Blackjack Checker
// Client
// ===========================================================

// -----------------------------------------------------------
// Constants
// -----------------------------------------------------------

const STORAGE_KEY = "blackjack_server";

const COUNTDOWN_SECONDS = 3;

const IMAGE_WIDTH = 800;

const JPEG_QUALITY = 0.85;

// -----------------------------------------------------------
// Runtime Variables
// -----------------------------------------------------------

let serverURL = "";

let dealerMode = "";

let stream = null;

// -----------------------------------------------------------
// DOM
// -----------------------------------------------------------

const setupScreen = document.getElementById("setupScreen");

const menuScreen = document.getElementById("menuScreen");

const scannerScreen = document.getElementById("scannerScreen");

const resultScreen = document.getElementById("resultScreen");

const serverInput = document.getElementById("serverInput");

const video = document.getElementById("video");

const statusText = document.getElementById("status");

const scannerTitle = document.getElementById("scannerTitle");

const resultText = document.getElementById("resultText");

// ===========================================================
// Startup
// ===========================================================

window.onload = function () {

    serverURL = localStorage.getItem(STORAGE_KEY);

    if (serverURL) {

        showMenu();

    }

    else {

        showSetup();

    }

};

// ===========================================================
// Screen Helpers
// ===========================================================

function hideAllScreens() {

    setupScreen.classList.add("hidden");

    menuScreen.classList.add("hidden");

    scannerScreen.classList.add("hidden");

    resultScreen.classList.add("hidden");

}

function showSetup() {

    hideAllScreens();

    setupScreen.classList.remove("hidden");

}

function showMenu() {

    hideAllScreens();

    menuScreen.classList.remove("hidden");

}

function showScanner() {

    hideAllScreens();

    scannerScreen.classList.remove("hidden");

}

function showResult(message) {

    hideAllScreens();

    resultScreen.classList.remove("hidden");

    resultText.innerText = message;

}

// ===========================================================
// Server Settings
// ===========================================================

function saveServer() {

    const value = serverInput.value.trim();

    if (value.length === 0) {

        alert("Please enter a server address.");

        return;

    }

    serverURL = value;

    localStorage.setItem(

        STORAGE_KEY,

        serverURL

    );

    showMenu();

}

function changeServer() {

    localStorage.removeItem(STORAGE_KEY);

    serverInput.value = "";

    showSetup();

}

// ===========================================================
// Camera
// ===========================================================

async function startScan(mode) {

    dealerMode = mode;

    showScanner();

    scannerTitle.innerText = "Preparing Camera...";

    statusText.innerText = "Requesting camera permission...";

    try {

        stream = await navigator.mediaDevices.getUserMedia({

            video: {

                facingMode: "user"

            }

        });

        video.srcObject = stream;

        await video.play();

        await beginCountdown();

    }

    catch (err) {

        console.error(err);

        showResult("Unable to access camera.");

    }

}

// ===========================================================
// Countdown
// ===========================================================

async function beginCountdown() {

    scannerTitle.innerText = "Position Card";

    for (

        let i = COUNTDOWN_SECONDS;

        i >= 1;

        i--

    ) {

        statusText.innerText =

            "Capturing image in\n\n" + i;

        await sleep(1000);

    }

    scannerTitle.innerText = "Capturing...";

    statusText.innerText =

        "Taking photo...";

    captureFrame();

}

// ===========================================================
// Stop Camera
// ===========================================================

function stopCamera() {

    if (!stream)
        return;

    stream

        .getTracks()

        .forEach(track => track.stop());

    stream = null;

}

// ===========================================================
// Capture + Upload
// ===========================================================

async function captureFrame() {

    try {

        const canvas = document.createElement("canvas");

        const scale = IMAGE_WIDTH / video.videoWidth;

        canvas.width = IMAGE_WIDTH;

        canvas.height = Math.round(

            video.videoHeight * scale

        );

        const ctx = canvas.getContext("2d");

        ctx.drawImage(

            video,

            0,

            0,

            canvas.width,

            canvas.height

        );

        statusText.innerText =
            "Compressing image...";

        canvas.toBlob(

            async function(blob) {

                if (!blob) {

                    showResult(
                        "Unable to capture image."
                    );

                    stopCamera();

                    return;

                }

                await uploadImage(blob);

            },

            "image/jpeg",

            JPEG_QUALITY

        );

    }

    catch (err) {

        console.error(err);

        stopCamera();

        showResult(
            "Camera error."
        );

    }

}

// ===========================================================
// Upload to FastAPI
// ===========================================================

async function uploadImage(blob) {

    statusText.innerText =
        "Sending image to AI...";

    const formData = new FormData();

    formData.append(

        "file",

        blob,

        "frame.jpg"

    );

    formData.append(

        "dealer_mode",

        dealerMode

    );

    try {

        const response = await fetch(

            serverURL + "/analyze",

            {

                method: "POST",

                body: formData

            }

        );

        if (!response.ok) {

            throw new Error(

                "Server returned " +

                response.status

            );

        }

        statusText.innerText =
            "Gemini is analyzing...";

        const data = await response.json();

        stopCamera();

        handleServerResponse(data);

    }

    catch (err) {

        console.error(err);

        stopCamera();

        showResult(

            "Unable to contact AI server."

        );

    }

}

// ===========================================================
// Handle AI Response
// ===========================================================

function handleServerResponse(data) {

    if (!data.result) {

        showResult(

            "Invalid server response."

        );

        return;

    }

    switch (

        data.result

    ) {

        case "BLACKJACK":

            showResult(

                "BLACKJACK"

            );

            break;

        case "NO_BLACKJACK":

            showResult(

                "NO BLACKJACK"

            );

            break;

        case "NO_CARD":

            showResult(

                "Unable to identify card."

            );

            break;

        default:

            showResult(

                "Unexpected AI response."

            );

    }

}
