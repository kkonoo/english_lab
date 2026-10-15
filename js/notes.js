// 내 표현: 드라마·대화에서 들은 표현을 적어 두고, 모아서 Claude에게 카드로 만들어 달라고 할 때 씀

const noteDlg = document.getElementById('noteDlg');
const noteText = document.getElementById('noteText');
const noteMemo = document.getElementById('noteMemo');
const noteFound = document.getElementById('noteFound');

// 앱에 이미 있는 표현인지 찾기 (구동사·표현·단어)
function findInApp(q) {
  q = q.trim().toLowerCase().replace(/[?.!,]/g, '');
  if (q.length < 2) return null;
  const hit = (s) => s && s.toLowerCase().replace(/[?.!,]/g, '').includes(q);
  const p = ALL.find(p => hit(p.phrase) || hit(p.chunk));
  if (p) return { kind: 'pv', id: p.id, label: p.phrase, where: '구동사' };
  const i = IDS.find(i => hit(i.en) || hit(i.chunk));
  if (i) return { kind: 'idiom', id: i.id, label: i.en, where: '표현' };
  const w = WORDS.find(w => hit(w.word));
  if (w) return { kind: 'word', id: w.id, label: w.word, where: '단어' };
  return null;
}
function openFound(f) {
  document.querySelectorAll('dialog[open]').forEach(d => d.close());
  if (f.kind === 'pv') openCard(f.id);
  else if (f.kind === 'idiom') {
    const i = IDIOM_BY_ID[f.id];
    idQuiz = null; idGroup = i.group; idOpen = new Set([i.id]); showTab('idioms');
    requestAnimationFrame(() => document.querySelector(`.idiom[data-id="${i.id}"]`)?.scrollIntoView({ block: 'center' }));
  } else {
    const w = WORD_BY_ID[f.id];
    wGroup = w.group; wOpen = new Set([w.id]); showTab('words');
    requestAnimationFrame(() => document.querySelector(`.idiom[data-id="${w.id}"]`)?.scrollIntoView({ block: 'center' }));
  }
}

document.getElementById('noteBtn').onclick = () => {
  noteText.value = ''; noteMemo.value = ''; noteFound.innerHTML = '';
  noteDlg.showModal();
  noteText.focus();
};
noteText.addEventListener('input', () => {
  const f = findInApp(noteText.value);
  noteFound.innerHTML = f ? `이미 ${f.where}에 있어요: <button type="button" class="chip" id="noteOpen">${esc(f.label)} 열기</button>` : '';
  const b = document.getElementById('noteOpen');
  if (b) b.onclick = () => openFound(f);
});
document.getElementById('noteForm').onsubmit = e => {
  e.preventDefault();
  const text = noteText.value.trim();
  if (!text) return;
  db.notes = db.notes || {};
  const id = 'm' + Date.now().toString(36);
  db.notes[id] = { text, memo: noteMemo.value.trim(), t: Date.now() };
  persist();
  noteText.value = ''; noteMemo.value = ''; noteFound.innerHTML = '';
  toast('적어 뒀어요. 표현 탭 📝 내 표현에서 볼 수 있어요.');
  noteText.focus();
  if (tab === 'idioms') render();
};

function activeNotes() {
  return Object.entries(db.notes || {}).filter(([, n]) => !n.del).sort((a, b) => b[1].t - a[1].t);
}

function drawNotes(el) {
  const list = activeNotes();
  el.innerHTML = `
    <div class="session-top">
      <button class="icon-btn small" id="nBack" aria-label="그룹 목록">‹</button>
      <b class="set-title">📝 내 표현</b>
      <span class="hint">${list.length}개</span>
    </div>
    <p class="hint">드라마나 대화에서 들은 표현을 적어 두는 곳이에요. <b>목록 복사</b>를 눌러 Claude에게 붙여 넣고 "카드로 만들어줘" 하면 뜻·소리·예문을 채워서 앱에 넣어 드려요.</p>
    <div class="row">
      <button class="btn primary" id="nAdd">＋ 표현 적기</button>
      <button class="btn" id="nCopy" ${list.length ? '' : 'disabled'}>📋 목록 복사</button>
    </div>
    <div class="rows">${list.map(([id, n]) => {
      const f = findInApp(n.text);
      return `<div class="note-row" data-n="${id}">
        <div class="lmain"><b>${esc(n.text)}</b>
          ${n.memo ? `<div class="hint">${esc(n.memo)}</div>` : ''}
          <div class="hint">${new Date(n.t).toLocaleDateString('ko-KR')}${f ? ` · <button class="chip" data-open="${id}">이미 ${f.where}에 있어요</button>` : ''}</div>
        </div>
        <button class="icon-btn small" data-del="${id}" aria-label="지우기">✕</button>
      </div>`;
    }).join('') || '<p class="hint" style="padding:12px">아직 적어 둔 표현이 없어요. 위쪽 📝 버튼으로 언제든 적을 수 있어요.</p>'}</div>`;

  el.querySelector('#nBack').onclick = () => { idGroup = null; render(); };
  el.querySelector('#nAdd').onclick = () => document.getElementById('noteBtn').click();
  el.querySelector('#nCopy').onclick = async () => {
    const text = '잉글리시 랩에 카드로 넣어줘:\n' + list.map(([, n]) => `- ${n.text}${n.memo ? ` (${n.memo})` : ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast('복사했어요. Claude에게 붙여 넣어 주세요.'); }
    catch (e) { prompt('아래 내용을 복사해 주세요', text); }
  };
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const id = b.dataset.del;
    db.notes[id] = { ...db.notes[id], del: true, t: Date.now() };
    persist(); render(); toast('지웠어요.');
  });
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openFound(findInApp(db.notes[b.dataset.open].text)));
}
