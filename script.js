const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const statusText = document.getElementById("status");

let stream = null;

let dealerMode = null;

let scanInterval = null;

let timeoutHandle = null;

let votes = {
    blackjack: 0,
    noBlackjack: 0
};

const REQUIRED_VOTES = 5;

async function startScan(mode) {

    dealerMode = mode;

    votes.blackjack = 0;
    votes.noBlackjack = 0;

    document.getElementById("menu").classList.add("hidden");
    document.getElementById("scanner").classList.remove("hidden");

    try {

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            }
        });

        video.srcObject = stream;
        
        video.play();
        
        statusText.innerText = "Scanning...";

        timeoutHandle = setTimeout(() => {

            finishError(
                "Unable to identify card."
            );

        }, 10000);

        scanInterval = setInterval(scanFrame, 700);

    } catch (err) {

        finishError(
            "Camera permission denied."
        );

    }
}

async function scanFrame() {

    if (video.videoWidth === 0) {
        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    try {

        const result = await Tesseract.recognize(
            canvas,
            "eng"
        );

        const raw = result.data.text
            .toUpperCase()
            .trim();

        console.log("OCR:", raw);
        statusText.innerText = "OCR: " + raw;

        processReading(raw);

    } catch (err) {

        console.log(err);

    }
}

function processReading(text) {

    const rank = extractRank(text);

    if (!rank) {
        return;
    }

    let blackjack = false;

    if (dealerMode === "ten") {

        blackjack = (rank === "A");

    } else {

        blackjack =
            rank === "10" ||
            rank === "J" ||
            rank === "Q" ||
            rank === "K";
    }

    if (blackjack) {

        votes.blackjack++;

    } else {

        votes.noBlackjack++;

    }

    statusText.innerText =
        `BJ Votes: ${votes.blackjack}
No BJ Votes: ${votes.noBlackjack}`;

    if (
        votes.blackjack >= REQUIRED_VOTES
    ) {

        finishResult("BLACKJACK");

    }

    if (
        votes.noBlackjack >= REQUIRED_VOTES
    ) {

        finishResult("NO BLACKJACK");

    }
}

function extractRank(text) {

    const validRanks = [
        "10",
        "A",
        "K",
        "Q",
        "J",
        "9",
        "8",
        "7",
        "6",
        "5",
        "4",
        "3",
        "2"
    ];

    for (const rank of validRanks) {

        if (text.includes(rank)) {
            return rank;
        }
    }

    return null;
}

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

function stopScanning() {

    clearInterval(scanInterval);

    clearTimeout(timeoutHandle);

    if (stream) {

        stream
            .getTracks()
            .forEach(track => track.stop());

        stream = null;
    }
}

function resetApp() {

    stopScanning();

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
