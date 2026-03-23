function showTab(tabId) {
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    event.currentTarget.classList.add('active');
}

const input = document.getElementById('input');
const hex = document.getElementById('hex');
const uni = document.getElementById('unicode');
const decE = document.getElementById('decE');
const hexE = document.getElementById('hexE');
const b64 = document.getElementById('b64');
const url = document.getElementById('url');

input.addEventListener('input', () => {
    const val = input.value;
    if (!val) { [hex, uni, decE, hexE, b64, url].forEach(e => e.value = ""); return; }

    hex.value = Array.from(new TextEncoder().encode(val)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    uni.value = val.split('').map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('');
    decE.value = val.split('').map(c => `&#${c.charCodeAt(0)};`).join('');
    hexE.value = val.split('').map(c => `&#x${c.charCodeAt(0).toString(16)};`).join('');
    try { b64.value = btoa(unescape(encodeURIComponent(val))); } catch (e) { b64.value = "Error"; }
    url.value = encodeURIComponent(val);
});

const res = document.getElementById('result');

document.getElementById('d-b64').addEventListener('input', (e) => {
    try { res.value = decodeURIComponent(escape(atob(e.target.value))); } catch (err) { res.value = "Invalid Base64"; }
});

document.getElementById('d-ent').addEventListener('input', (e) => {
    const d = document.createElement('div');
    d.innerHTML = e.target.value;
    res.value = d.textContent;
});

document.getElementById('d-hex').addEventListener('input', (e) => {
    try {
        const arr = e.target.value.trim().split(/\s+/).map(h => parseInt(h, 16));
        res.value = new TextDecoder().decode(new Uint8Array(arr));
    } catch (err) { res.value = "Invalid Hex"; }
});

document.getElementById('d-url').addEventListener('input', (e) => {
    try { res.value = decodeURIComponent(e.target.value); } catch (err) { res.value = "Invalid URL"; }
});

function copy(id) {
    const target = document.getElementById(id);
    target.select();
    document.execCommand('copy');
}