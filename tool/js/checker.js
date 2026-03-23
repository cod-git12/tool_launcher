const HASH_RATE = 1e14;
const SEQUENCES = ["qwertyuiopasdfghjklzxcvbnm", "1234567890"];

function analyze() {
    const pw = document.getElementById('pwInput').value;
    const fill = document.getElementById('meterFill');
    const sText = document.getElementById('strengthText');
    const pText = document.getElementById('percentText');
    const eText = document.getElementById('entropyVal');
    const tText = document.getElementById('crackTime');
    const fList = document.getElementById('feedbackList');

    if (!pw) { resetUI(); return; }

    let feedback = [];
    let isPattern = false;

    let pool = 0;
    if (/[a-z]/.test(pw)) pool += 26;
    if (/[A-Z]/.test(pw)) pool += 26;
    if (/[0-9]/.test(pw)) pool += 10;
    if (/[^A-Za-z0-9]/.test(pw)) pool += 32;
    let entropy = Math.floor(pw.length * Math.log2(pool || 1));

    const lowerPw = pw.toLowerCase();
    SEQUENCES.forEach(seq => {
        for (let i = 0; i < seq.length - 3; i++) {
            const chunk = seq.substring(i, i + 4);
            if (lowerPw.includes(chunk)) { feedback.push(`並び順「${chunk}」を検知`); isPattern = true; }
        }
    });

    if (isPattern) entropy = Math.min(entropy, 28);

    let seconds = Math.pow(2, entropy) / HASH_RATE;
    tText.innerText = formatTime(seconds);

    let score = Math.min((entropy / 100) * 100, 100);
    if (isPattern) score = Math.min(score, 20);

    fill.style.width = score + "%";
    pText.innerText = Math.floor(score) + "%";
    eText.innerText = entropy + " bits";

    let color = "var(--danger)";
    let status = "危険";
    if (score > 80) { color = "var(--success)"; status = "強力"; }
    else if (score > 50) { color = "var(--info)"; status = "良好"; }
    else if (score > 25) { color = "var(--warning)"; status = "注意"; }

    fill.style.background = color;
    sText.innerText = status;
    sText.style.color = color;
    fList.innerHTML = feedback.map(f => `<li>${f}</li>`).join('');
}

function formatTime(s) {
    if (s < 1) return "一瞬";
    if (s < 3600) return "数分以内";
    if (s < 86400) return "1日以内";
    let years = s / 31536000;
    if (years < 1) return "数ヶ月";
    if (years > 1000000) return "100万年以上";
    return Math.floor(years) + " 年";
}

function resetUI() {
    document.getElementById('meterFill').style.width = "0%";
    document.getElementById('strengthText').innerText = "Waiting...";
    document.getElementById('strengthText').style.color = "var(--text-light)";
    document.getElementById('percentText').innerText = "0%";
    document.getElementById('entropyVal').innerText = "0 bits";
    document.getElementById('crackTime').innerText = "---";
    document.getElementById('feedbackList').innerHTML = "";
}

function toggleView() {
    const input = document.getElementById('pwInput');
    input.type = input.type === 'password' ? 'text' : 'password';
}

async function copy() {
    const val = document.getElementById('pwInput').value;
    if (!val) return;
    await navigator.clipboard.writeText(val);
    const toast = document.getElementById('toast');
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 2000);
}

function generate() {
    const len = document.getElementById('genLen').value;
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
    let res = "";
    for (let i = 0; i < len; i++) res += chars[Math.floor(Math.random() * chars.length)];
    const input = document.getElementById('pwInput');
    input.value = res;
    input.type = "text";
    analyze();
}