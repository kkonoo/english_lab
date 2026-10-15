// 전체 검색: 구동사 · 관용구 · 쉐도잉 문장을 한 번에 (Ctrl+K)

const searchDlg = document.getElementById('searchDlg');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

function openSearch() {
  if (!searchDlg.open) searchDlg.showModal();
  searchInput.select();
  runSearch();
}
document.getElementById('searchBtn').onclick = openSearch;
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); }
});

function hl(text, q) {
  const t = String(text ?? ''), i = t.toLowerCase().indexOf(q);
  if (!q || i < 0) return esc(t);
  return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + q.length)) + '</mark>' + esc(t.slice(i + q.length));
}
// 맞은 글자가 들어 있는 필드를 보여줘요 (없으면 첫 번째)
function bestField(fields, q) { return fields.find(f => f && f.toLowerCase().includes(q)) || fields[0]; }

function runSearch() {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) {
    searchResults.innerHTML = '<p class="hint">구동사 335개 · 표현 705개 · 단어 330개 · 쉐도잉 240문장에서 찾아요.</p>';
    return;
  }
  const has = fields => fields.some(f => f && String(f).toLowerCase().includes(q));
  const pvs = ALL.filter(p => has([p.phrase, p.chunk, p.sound, p.tip, ...p.senses.flatMap(s => [s.ko, s.ex, s.exKo])]))
    .sort((a, b) => (b.phrase.toLowerCase().startsWith(q) - a.phrase.toLowerCase().startsWith(q)) || a.level - b.level);
  const ids = IDS.filter(i => has([i.en, i.chunk, i.sound, i.literal, i.meaning, i.ex, i.exKo, i.tip]))
    .sort((a, b) => a.level - b.level);
  const wds = WORDS.filter(w => has([w.word, w.meaning, w.nuance, w.ex, w.exKo, w.sound]))
    .sort((a, b) => (b.word.toLowerCase().startsWith(q) - a.word.toLowerCase().startsWith(q)) || a.level - b.level);
  const sents = [];
  SETS.forEach(set => set.sentences.forEach((s, n) => {
    if (has([s.en, s.ko, s.sound, s.tip])) sents.push({ set, s, n });
  }));

  const pvRows = pvs.slice(0, 20).map(p => `
    <button class="sr-item" data-kind="pv" data-id="${p.id}">
      <span class="fdot f${p.level}"></span>
      <span class="lmain"><b>${hl(p.phrase, q)}</b> <span class="lsound">${hl(p.sound, q)}</span>
        <span class="hint" style="display:block">${hl(bestField(p.senses.flatMap(s => [s.ko, s.ex, s.exKo]), q), q)}</span></span>
    </button>`).join('');
  const idRows = ids.slice(0, 20).map(i => `
    <button class="sr-item" data-kind="idiom" data-id="${i.id}">
      <span class="fdot f${i.level}"></span>
      <span class="lmain"><b>${hl(i.en, q)}</b> ${i.tag}
        <span class="hint" style="display:block">${hl(bestField([i.meaning, i.literal, i.ex, i.exKo, i.tip], q), q)}</span></span>
    </button>`).join('');
  const wRows = wds.slice(0, 20).map(w => `
    <button class="sr-item" data-kind="word" data-id="${w.id}">
      <span class="fdot f${w.level}"></span>
      <span class="lmain"><b>${hl(w.word, q)}</b> <span class="hint">${POS[w.pos]}</span>
        <span class="hint" style="display:block">${hl(bestField([w.meaning, w.nuance, w.ex, w.exKo], q), q)}</span></span>
    </button>`).join('');
  const shRows = sents.slice(0, 20).map(({ set, s, n }) => `
    <button class="sr-item" data-kind="shadow" data-set="${set.id}" data-n="${n}">
      <span>${set.emoji}</span>
      <span class="lmain">${hl(s.en, q)}<span class="hint" style="display:block">${hl(s.ko, q)} · ${esc(set.title)}</span></span>
    </button>`).join('');

  const more = (list, shown) => list.length > shown ? `<p class="hint">외 ${list.length - shown}개 더 있어요. 검색어를 더 구체적으로 써 보세요.</p>` : '';
  searchResults.innerHTML =
    (pvs.length ? `<div class="sr-group">📇 구동사 ${pvs.length}</div>${pvRows}${more(pvs, 20)}` : '') +
    (ids.length ? `<div class="sr-group">🧩 관용구 ${ids.length}</div>${idRows}${more(ids, 20)}` : '') +
    (wds.length ? `<div class="sr-group">🔤 단어 ${wds.length}</div>${wRows}${more(wds, 20)}` : '') +
    (sents.length ? `<div class="sr-group">🎬 쉐도잉 문장 ${sents.length}</div>${shRows}${more(sents, 20)}` : '') ||
    '<p class="hint">찾는 표현이 없어요. 다른 말로 찾아보거나 영어 대신 뜻으로 찾아보세요.</p>';
}
searchInput.addEventListener('input', runSearch);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { const f = searchResults.querySelector('.sr-item'); if (f) f.click(); }
});

searchResults.addEventListener('click', e => {
  const b = e.target.closest('.sr-item');
  if (!b) return;
  searchDlg.close();
  if (b.dataset.kind === 'pv') openCard(b.dataset.id);
  else if (b.dataset.kind === 'idiom') {
    const i = IDIOM_BY_ID[b.dataset.id];
    idQuiz = null; idGroup = i.group; idOpen = new Set([i.id]);
    showTab('idioms');
    requestAnimationFrame(() => document.querySelector(`.idiom[data-id="${i.id}"]`)?.scrollIntoView({ block: 'center' }));
  } else if (b.dataset.kind === 'word') {
    const w = WORD_BY_ID[b.dataset.id];
    wGroup = w.group; wOpen = new Set([w.id]);
    showTab('words');
    requestAnimationFrame(() => document.querySelector(`.idiom[data-id="${w.id}"]`)?.scrollIntoView({ block: 'center' }));
  } else {
    stopRec();
    shSet = SET_BY_ID[b.dataset.set]; shIdx = +b.dataset.n;
    showTab('shadow');
    scrollTo(0, 0);
  }
});
