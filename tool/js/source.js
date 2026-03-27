const gasUrl = "https://script.google.com/macros/s/AKfycbxpHlHa4FobKNtyos9EL_slYfAAw3v4YS9-Ic6dZ99xYAUrij2s4k0wrLEZwISNYeOTwA/exec";

let siteData = { all: "", html: "", css: "", js: "", uploadedContent: "" };
let currentMode = "all";

async function fetchViaGas(url) {
    try {
        const r = await fetch(`${gasUrl}?url=${encodeURIComponent(url)}`);
        if (!r.ok) throw new Error();
        return await r.text();
    } catch (e) {
        return `/* 取得失敗: ${url} */`;
    }
}

document.getElementById('landingUrlInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loadSite();
});

async function loadSite() {
    const lInput = document.getElementById('landingUrlInput');
    const urlInput = lInput ? lInput.value.trim() : "";
    if (!urlInput) return alert("URLを入力してください");

    let targetUrl = urlInput.startsWith('http') ? urlInput : 'https://' + urlInput;
    const loader = document.getElementById('loader-overlay');
    loader.style.display = 'flex';
    document.getElementById('loader-text').innerText = "HTMLを取得中...";

    try {
        const raw = await fetchViaGas(targetUrl);
        await processRawHtml(raw, targetUrl);
    } catch (e) {
        alert("取得失敗しました。");
        loader.style.display = 'none';
    }
}

function buildExplorer(baseUrl, jsUrls, cssUrls) {
    const container = document.getElementById('tree-content');
    if (!container) return;
    container.innerHTML = "";
    if (baseUrl === "local-file") {
        createFolderElement(container, "Uploaded File", [{ name: "index.html", url: "local-file", type: "html" }]);
    } else if (baseUrl === "local-folder") {
        const files = Object.keys(folderFiles).map(path => ({
            name: path,
            url: path,
            type: path.split('.').pop()
        }));
        createFolderElement(container, "Project Folder", files);
    } else {
        createFolderElement(container, "HTML", [{ name: "index.html", url: baseUrl, type: "html" }]);
        if (cssUrls.length > 0) {
            const cssFiles = cssUrls.map(url => ({ name: url.split('/').pop() || 'style.css', url: url, type: "css" }));
            createFolderElement(container, "CSS Styles", cssFiles);
        }
        if (jsUrls.length > 0) {
            const jsFiles = jsUrls.map(url => ({ name: url.split('/').pop() || 'script.js', url: url, type: "js" }));
            createFolderElement(container, "Scripts", jsFiles);
        }
    }
}

async function viewExplorerFile(url, element) {
    const display = document.getElementById('explorer-code-display');
    const pre = document.getElementById('explorer-pre');
    document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    display.textContent = "読み込み中...";
    const content = await fetchViaGas(url);
    display.textContent = content;

    let lang = "language-javascript";
    if (url.endsWith(".css")) lang = "language-css";
    if (url.endsWith(".html") || url.includes("index")) lang = "language-html";

    display.className = lang;
    Prism.highlightElement(display);

    setTimeout(() => Prism.plugins.lineNumbers.resize(pre), 50);
}

async function renderCode(contentOrUrl, isUrl = false) {
    const mainCode = document.getElementById('code-display');
    const explorerCode = document.getElementById('explorer-code-display');
    const explorerPre = document.getElementById('explorer-pre');
    const mainPre = document.getElementById('pre-container');
    const target = isUrl ? explorerCode : mainCode;
    const parentPre = isUrl ? explorerPre : mainPre;
    if (!target) return;
    target.textContent = "読み込み中...";
    let text = "";
    if (isUrl) {
        if (folderFiles && folderFiles[contentOrUrl]) {
            text = folderFiles[contentOrUrl];
        } else if (contentOrUrl === "local-file" || contentOrUrl === "local-folder" || contentOrUrl.includes("UploadedFile")) {
            text = siteData.uploadedContent;
        } else {
            text = await fetchViaGas(contentOrUrl);
        }
    } else {
        text = contentOrUrl;
    }
    target.textContent = text || "ソースがありません。";
    let lang = "language-html";
    const urlStr = String(contentOrUrl).toLowerCase();
    if (urlStr.endsWith(".css") || (!isUrl && currentMode === "css")) lang = "language-css";
    else if (urlStr.endsWith(".js") || (!isUrl && currentMode === "js")) lang = "language-javascript";
    target.className = lang;
    if (document.getElementById('highlightToggle').checked && text) {
        Prism.highlightElement(target);
        setTimeout(() => {
            if (Prism.plugins.lineNumbers && parentPre) Prism.plugins.lineNumbers.resize(parentPre);
            window.dispatchEvent(new Event('resize'));
        }, 50);
    }
}

function updateView() {
    const code = document.getElementById('code-display');
    const pre = document.getElementById('pre-container');
    const isHighlight = document.getElementById('highlightToggle').checked;

    let lang = "language-html";
    if (currentMode === "css") lang = "language-css";
    if (currentMode === "js") lang = "language-javascript";

    code.className = lang;
    code.textContent = siteData[currentMode] || "ソースがありません。";

    if (isHighlight) {
        Prism.highlightElement(code);
        setTimeout(() => {
            Prism.plugins.lineNumbers.resize(pre);
            window.dispatchEvent(new Event('resize'));
        }, 100);
    }
}

function toggleWrap() {
    const pre = document.getElementById('pre-container');
    const expPre = document.getElementById('explorer-pre');
    const isWrap = document.getElementById('wrapToggle').checked;

    [pre, expPre].forEach(p => {
        if (p) {
            p.classList.toggle('wrap-on', isWrap);
            Prism.plugins.lineNumbers.resize(p);
        }
    });
    window.dispatchEvent(new Event('resize'));
}

function resetTool() {
    location.reload();
}

function switchMainTab(type) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${type}`).classList.add('active');
    document.getElementById(`panel-${type}`).classList.add('active');

    const subTabs = document.getElementById('subTabContainer');
    if (type === 'source') {
        subTabs.classList.remove('hide');
        updateView();
    } else {
        subTabs.classList.add('hide');
    }
}

function switchSubTab(mode) {
    currentMode = mode;
    document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
    event.currentTarget.classList.add('active');
    updateView();
}

function toggleSidebar() {
    const wrapper = document.querySelector('.explorer-wrapper');
    const openBtn = document.getElementById('sidebar-open-btn');
    const isCollapsed = wrapper.classList.toggle('collapsed');

    openBtn.style.display = isCollapsed ? 'flex' : 'none';

    setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
    }, 310);
}

function toggleFolder(element) {
    element.classList.toggle('open');
}

function createTreeElement(item, depth = 0) {
    const container = document.createElement('div');

    const el = document.createElement('div');
    el.className = `tree-item ${item.type === 'folder' ? 'tree-folder' : 'tree-file'}`;
    el.style.setProperty('--depth', depth);
    if (depth > 0) el.style.setProperty('--show-line', 'block');

    const iconClass = item.type === 'folder' ? 'fas fa-chevron-right' : getFileIcon(item.name);
    el.innerHTML = `<i class="${iconClass}"></i> <span>${item.name}</span>`;

    if (item.type === 'folder') {
        el.onclick = (e) => {
            e.stopPropagation();
            toggleFolder(el);
        };

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'tree-children';

        item.children.forEach(child => {
            childrenContainer.appendChild(createTreeElement(child, depth + 1));
        });

        container.appendChild(el);
        container.appendChild(childrenContainer);
    } else {
        el.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
            el.classList.add('selected');
            renderCode(item.url, true);
        };
        container.appendChild(el);
    }

    return container;
}

function getFileIcon(fileName) {
    if (fileName.endsWith('.html')) return 'fab fa-html5';
    if (fileName.endsWith('.css')) return 'fab fa-css3-alt';
    if (fileName.endsWith('.js')) return 'fab fa-js';
    return 'far fa-file-code';
}

function toggleSidebar() {
    const wrapper = document.querySelector('.explorer-wrapper');
    const openBtn = document.getElementById('sidebar-open-btn');
    const isCollapsed = wrapper.classList.toggle('collapsed');
    openBtn.style.display = isCollapsed ? 'flex' : 'none';
    setTimeout(() => { window.dispatchEvent(new Event('resize')); }, 310);
}

function toggleFolder(el) {
    el.classList.toggle('open');
}

function createFolderElement(parent, folderName, files) {
    const folderWrap = document.createElement('div');

    const folderEl = document.createElement('div');
    folderEl.className = 'tree-item tree-folder open';
    folderEl.innerHTML = `<i class="fas fa-chevron-right arrow-icon"></i> <i class="fas fa-folder"></i> <span>${folderName}</span>`;
    folderEl.onclick = () => toggleFolder(folderEl);

    const childrenCont = document.createElement('div');
    childrenCont.className = 'tree-children';

    files.forEach(file => {
        const fileEl = document.createElement('div');
        fileEl.className = 'tree-item tree-file';
        const icon = file.type === 'html' ? 'fab fa-html5' : (file.type === 'css' ? 'fab fa-css3-alt' : 'fab fa-js');
        fileEl.innerHTML = `<i class="${icon}"></i> <span>${file.name}</span>`;

        fileEl.onclick = async (e) => {
            e.stopPropagation();

            document.querySelectorAll('.tree-item').forEach(item => item.classList.remove('selected'));
            fileEl.classList.add('selected');

            await renderCode(file.url, true);
        };
        childrenCont.appendChild(fileEl);
    });

    folderWrap.appendChild(folderEl);
    folderWrap.appendChild(childrenCont);
    parent.appendChild(folderWrap);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const loader = document.getElementById('loader-overlay');
    loader.style.display = 'flex';
    document.getElementById('loader-text').innerText = "ファイルを読み込み中...";
    const reader = new FileReader();
    reader.onload = async (e) => {
        const rawHtml = e.target.result;
        siteData.uploadedContent = rawHtml;
        folderFiles = {};
        await processRawHtml(rawHtml, "local-file");
    };
    reader.readAsText(file);
}

async function handleFolderUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const loader = document.getElementById('loader-overlay');
    loader.style.display = 'flex';
    document.getElementById('loader-text').innerText = "フォルダーを解析中...";
    folderFiles = {};
    let indexHtmlContent = "";
    for (const file of files) {
        const path = file.webkitRelativePath;
        const content = await file.text();
        folderFiles[path] = content;
        if (path.endsWith("index.html") && !indexHtmlContent) indexHtmlContent = content;
    }
    const firstPath = Object.keys(folderFiles)[0];
    const initialContent = indexHtmlContent || folderFiles[firstPath];
    siteData.uploadedContent = initialContent;
    await processRawHtml(initialContent, "local-folder");
}

function buildFolderExplorer(files) {
    const container = document.getElementById('tree-content');
    container.innerHTML = "";

    const sortedPaths = Array.from(files).map(f => f.webkitRelativePath).sort();

    sortedPaths.forEach(path => {
        const parts = path.split('/');
        const fileName = parts.pop();
        const folderName = parts.join('/') || "Root";

        const fileEl = document.createElement('div');
        fileEl.className = 'tree-item tree-file';
        fileEl.innerHTML = `<i class="${getFileIcon(fileName)}"></i> <span>${path}</span>`;
        fileEl.onclick = () => {
            document.querySelectorAll('.tree-item').forEach(i => i.classList.remove('selected'));
            fileEl.classList.add('selected');
            renderCode(path, true);
        };
        container.appendChild(fileEl);
    });
}

async function processRawHtml(raw, baseUrl) {
    const bar = document.getElementById('progress-bar');
    const loaderText = document.getElementById('loader-text');
    const isLocal = (baseUrl === "local-file" || baseUrl === "local-folder");
    try {
        bar.style.width = '40%';
        loaderText.innerText = "リソースを解析中...";
        const parser = new DOMParser();
        const docObj = parser.parseFromString(raw, "text/html");
        let jsUrls = [], cssUrls = [];
        if (!isLocal) {
            const scriptTags = Array.from(docObj.querySelectorAll('script[src]'));
            const styleTags = Array.from(docObj.querySelectorAll('link[rel="stylesheet"]'));
            jsUrls = [...new Set(scriptTags.map(tag => new URL(tag.getAttribute('src'), baseUrl).href))];
            cssUrls = [...new Set(styleTags.map(tag => new URL(tag.getAttribute('href'), baseUrl).href))];
        }
        const cssPromises = cssUrls.map(url => fetchViaGas(url).then(text => `/* --- External: ${url} --- */\n${text}`));
        const jsPromises = jsUrls.map(url => fetchViaGas(url).then(text => `// --- External: ${url} ---\n${text}`));
        const externalCssArr = await Promise.all(cssPromises);
        const externalJsArr = await Promise.all(jsPromises);
        bar.style.width = '70%';
        loaderText.innerText = "エクスプローラーを構築中...";
        buildExplorer(baseUrl, jsUrls, cssUrls);
        let inlineCss = [...raw.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n\n");
        let inlineJs = [...raw.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join("\n\n");
        siteData.all = raw;
        siteData.css = (externalCssArr.join("\n\n") || "/* 外部CSSなし */") + "\n\n/* --- Inline --- */\n\n" + inlineCss;
        siteData.js = (externalJsArr.join("\n\n") || "// 外部JSなし") + "\n\n/* --- Inline --- */\n\n" + inlineJs;
        siteData.html = raw.replace(/<style[^>]*>[\s\S]*?<\/style>/g, "").replace(/<script[^>]*>[\s\S]*?<\/script>/g, "");
        updateView();
        document.getElementById('landing-page').style.display = 'none';
        document.getElementById('main-tool').style.display = 'flex';
        document.body.className = "mode-tool";
        const frame = document.getElementById('previewFrame');
        const doc = frame.contentWindow.document;
        doc.open();
        let previewHtml = isLocal ? raw : raw.replace('<head>', `<head><base href="${baseUrl}">`);
        doc.write(previewHtml + '<script src="https://cdn.jsdelivr.net/npm/eruda"></script><script>eruda.init(); eruda.show();</script>');
        doc.close();
        bar.style.width = '100%';
        setTimeout(() => { document.getElementById('loader-overlay').style.display = 'none'; }, 400);
    } catch (e) {
        alert("解析エラー: " + e.message);
        document.getElementById('loader-overlay').style.display = 'none';
    }
}

const dropZone = document.querySelector('.upload-label');
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary)';
});
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
});