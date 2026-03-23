
const txt = document.getElementById('txt');
const backdrop = document.getElementById('backdrop');
const target = document.getElementById('targetWord');

function update() {
    const val = txt.value;
    const search = target.value;
    const charArray = Array.from(val);

    document.getElementById('c1').textContent = charArray.length;
    document.getElementById('c2').textContent = val.replace(/\n/g, '').length;
    document.getElementById('c3').textContent = val.replace(/\s/g, '').length;
    document.getElementById('c4').textContent = val ? val.split(/\n/).length : 0;
    document.getElementById('c5').textContent = Math.ceil(charArray.length / 400);
    document.getElementById('c6').textContent = Math.abs(val.length - charArray.length);

    const encoder8 = new TextEncoder();
    document.getElementById('c7').textContent = encoder8.encode(val).length;
    document.getElementById('c8').textContent = val.length * 2;

    let sjisLen = 0;
    for (let i = 0; i < val.length; i++) {
        const c = val.charCodeAt(i);
        (c >= 0x0 && c < 0x81) || (c === 0xf8f0) || (c >= 0xff61 && c <= 0xff9f) ? sjisLen += 1 : sjisLen += 2;
    }
    document.getElementById('c9').textContent = sjisLen;

    let highlightedText = val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n$/g, '\n\n');

    if (search) {
        const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedSearch, 'g');
        const matches = val.match(regex);
        document.getElementById('wordCount').textContent = matches ? matches.length : 0;
        highlightedText = highlightedText.replace(regex, '<mark>$&</mark>');
    } else {
        document.getElementById('wordCount').textContent = 0;
    }
    backdrop.innerHTML = highlightedText;
}

txt.addEventListener('scroll', () => { backdrop.scrollTop = txt.scrollTop; });
txt.addEventListener('input', update);
target.addEventListener('input', update);

window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        target.focus();
        target.select();
    }
});