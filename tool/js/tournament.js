'use strict';

let players = [];
let matchResults = {};
let completedMatches = 0;
let totalMatches = 0;

const SLOT_H = 36;
const SLOT_VS = 2;
const MATCH_H = SLOT_H * 2 + SLOT_VS;
const R0_GAP = 8;

function addSingle() {
    const inp = document.getElementById('singleInput');
    const name = inp.value.trim();
    if (!name) return;
    players.push(name);
    inp.value = '';
    inp.focus();
    syncPlayerUI();
    toast(`「${name}」を追加`, 'ok');
}

function addBulk() {
    const ta = document.getElementById('bulkInput');
    const names = ta.value.split('\n').map(s => s.trim()).filter(Boolean);
    if (!names.length) return toast('名前を入力してください', 'err');
    names.forEach(n => players.push(n));
    ta.value = '';
    syncPlayerUI();
    toast(`${names.length}人追加しました`, 'ok');
}

function deletePlayer(i) {
    players.splice(i, 1);
    syncPlayerUI();
}

function shufflePlayers() {
    if (players.length < 2) return;
    for (let i = players.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [players[i], players[j]] = [players[j], players[i]];
    }
    syncPlayerUI();
    toast('シャッフルしました', 'ok');
}

function clearAll() {
    players = [];
    syncPlayerUI();
    hideBracket();
    toast('全消去しました');
}

function syncPlayerUI() {
    document.getElementById('pCount').textContent = players.length;
    const list = document.getElementById('playerList');
    list.innerHTML = players.map((p, i) => `
    <div class="player-tag" draggable="true"
         ondragstart="tagDS(event,${i})"
         ondragover="event.preventDefault()"
         ondrop="tagDrop(event,${i})">
      <span class="num">${i + 1}</span>
      <span>${escHtml(p)}</span>
      <span class="del" onclick="deletePlayer(${i})">✕</span>
    </div>`).join('');
}

let tagDI = null;
function tagDS(e, i) { tagDI = i; }
function tagDrop(e, i) {
    e.preventDefault();
    if (tagDI === null || tagDI === i) return;
    const moved = players.splice(tagDI, 1)[0];
    players.splice(i, 0, moved);
    tagDI = null;
    syncPlayerUI();
}

function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toggleInput() {
    const d = document.getElementById('inputDropdown');
    const btn = document.getElementById('toggleBtn');
    const open = d.classList.toggle('open');
    btn.textContent = open ? '✕ 閉じる' : '＋ 参加者を追加';
    if (open) document.getElementById('singleInput').focus();
}

document.addEventListener('click', e => {
    const d = document.getElementById('inputDropdown');
    if (!d.classList.contains('open')) return;
    if (d.contains(e.target) || e.target.id === 'toggleBtn') return;
    d.classList.remove('open');
    document.getElementById('toggleBtn').textContent = '＋ 参加者を追加';
});

document.getElementById('singleInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addSingle();
});

function buildTournament() {
    if (players.length < 2) return toast('最低2人必要です', 'err');

    matchResults = {};
    completedMatches = 0;

    const n = Math.pow(2, Math.ceil(Math.log2(players.length)));
    const list = [...players];
    while (list.length < n) list.push('BYE');

    const half = n / 2;
    const leftL = list.slice(0, half);
    const rightL = list.slice(half);

    const roundCount = Math.log2(n);
    totalMatches = n - 1;

    document.getElementById('sSP').textContent = players.length;
    document.getElementById('sRD').textContent = roundCount + 1;
    document.getElementById('sMT').textContent = totalMatches;
    document.getElementById('sTL').textContent = totalMatches;
    document.getElementById('sPG').textContent = 0;
    document.getElementById('progFill').style.width = '0%';
    document.getElementById('statusBar').style.display = 'flex';

    const bracket = document.getElementById('bracket');
    bracket.innerHTML = '';

    const leftSide = buildSide(leftL, 'L', false);
    const rightSide = buildSide(rightL, 'R', true);
    const finals = buildFinalsCenter(roundCount);

    bracket.appendChild(leftSide);
    bracket.appendChild(finals);
    bracket.appendChild(rightSide);

    document.getElementById('emptyState').style.display = 'none';
    bracket.style.display = 'flex';

    document.querySelectorAll('.slot[data-round="0"]').forEach(attachDrag);
    toast('トーナメント生成完了！', 'ok');
}

function buildSide(sidePlayers, sideId, isRight) {
    const side = document.createElement('div');
    side.className = 'b-side ' + (isRight ? 'b-right' : 'b-left');
    side.id = 'side-' + sideId;

    const rounds = Math.log2(sidePlayers.length);

    const col0 = makeRoundCol(sideId, 0, sidePlayers, false);
    side.appendChild(col0);

    for (let r = 1; r <= rounds - 1; r++) {
        const conn = makeConnCol(sideId, r - 1, sidePlayers.length);
        side.appendChild(conn);

        const matchesInRound = sidePlayers.length / Math.pow(2, r + 1);
        const dummies = new Array(matchesInRound * 2).fill('');
        const col = makeRoundCol(sideId, r, dummies, true);
        side.appendChild(col);
    }

    const connFinals = makeConnCol(sideId, rounds - 1, sidePlayers.length);
    side.appendChild(connFinals);

    return side;
}

function getMatchSpacing(roundIdx) {
    let gap = R0_GAP;
    for (let i = 0; i < roundIdx; i++) {
        gap = gap * 2 + MATCH_H;
    }
    return gap;
}

function makeRoundCol(sideId, roundIdx, players, isEmpty) {
    const col = document.createElement('div');
    col.className = 'round-col';
    col.dataset.side = sideId;
    col.dataset.round = roundIdx;

    const hdr = document.createElement('div');
    hdr.className = 'round-header';
    hdr.textContent = roundName(roundIdx);
    col.appendChild(hdr);

    const matchCount = players.length / 2;
    const gap = getMatchSpacing(roundIdx);
    const topPad = roundIdx === 0 ? 0 : Math.floor((MATCH_H + getMatchSpacing(roundIdx - 1)) / 2 - MATCH_H / 2);

    for (let i = 0; i < matchCount; i++) {
        const block = document.createElement('div');
        block.className = 'match-block';
        block.dataset.side = sideId;
        block.dataset.round = roundIdx;
        block.dataset.match = i;

        block.style.marginTop = (i === 0) ? topPad + 'px' : gap + 'px';

        const p1 = players[i * 2];
        const p2 = players[i * 2 + 1];
        const s1 = makeSlot(p1, sideId, roundIdx, i, 0, isEmpty);
        const vs = document.createElement('div');
        vs.className = 'slot-vs';
        const s2 = makeSlot(p2, sideId, roundIdx, i, 1, isEmpty);

        block.appendChild(s1);
        block.appendChild(vs);
        block.appendChild(s2);
        col.appendChild(block);
    }
    return col;
}

function roundName(r) {
    return ['1回戦', '2回戦', '3回戦', '4回戦', '準決勝'][r] || `R${r + 1}`;
}

function makeSlot(name, sideId, roundIdx, matchIdx, slotIdx, isEmpty) {
    const s = document.createElement('div');
    s.className = 'slot';
    s.dataset.side = sideId;
    s.dataset.round = roundIdx;
    s.dataset.match = matchIdx;
    s.dataset.slot = slotIdx;
    s.draggable = false;

    if (!isEmpty) {
        if (name === 'BYE') {
            s.classList.add('seed');
            s.textContent = 'BYE';
        } else {
            s.textContent = name;
            if (roundIdx === 0) {
                const idx = players.indexOf(name);
                if (idx >= 0) s.dataset.seed = idx + 1;
                s.classList.add('clickable');
                s.addEventListener('click', () => advance(s));
            }
        }
    } else {
        s.classList.add('locked');
    }
    return s;
}

function makeConnCol(sideId, fromRoundIdx, totalPlayers) {
    const col = document.createElement('div');
    col.className = 'conn-col';
    col.dataset.side = sideId;
    col.dataset.fromRound = fromRoundIdx;
    col.style.width = 'var(--conn-w)';
    col.style.position = 'relative';

    const spacer = document.createElement('div');
    spacer.style.height = '22px';
    col.appendChild(spacer);

    const matchesInFromRound = totalPlayers / Math.pow(2, fromRoundIdx + 1);
    const gap0 = getMatchSpacing(fromRoundIdx);
    const pairCount = matchesInFromRound / 2;
    const topPadFrom = fromRoundIdx === 0 ? 0 : Math.floor((MATCH_H + getMatchSpacing(fromRoundIdx - 1)) / 2 - MATCH_H / 2);

    for (let p = 0; p < pairCount; p++) {
        const m1Top = topPadFrom + p * 2 * (MATCH_H + gap0);
        const m2Top = m1Top + MATCH_H + gap0;
        const m1Mid = m1Top + MATCH_H / 2;
        const m2Mid = m2Top + MATCH_H / 2;

        const pair = document.createElement('div');
        pair.style.cssText = `position: absolute; left: 0; right: 0; top: ${m1Mid}px; height: ${m2Mid - m1Mid}px; pointer-events: none;`;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.cssText = 'position:absolute;top:0;left:0;overflow:visible;';

        const W = 32;
        const H = m2Mid - m1Mid;
        const color = '#c4c9d8';

        addLine(svg, 0, 0, W, 0, color);
        addLine(svg, 0, H, W, H, color);
        addLine(svg, W, 0, W, H, color);
        addLine(svg, W, H / 2, W, H / 2, color);

        pair.appendChild(svg);
        col.appendChild(pair);
    }
    return col;
}

function addLine(svg, x1, y1, x2, y2, color) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
}

function buildFinalsCenter() {
    const wrap = document.createElement('div');
    wrap.className = 'finals-wrap';

    const lbl = document.createElement('div');
    lbl.className = 'finals-lbl';
    lbl.textContent = 'FINAL';

    const match = document.createElement('div');
    match.className = 'finals-match';
    match.id = 'finals-match';

    const sL = document.createElement('div');
    sL.className = 'slot clickable';
    sL.id = 'finalist-L';
    sL.dataset.finalist = 'L';
    sL.addEventListener('click', () => advanceFinals(sL));

    const vs = document.createElement('div');
    vs.className = 'slot-vs';

    const sR = document.createElement('div');
    sR.className = 'slot clickable';
    sR.id = 'finalist-R';
    sR.dataset.finalist = 'R';
    sR.addEventListener('click', () => advanceFinals(sR));

    match.appendChild(sL);
    match.appendChild(vs);
    match.appendChild(sR);

    const champArea = document.createElement('div');
    champArea.className = 'champion-area';
    champArea.innerHTML = '<div class="champion-lbl">CHAMPION</div><div id="champion">?</div>';

    wrap.appendChild(lbl);
    wrap.appendChild(match);
    wrap.appendChild(champArea);

    return wrap;
}

function advance(el) {
    const name = el.textContent.trim();
    if (!name || el.classList.contains('seed') || el.classList.contains('locked')) return;

    const sideId = el.dataset.side;
    const roundIdx = parseInt(el.dataset.round);
    const matchIdx = parseInt(el.dataset.match);
    const slotIdx = parseInt(el.dataset.slot);

    const block = el.closest('.match-block');
    const slots = block.querySelectorAll('.slot');
    const key = `${sideId}-${roundIdx}-${matchIdx}`;
    const wasDecided = matchResults[key] !== undefined;

    if (!wasDecided) completedMatches++;
    matchResults[key] = slotIdx;

    slots.forEach(s => s.classList.remove('winner', 'loser'));
    el.classList.add('winner');
    slots.forEach(s => { if (s !== el) s.classList.add('loser'); });

    updateProgress();

    const side = document.getElementById('side-' + sideId);
    const allCols = Array.from(side.querySelectorAll('.round-col'));
    const nextCol = allCols.find(c => parseInt(c.dataset.round) === roundIdx + 1 && c.dataset.side === sideId);

    if (!nextCol) {
        const fin = document.getElementById('finalist-' + sideId);
        if (fin) {
            fin.textContent = name;
            fin.classList.remove('winner', 'loser', 'seed', 'locked');
        }
        return;
    }

    const nextMatchIdx = Math.floor(matchIdx / 2);
    const nextSlotIdx = matchIdx % 2;
    const blocks = nextCol.querySelectorAll('.match-block');
    const targetBlock = blocks[nextMatchIdx];
    if (!targetBlock) return;

    const targetSlots = targetBlock.querySelectorAll('.slot');
    const target = targetSlots[nextSlotIdx];
    if (!target) return;

    target.textContent = name;
    target.classList.remove('winner', 'loser', 'seed', 'locked');
    target.classList.add('clickable');
    target.dataset.side = sideId;
    target.dataset.round = roundIdx + 1;
    target.dataset.match = nextMatchIdx;
    target.dataset.slot = nextSlotIdx;

    const fresh = target.cloneNode(true);
    target.replaceWith(fresh);
    fresh.addEventListener('click', () => advance(fresh));
}

function advanceFinals(el) {
    const name = el.textContent.trim();
    if (!name) return;

    const slots = document.querySelectorAll('#finalist-L, #finalist-R');
    slots.forEach(s => s.classList.remove('winner', 'loser'));
    el.classList.add('winner');
    slots.forEach(s => { if (s !== el) s.classList.add('loser'); });

    const champ = document.getElementById('champion');
    champ.textContent = name;
    champ.classList.add('crowned');

    if (matchResults['finals'] === undefined) completedMatches++;
    matchResults['finals'] = el.dataset.finalist;
    updateProgress();

    confettiBurst();
    toast(`🏆 優勝: ${name}`, 'ok');
}

function resetWinners() {
    document.querySelectorAll('.slot').forEach(s => {
        s.classList.remove('winner', 'loser');
    });

    document.querySelectorAll('.slot:not([data-round="0"])').forEach(s => {
        if (s.id && (s.id.startsWith('finalist') || s.id === 'champion')) return;
        s.textContent = '';
        s.classList.remove('clickable');
        s.classList.add('locked');
        const clone = s.cloneNode(false);
        s.replaceWith(clone);
    });

    ['finalist-L', 'finalist-R'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.textContent = '';
            el.classList.remove('winner', 'loser');
        }
    });

    const champ = document.getElementById('champion');
    if (champ) { champ.textContent = '?'; champ.classList.remove('crowned'); }

    matchResults = {};
    completedMatches = 0;
    updateProgress();
    toast('勝敗をリセットしました');
}

function hideBracket() {
    const b = document.getElementById('bracket');
    if (b) { b.innerHTML = ''; b.style.display = 'none'; }
    document.getElementById('emptyState').style.display = '';
    document.getElementById('statusBar').style.display = 'none';
    matchResults = {};
    completedMatches = 0;
    totalMatches = 0;
}

function updateProgress() {
    document.getElementById('sPG').textContent = completedMatches;
    const pct = totalMatches > 0 ? completedMatches / totalMatches * 100 : 0;
    document.getElementById('progFill').style.width = pct + '%';
}

let dragSrc = null;
function attachDrag(el) {
    if (el._drag) return;
    el._drag = true;
    el.draggable = true;

    el.addEventListener('dragstart', e => {
        dragSrc = el;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragover', e => {
        e.preventDefault();
        if (el.dataset.round === '0') el.classList.add('drag-over');
    });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', e => {
        e.stopPropagation();
        el.classList.remove('drag-over');
        if (!dragSrc || dragSrc === el) return;
        if (el.dataset.round !== '0' || dragSrc.dataset.round !== '0') return;

        const srcText = dragSrc.textContent;
        const dstText = el.textContent;
        dragSrc.textContent = dstText;
        el.textContent = srcText;

        const srcSeed = dragSrc.dataset.seed;
        const dstSeed = el.dataset.seed;
        if (dstSeed !== undefined) dragSrc.dataset.seed = dstSeed;
        else delete dragSrc.dataset.seed;
        if (srcSeed !== undefined) el.dataset.seed = srcSeed;
        else delete el.dataset.seed;

        ['winner', 'loser', 'seed'].forEach(c => {
            const inSrc = dragSrc.classList.contains(c);
            const inDst = el.classList.contains(c);
            dragSrc.classList.toggle(c, inDst);
            el.classList.toggle(c, inSrc);
        });
        dragSrc = null;
    });
    el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(s => s.classList.remove('drag-over'));
        dragSrc = null;
    });
}

function confettiBurst() {
    const colors = ['#2563eb', '#ef4444', '#059669', '#d97706', '#f0f0ff'];
    const cx = window.innerWidth * 0.5;
    const cy = window.innerHeight * 0.38;

    for (let i = 0; i < 70; i++) {
        const el = document.createElement('div');
        const angle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 220;
        const dur = 0.7 + Math.random() * 0.7;
        const size = 5 + Math.random() * 7;

        el.style.cssText = `
      position:fixed; left:${cx}px; top:${cy}px;
      width:${size}px; height:${size}px;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      border-radius:${Math.random() > .5 ? '50%' : '2px'};
      pointer-events:none; z-index:9999;
      --cx:${Math.cos(angle) * dist}px;
      --cy:${Math.sin(angle) * dist - 80}px;
      --cr:${Math.random() * 720 - 360}deg;
      animation:cfly ${dur}s cubic-bezier(.2,.8,.4,1) forwards;
    `;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), dur * 1000 + 100);
    }
}

let _tt = null;
function toast(msg, type = '') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = type;
    t.offsetHeight;
    t.classList.add('show');
    clearTimeout(_tt);
    _tt = setTimeout(() => t.classList.remove('show'), 2400);
}