const gasUrl = "https://script.google.com/macros/s/AKfycbxpHlHa4FobKNtyos9EL_slYfAAw3v4YS9-Ic6dZ99xYAUrij2s4k0wrLEZwISNYeOTwA/exec";

let siteData = { all: "", html: "", css: "", js: "" };
let currentMode = "all"; 

async function loadSite() {
    const urlInput = document.getElementById('urlInput').value;
    if(!urlInput) return;
    
    let targetUrl = urlInput.startsWith('http') ? urlInput : 'https://' + urlInput;
    
    const loader = document.getElementById('loader-overlay');
    const bar = document.getElementById('progress-bar');
    const loaderText = document.getElementById('loader-text');
    
    loader.style.display = 'flex';
    bar.style.width = '20%';
    loaderText.innerText = "データを取得中...";

    try {
        const res = await fetch(`${gasUrl}?url=${encodeURIComponent(targetUrl)}`);
        const raw = await res.text();
        bar.style.width = '60%';

        const baseTag = `<base href="${targetUrl}">`;
        const modifiedRaw = raw.replace('<head>', '<head>' + baseTag);

        siteData.all = modifiedRaw;
        siteData.css = [...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n\n/* Block */\n\n");
        siteData.js = [...raw.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n\n// Block\n\n");
        siteData.html = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "").replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");

        updateView();

        const frame = document.getElementById('previewFrame');
        const doc = frame.contentWindow.document;
        doc.open();
        doc.write(modifiedRaw + '<script src="https://cdn.jsdelivr.net/npm/eruda"><\/script><script>eruda.init(); eruda.show();<\/script>');
        doc.close();

        bar.style.width = '100%';
        setTimeout(() => { loader.style.display = 'none'; }, 300);

    } catch (e) {
        alert("エラーが発生しました。");
        loader.style.display = 'none';
    }
}

function updateView() {
    const code = document.getElementById('code-display');
    const isHighlight = document.getElementById('highlightToggle').checked;
    
    let lang = "language-html";
    if(currentMode === "css") lang = "language-css";
    if(currentMode === "js") lang = "language-javascript";
    
    code.className = lang + " line-numbers";
    code.textContent = siteData[currentMode] || "待機中...";

    if(isHighlight) {
        setTimeout(() => {
            Prism.highlightElement(code);
        }, 10);
    }
}

function switchMainTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    if(type === 'source') {
        document.getElementById('tab-source').classList.add('active');
        document.getElementById('panel-source').classList.add('active');
        document.getElementById('subTabContainer').style.display = 'flex';
    } else {
        document.getElementById('tab-preview').classList.add('active');
        document.getElementById('panel-preview').classList.add('active');
        document.getElementById('subTabContainer').style.display = 'none';
    }
}

function switchSubTab(mode) {
    currentMode = mode;
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateView();
}