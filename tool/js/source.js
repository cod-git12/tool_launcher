const gasUrl = "https://script.google.com/macros/s/AKfycbxpHlHa4FobKNtyos9EL_slYfAAw3v4YS9-Ic6dZ99xYAUrij2s4k0wrLEZwISNYeOTwA/exec";

let siteData = { all: "", html: "", css: "", js: "", uploadedContent: "" };
let currentMode = "all";

const i18n = {
    ja: {
        heroSub: "ウェブサイトやファイルを解析してソースを表示します",
        urlTitle: "URLから解析", fileTitle: "ファイル選択", folderTitle: "フォルダー選択",
        fileBtn: "HTMLファイルを選択", folderBtn: "フォルダを選択",
        footer1: "ソース閲覧", footer2: "プレビュー", footer3: "エクスプローラー",
        wrap: "折り返し", highlight: "色付け", newUrl: "別のURLを入力",
        tab1: "ソース表示", tab2: "プレビュー", tab3: "エクスプローラー",
        explorerHint: "ファイルを左から選択してください"
    },
    en: {
        heroSub: "Analyze websites or files to view their source code",
        urlTitle: "Analyze from URL", fileTitle: "File Select", folderTitle: "Folder Select",
        fileBtn: "Select HTML File", folderBtn: "Select Folder",
        footer1: "View Source", footer2: "Preview", footer3: "Explorer",
        wrap: "Word Wrap", highlight: "Highlight", newUrl: "New URL",
        tab1: "Source", tab2: "Preview", tab3: "Explorer",
        explorerHint: "Please select a file from the left"
    }
};

function changeLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) el.innerText = i18n[lang][key];
    });
}

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

    const totalFiles = 1 + jsUrls.length + cssUrls.length;
    const autoCollapse = totalFiles > 10;

    let domain = "Website";
    try { domain = new URL(baseUrl).hostname; } catch (e) { }
    const root = { name: domain, type: "folder", children: {}, open: true };

    function addPath(url, isMain = false) {
        try {
            const u = new URL(url);
            let parts = u.pathname.split('/').filter(p => p);
            if (parts.length === 0 || isMain) parts = ["index.html"];

            let cur = root;
            parts.forEach((part, i) => {
                if (i === parts.length - 1) {
                    cur.children[part] = { name: part, type: "file", url: url };
                } else {
                    if (!cur.children[part]) {
                        cur.children[part] = { name: part, type: "folder", children: {}, open: !autoCollapse };
                    }
                    cur = cur.children[part];
                }
            });
        } catch (e) { }
    }
    addPath(baseUrl, true);
    cssUrls.forEach(u => addPath(u));
    jsUrls.forEach(u => addPath(u));
    renderTree(root, container);
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

    const urlStr = String(contentOrUrl).toLowerCase();
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/.test(urlStr);

    target.textContent = "読み込み中...";
    let text = "";

    if (isUrl) {
        if (folderFiles && folderFiles[contentOrUrl]) {
            text = folderFiles[contentOrUrl];
        } else if (contentOrUrl === "local-file" || contentOrUrl === "local-folder" || contentOrUrl.includes("UploadedFile")) {
            text = siteData.uploadedContent;
        } else {
            text = isImage ? contentOrUrl : await fetchViaGas(contentOrUrl);
        }
    } else {
        text = contentOrUrl;
    }

    if (isImage && text) {
        target.innerHTML = `
            <div class="image-preview-wrapper" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; background: #f0f0f0; min-height: 100%;">
                <img src="${text}" style="max-width: 90%; max-height: 70vh; box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: 4px; background: white;">
                <div style="margin-top: 20px; color: #666; font-family: monospace; font-size: 0.9rem;">${contentOrUrl}</div>
            </div>
        `;
        target.className = "";
        return;
    }

    target.textContent = text || "ソースがありません。";

    let lang = "language-html";
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
    const loaderText = document.getElementById('loader-text');
    loader.style.display = 'flex';
    loaderText.innerText = "フォルダーをスキャン中...";

    folderFiles = {};
    let indexHtmlContent = "";

    const imageRegex = /\.(png|jpe?g|gif|webp|svg)$/i;

    for (const file of files) {
        const path = file.webkitRelativePath;

        if (imageRegex.test(file.name)) {
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            folderFiles[path] = dataUrl;
        } else {
            const content = await file.text();
            folderFiles[path] = content;

            if (path.endsWith("index.html") && !indexHtmlContent) {
                indexHtmlContent = content;
            }
        }
    }

    const firstPath = Object.keys(folderFiles)[0];
    const initialContent = indexHtmlContent || folderFiles[firstPath];

    siteData.uploadedContent = initialContent;

    await processRawHtml(initialContent, "local-folder");
}

function buildExplorer(baseUrl, jsUrls, cssUrls) {
    const container = document.getElementById('tree-content');
    if (!container) return;
    container.innerHTML = "";

    if (baseUrl === "local-file") {
        const fileRoot = { name: "Uploaded File", type: "folder", children: { "index.html": { name: "index.html", type: "file", url: "local-file" } }, open: true };
        renderTree(fileRoot, container);
        return;
    }

    let domainName = "Website";
    try { domainName = new URL(baseUrl).hostname; } catch (e) { }

    const root = { name: domainName, type: "folder", children: {}, open: true };

    function addPathToTree(targetUrl, isMainHtml = false) {
        try {
            const parsedUrl = new URL(targetUrl);
            let parts = parsedUrl.pathname.split('/').filter(p => p);

            if (parts.length === 0 || isMainHtml) {
                parts = ["index.html"];
            }

            let current = root;
            parts.forEach((part, index) => {
                if (index === parts.length - 1) {
                    let cleanName = part.split('?')[0];
                    if (!cleanName) cleanName = "file";
                    current.children[cleanName] = { name: cleanName, type: "file", url: targetUrl };
                } else {
                    if (!current.children[part]) {
                        current.children[part] = { name: part, type: "folder", children: {}, open: true };
                    }
                    current = current.children[part];
                }
            });
        } catch (e) {
            let fallbackName = targetUrl.split('/').pop() || "unknown";
            root.children[fallbackName] = { name: fallbackName, type: "file", url: targetUrl };
        }
    }

    addPathToTree(baseUrl, true);
    cssUrls.forEach(url => addPathToTree(url));
    jsUrls.forEach(url => addPathToTree(url));

    renderTree(root, container);
}

async function processRawHtml(raw, baseUrl) {
    const bar = document.getElementById('progress-bar');
    const percentText = document.getElementById('progress-percent');
    const loaderText = document.getElementById('loader-text');
    const isLocal = (baseUrl === "local-file" || baseUrl === "local-folder");

    const updateProgress = (pct, text) => {
        if (bar) bar.style.width = pct + '%';
        if (percentText) percentText.innerText = pct + '%';
        if (loaderText) loaderText.innerText = text;
    };

    try {
        updateProgress(10, "HTML構造を解析中...");
        const parser = new DOMParser();
        const docObj = parser.parseFromString(raw, "text/html");

        let externalCssArr = [];
        let externalJsArr = [];
        let jsUrls = [];
        let cssUrls = [];

        if (!isLocal) {
            updateProgress(30, "外部リソースのURLを抽出中...");
            const scriptTags = Array.from(docObj.querySelectorAll('script[src]'));
            const styleTags = Array.from(docObj.querySelectorAll('link[rel="stylesheet"]'));

            jsUrls = [...new Set(scriptTags.map(tag => new URL(tag.getAttribute('src'), baseUrl).href))];
            cssUrls = [...new Set(styleTags.map(tag => new URL(tag.getAttribute('href'), baseUrl).href))];

            updateProgress(50, "外部CSS/JSを取得中...");
            const cssPromises = cssUrls.map(url => fetchViaGas(url).then(text => `/* --- External: ${url} --- */\n${text}`));
            const jsPromises = jsUrls.map(url => fetchViaGas(url).then(text => `// --- External: ${url} ---\n${text}`));

            externalCssArr = await Promise.all(cssPromises);
            externalJsArr = await Promise.all(jsPromises);
        } else {
            updateProgress(50, "ローカルファイルをロード中...");
        }

        updateProgress(70, "ファイルエクスプローラーを構築中...");
        if (baseUrl === "local-folder") {
            buildFolderExplorer();
        } else {
            buildExplorer(isLocal ? "UploadedFile" : baseUrl, jsUrls, cssUrls);
        }

        updateProgress(80, "ソースコードを整理中...");
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

        updateProgress(90, "プレビュー画面をレンダリング中...");
        const frame = document.getElementById('previewFrame');
        const doc = frame.contentWindow.document;
        doc.open();

        let previewHtml = "";
        if (baseUrl === "local-folder") {
            let previewDoc = parser.parseFromString(raw, "text/html");

            previewDoc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                const href = link.getAttribute('href');
                const foundPath = Object.keys(folderFiles).find(path => path.endsWith(href));
                if (foundPath) {
                    const style = document.createElement('style');
                    style.textContent = folderFiles[foundPath];
                    link.replaceWith(style);
                }
            });

            previewDoc.querySelectorAll('script[src]').forEach(script => {
                const src = script.getAttribute('src');
                const foundPath = Object.keys(folderFiles).find(path => path.endsWith(src));
                if (foundPath) {
                    const newScript = document.createElement('script');
                    newScript.textContent = folderFiles[foundPath];
                    script.replaceWith(newScript);
                }
            });
            previewHtml = previewDoc.documentElement.innerHTML;
        } else {
            previewHtml = isLocal ? raw : raw.replace('<head>', `<head><base href="${baseUrl}">`);
        }

        doc.write(previewHtml + '<script src="https://cdn.jsdelivr.net/npm/eruda"></script><script>eruda.init(); eruda.show();</script>');
        doc.close();

        updateProgress(100, "準備が完了しました！");
        setTimeout(() => {
            document.getElementById('loader-overlay').style.display = 'none';
        }, 500);

    } catch (e) {
        console.error(e);
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

async function downloadAllFiles() {
    const zip = new JSZip();
    const isLocal = Object.keys(folderFiles).length > 0;

    if (isLocal) {
        for (const [path, content] of Object.entries(folderFiles)) {
            zip.file(path, content);
        }
    } else {
        const folder = zip.folder("site_source");
        folder.file("index.html", siteData.html || siteData.all);
        folder.file("style.css", siteData.css);
        folder.file("script.js", siteData.js);
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = "source_viewer_export.zip";
    link.click();
}

function buildFolderExplorer() {
    const container = document.getElementById('tree-content');
    if (!container) return;
    container.innerHTML = "";

    const paths = Object.keys(folderFiles);
    const autoCollapse = paths.length > 10;

    const root = { name: "Project", type: "folder", children: {}, open: true };

    paths.forEach(path => {
        const parts = path.split('/');
        let cur = root;

        parts.forEach((part, i) => {
            const isFile = (i === parts.length - 1);
            if (isFile) {
                cur.children[part] = { name: part, type: "file", path: path };
            } else {
                if (!cur.children[part]) {
                    cur.children[part] = { name: part, type: "folder", children: {}, open: !autoCollapse };
                }
                cur = cur.children[part];
            }
        });
    });

    renderTree(root, container);
}

function renderTree(node, parent) {
    const item = document.createElement('div');
    item.className = `tree-item ${node.type}`;

    if (node.open) {
        item.classList.add('open');
    }

    const icon = node.type === 'folder'
        ? '<i class="fas fa-chevron-right arrow"></i><i class="fas fa-folder"></i>'
        : '<i class="far fa-file-code"></i>';

    item.innerHTML = `${icon} <span>${node.name}</span>`;
    parent.appendChild(item);

    if (node.type === 'folder') {
        const childBox = document.createElement('div');
        childBox.className = 'tree-children';

        childBox.style.display = node.open ? 'block' : 'none';

        item.onclick = (e) => {
            e.stopPropagation();
            const nowOpen = item.classList.toggle('open');
            childBox.style.display = nowOpen ? 'block' : 'none';
        };

        Object.values(node.children).forEach(c => renderTree(c, childBox));
        parent.appendChild(childBox);
    } else {
        item.onclick = (e) => {
            e.stopPropagation();
            document.querySelectorAll('.tree-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            renderCode(node.url || node.path, true);
        };
    }
}