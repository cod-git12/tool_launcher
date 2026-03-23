
const units = {
    length: { m: 1, cm: 100, mm: 1000, km: 0.001, inch: 39.3701, ft: 3.28084, yard: 1.09361, mile: 0.000621371, shaku: 3.3 },
    weight: { kg: 1, g: 1000, mg: 1000000, t: 0.001, lb: 2.20462, oz: 35.274, kan: 0.266667 },
    area: { m2: 1, km2: 0.000001, a: 0.01, ha: 0.0001, tsubo: 0.3025, tatami: 0.6047, acre: 0.000247105 },
    volume: { l: 1, ml: 1000, m3: 0.001, cup: 5, sho: 0.55435, gal: 0.264172 },
    time: { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, min: 60, sec: 1 },
    speed: { ms: 1, kmh: 3.6, knot: 1.94384, mph: 2.23694, mach: 0.00293858 },
    data: { GB: 1, MB: 1024, KB: 1048576, B: 1073741824, TB: 1 / 1024 },
    speedData: { Mbps: 1, Kbps: 1000, Gbps: 0.001, MBs: 0.125 },
    energy: { J: 1, kJ: 0.001, cal: 0.239006, kcal: 0.000239006, Wh: 0.000277778 },
    freq: { Hz: 1, kHz: 0.001, MHz: 0.000001, GHz: 1e-9 },
    press: { Pa: 1, hPa: 0.01, kPa: 0.001, MPa: 0.000001, atm: 9.86923e-6, bar: 1e-5 },
    angle: { deg: 1, rad: 0.0174533, grad: 1.11111 },
    fuel: { kml: 1, l100km: 1, mpg: 1 },
    temp: { c: 1, f: 1, k: 1 },
    currency: { jpy: 1, usd: 1, eur: 1 },
};

const labels = {
    m: 'メートル(m)', cm: 'センチ(cm)', mm: 'ミリ(mm)', km: 'キロ(km)', inch: 'インチ(in)', ft: 'フィート(ft)', yard: 'ヤード(yd)', mile: 'マイル', shaku: '尺',
    kg: 'キログラム(kg)', g: 'グラム(g)', mg: 'ミリグラム(mg)', t: 'トン(t)', lb: 'ポンド(lb)', oz: 'オンス(oz)', kan: '貫',
    m2: '平方メートル(m²)', km2: '平方キロ(km²)', a: 'アール(a)', ha: 'ヘクタール(ha)', tsubo: '坪', tatami: '畳', acre: 'エーカー',
    l: 'リットル(L)', ml: 'ミリリットル(ml)', m3: '立方メートル(m³)', cup: 'カップ', sho: '升', gal: 'ガロン(米)',
    year: '年', month: '月', week: '週', day: '日', hour: '時', min: '分', sec: '秒',
    ms: 'm/s', kmh: 'km/h', knot: 'ノット', mph: 'mph', mach: 'マッハ',
    GB: 'GB', MB: 'MB', KB: 'KB', B: 'B', TB: 'TB', Mbps: 'Mbps', Kbps: 'Kbps', Gbps: 'Gbps', MBs: 'MB/s',
    J: 'J', kJ: 'kJ', cal: 'cal', kcal: 'kcal', Wh: 'Wh', Hz: 'Hz', kHz: 'kHz', MHz: 'MHz', GHz: 'GHz',
    Pa: 'Pa', hPa: 'hPa', kPa: 'kPa', MPa: 'MPa', atm: 'atm', bar: 'bar', deg: '°', rad: 'rad', grad: 'grad',
    kml: 'km/L', l100km: 'L/100km', mpg: 'mpg', c: '°C', f: '°F', k: 'K', jpy: '円', usd: '$', eur: '€'
};

const mixConfigs = {
    time: ['year', 'month', 'day', 'hour', 'min', 'sec'],
    length: ['km', 'm', 'cm', 'mm'],
    weight: ['t', 'kg', 'g', 'mg'],
    data: ['TB', 'GB', 'MB', 'KB'],
};

let currentMode = 'normal';
let lastActiveId = '';

function switchCategory() {
    const cat = document.getElementById('categorySelector').value;
    const grid = document.getElementById('unitGrid');
    const mixedArea = document.getElementById('mixedInputArea');
    const modeSelector = document.getElementById('modeSelector');
    const canMix = !!mixConfigs[cat];

    modeSelector.style.display = canMix ? 'flex' : 'none';
    if (!canMix) currentMode = 'normal';

    grid.innerHTML = '';
    mixedArea.innerHTML = '';

    document.getElementById('rateBox').style.display = (cat === 'currency') ? 'block' : 'none';

    if (currentMode === 'mixed' && canMix) {
        mixedArea.style.display = 'flex';
        mixConfigs[cat].forEach(u => {
            mixedArea.innerHTML += `
            <div class="time-unit-box">
              <input type="number" id="mix_${u}" placeholder="0" oninput="handleInput('${cat}', 'mix')">
              <span>${labels[u]}</span>
            </div>`;
        });
        for (let unit in units[cat]) {
            grid.innerHTML += `<div class="input-group"><label>${labels[unit]}</label><input type="number" id="${unit}" readonly style="background:#f9f9f9; color:#666;"></div>`;
        }
    }
    else {
        mixedArea.style.display = 'none';
        for (let unit in units[cat]) {
            grid.innerHTML += `
            <div class="input-group">
              <label>${labels[unit]}</label>
              <input type="number" id="${unit}" 
                oninput="handleInput('${cat}', '${unit}')" 
                onfocus="setLastActive('${unit}')">
            </div>`;
        }
    }
}

function calculate(cat, id) {
    if (currentMode === 'mixed') runMixedCalc(cat);
    else runNormalCalc(cat, id);
}

function runNormalCalc(cat, id) {
    const el = document.getElementById(id);
    if (!el || el.value === '') return;
    const val = parseFloat(el.value);

    if (cat === 'temp') {
        let c = (id === 'c') ? val : (id === 'f') ? (val - 32) * 5 / 9 : val - 273.15;
        updateVal('c', (id === 'c' ? val : c).toFixed(2));
        updateVal('f', (id === 'f' ? val : (c * 9 / 5 + 32)).toFixed(2));
        updateVal('k', (id === 'k' ? val : (c + 273.15)).toFixed(2));
    } else if (cat === 'currency') {
        const uR = parseFloat(document.getElementById('usdRate').value) || 1;
        const eR = parseFloat(document.getElementById('eurRate').value) || 1;
        let jpy = (id === 'jpy') ? val : (id === 'usd') ? val * uR : val * eR;
        updateVal('jpy', (id === 'jpy' ? val : jpy).toFixed(0));
        updateVal('usd', (id === 'usd' ? val : jpy / uR).toFixed(2));
        updateVal('eur', (id === 'eur' ? val : jpy / eR).toFixed(2));
    } else if (cat === 'fuel') {
        let kml = (id === 'kml') ? val : (id === 'l100km') ? 100 / val : val * 0.425144;
        updateVal('kml', (id === 'kml' ? val : kml).toFixed(2));
        updateVal('l100km', (id === 'l100km' ? val : 100 / kml).toFixed(2));
        updateVal('mpg', (id === 'mpg' ? val : kml / 0.425144).toFixed(2));
    } else {
        const base = val / units[cat][id];
        for (let unit in units[cat]) {
            if (unit !== id) {
                const res = base * units[cat][unit];
                updateVal(unit, res < 0.0001 ? res.toExponential(4) : parseFloat(res.toFixed(6)));
            }
        }
    }
}

function runMixedCalc(cat) {
    let totalInBase = 0;
    const config = mixConfigs[cat];
    if (!config) return;

    config.forEach(u => {
        const val = parseFloat(document.getElementById('mix_' + u).value) || 0;
        totalInBase += val / units[cat][u];
    });

    for (let unit in units[cat]) {
        const res = totalInBase * units[cat][unit];
        updateVal(unit, parseFloat(res.toFixed(6)));
    }
}

function changeMode(mode) {
    currentMode = mode;
    document.getElementById('btnNormal').className = 'mode-btn' + (mode === 'normal' ? ' active-normal' : '');
    document.getElementById('btnMixed').className = 'mode-btn' + (mode === 'mixed' ? ' active-mixed' : '');
    document.getElementById('unitGrid').className = 'grid ' + mode + '-mode';
    document.getElementById('modeInfo').innerHTML = mode === 'normal'
        ? '💡 1つの項目を入力すると、他の単位へ一斉に変換します。'
        : '💡 複数の項目に入力した合計値で計算します。';
    switchCategory();
    clearAll();
}

function updateVal(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function handleInput(cat, id) {
    lastActiveId = id;
    if (document.getElementById('rtEnabled').checked) calculate(cat, id);
}

function setLastActive(id) {
    document.querySelectorAll('.grid input').forEach(i => i.classList.remove('last-edited'));
    const el = document.getElementById(id);
    if (el) el.classList.add('last-edited');
    lastActiveId = id;
}

function toggleRT() {
    const isRT = document.getElementById('rtEnabled').checked;
    const calcBtn = document.getElementById('calcBtn')
    calcBtn.style.display = 'inline-block';
    calcBtn.disabled = isRT
}

function manualCalculate() {
    calculate(document.getElementById('categorySelector').value, lastActiveId);
}

function clearAll() {
    document.querySelectorAll('input[type="number"]').forEach(i => {
        if (i.id !== 'usdRate' && i.id !== 'eurRate') i.value = '';
    });
    if (currentMode === 'mixed') runMixedCalc(document.getElementById('categorySelector').value);
}

window.onload = () => {
    switchCategory();
    toggleRT();
};