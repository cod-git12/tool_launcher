
const resultArea = document.getElementById('scan-result');
const qrContainer = document.getElementById("qrcode");
const downloadBtn = document.getElementById("download-btn");
let stream = null;

function showSection(id) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    resultArea.innerText = "QRコードをスキャンしてください";
}

const qrcode = new QRCode(qrContainer, {
    width: 200,
    height: 200,
    correctLevel: QRCode.CorrectLevel.H
});

function generateQR() {
    const text = document.getElementById("qr-input").value;
    if (text) {
        qrcode.makeCode(text);
        qrContainer.style.display = "block";
        downloadBtn.style.display = "block";
    }
}

function downloadQR() {
    const img = qrContainer.querySelector("img");
    if (img) {
        const link = document.createElement("a");
        link.href = img.src;
        link.download = "qrcode.png";
        link.click();
    }
}

async function startCamera() {
    const video = document.getElementById('video');
    video.style.display = "block";
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        video.srcObject = stream;
        video.play();
        requestAnimationFrame(tick);
    } catch (err) {
        resultArea.innerText = "カメラの起動に失敗しました。";
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        document.getElementById('video').style.display = "none";
    }
}

function tick() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
            resultArea.innerHTML = `<strong>検出成功:</strong><br>${code.data}`;
            if (code.data.startsWith('http')) {
                resultArea.innerHTML += `<br><a href="${code.data}" target="_blank" style="color:var(--primary); font-weight:bold;">[ リンクを開く ]</a>`;
            }
        }
    }
    if (document.getElementById('camera-sec').classList.contains('active')) {
        requestAnimationFrame(tick);
    }
}

document.getElementById('file-input').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;
    showSection('camera-sec');
    document.getElementById('video').style.display = "none";

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.onload = function () {
            const canvas = document.getElementById('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                resultArea.innerHTML = `<strong>画像から検出:</strong><br>${code.data}`;
            } else {
                resultArea.innerText = "QRコードが見つかりませんでした。";
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});