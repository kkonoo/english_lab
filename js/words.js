// 단어: 회화 부사 · 형용사(강도 사다리) · 원어민 일상 동사

const WGROUPS = window.WORD_GROUPS;
const WORDS = window.WORDS;
const WORD_BY_ID = Object.fromEntries(WORDS.map(w => [w.id, w]));
const POS = { reg: '말투 사다리', adv: '부사', adj: '형용사', verb: '동사' };
const POS_NOTE = {
  reg: '같은 말을 친구 · 동료 · 업무 메일에 맞춰 바꿔 말하는 연습이에요.',
  adv: '문장마다 끼어서 약하게 발음돼요. 💼 격식 그룹은 회의·메일용이에요.',
  adj: '뜻보다 "얼마나 센지"가 중요해요. 사다리에서 왼쪽이 약하고 오른쪽이 세요.',
  verb: '교과서 동사 대신 원어민이 일상에서 쓰는 동사, 그리고 업무용 격식 동사예요.',
};
let wGroup = null, wOpen = new Set(), wOnly1 = false, wReg = '';

const wordsIn = g => WORDS.filter(w => w.group === g);

RENDER.words = el => {
  if (wGroup) return drawWordGroup(el);
  el.innerHTML = Object.keys(POS).map(pos => `
    <h3 class="pos-title">${POS[pos]} <span class="hint">${POS_NOTE[pos]}</span></h3>
    <div class="set-grid">${WGROUPS.filter(g => g.pos === pos).map(g => {
      const list = wordsIn(g.id), n = list.length, k = list.filter(w => status(w.id) === 'known').length;
      return `<button class="set-card" data-wg="${g.id}">
        <span class="set-emoji">${g.emoji}</span>
        <span class="set-main"><b>${esc(g.title)}</b><span class="hint">${esc(g.desc)}</span>
          <span class="bar thin"><i style="width:${n ? Math.round(k / n * 100) : 0}%"></i></span></span>
        <span class="set-count ${k === n ? 'full' : ''}">${k}/${n}</span>
      </button>`;
    }).join('')}</div>`).join('');
  el.querySelectorAll('[data-wg]').forEach(b => b.onclick = () => { wGroup = b.dataset.wg; wOpen = new Set(); scrollTo(0, 0); render(); });
};

// 말투 사다리: set끼리 묶어 캐주얼 → 무난 → 격식
// 강도 사다리: 순위가 크게 건너뛰면(기쁨 1~6 / 슬픔 11~16) 나눠요
function ladders(list) {
  if (list.some(w => w.set)) {
    const sets = {};
    list.forEach(w => (sets[w.set] = sets[w.set] || []).push(w));
    return Object.values(sets).map(s => s.sort((a, b) => a.rank - b.rank));
  }
  const ranked = list.filter(w => w.rank > 0).sort((a, b) => a.rank - b.rank);
  const out = [];
  ranked.forEach((w, i) => {
    if (!i || w.rank - ranked[i - 1].rank > 3) out.push([]);
    out[out.length - 1].push(w);
  });
  return out;
}

function drawWordGroup(el) {
  const g = WGROUPS.find(x => x.id === wGroup);
  const all = wordsIn(g.id);
  const list = all.filter(w => (!wOnly1 || w.level === 1) && (!wReg || w.register === wReg))
    .sort((a, b) => g.pos === 'reg' ? 0 : (a.rank || 99) - (b.rank || 99) || a.level - b.level);
  const lads = ladders(all);
  el.innerHTML = `
    <div class="session-top">
      <button class="icon-btn small" id="wBack" aria-label="그룹 목록">‹</button>
      <b class="set-title">${g.emoji} ${esc(g.title)}</b>
      <span class="hint">${POS[g.pos]} · ${all.filter(w => status(w.id) === 'known').length}/${all.length} 익힘</span>
    </div>
    ${g.pos === 'reg' ? `
      <div class="panel reg-ladders">
        <div class="reg-head"><span>👟 친구</span><span>🙂 동료</span><span>🎩 업무 메일·회의</span></div>
        ${lads.map(l => `<div class="reg-row">${l.map(w =>
          `<button class="rung reg-${w.register}" data-jump="${w.id}">${esc(w.word)}</button>`).join('')}</div>`).join('')}
      </div>` : lads.map(l => `
      <div class="panel">
        <div class="ladder">${l.map((w, i) => {
          const k = Math.round(12 + (l.length > 1 ? i / (l.length - 1) : 1) * 70);
          return `<button class="rung ${k > 55 ? 'hot' : ''}" style="--k:${k}" data-jump="${w.id}">${esc(w.word)}</button>`;
        }).join('')}</div>
        <div class="ladder-cap"><span>약하게</span><span>세게 →</span></div>
      </div>`).join('')}
    <div class="row between">
      <div class="seg small">
        <button class="${wOnly1 ? '' : 'on'}" data-o="0">빈도 전체</button>
        <button class="${wOnly1 ? 'on' : ''}" data-o="1">필수만</button>
      </div>
    </div>
    ${regSeg(wReg)}
    <div class="idiom-list">${list.map(wordCard).join('') || '<p class="hint">이 조건에 맞는 단어가 없어요.</p>'}</div>`;

  el.querySelector('#wBack').onclick = () => { wGroup = null; render(); };
  el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { wOnly1 = b.dataset.o === '1'; render(); });
  el.querySelectorAll('[data-reg]').forEach(b => b.onclick = () => { wReg = b.dataset.reg; render(); });
  el.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => {
    const id = b.dataset.jump;
    wOpen.add(id); wOnly1 = false; wReg = '';
    render();
    requestAnimationFrame(() => document.querySelector(`.idiom[data-id="${id}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  });
  el.querySelectorAll('.idiom-head').forEach(h => h.onclick = e => {
    if (e.target.closest('[data-say]')) return;
    const id = h.parentElement.dataset.id;
    wOpen.has(id) ? wOpen.delete(id) : wOpen.add(id);
    render();
  });
  el.querySelectorAll('[data-mark]').forEach(b => b.onclick = () => {
    const id = b.closest('[data-id]').dataset.id;
    db.progress[id] = b.dataset.mark === 'known'
      ? { ...prog(id), box: 4, due: today(INTERVAL[4]) }
      : { ...prog(id), box: 1, due: today() };
    persist(); render();
  });
}

function sayWord(w) { return w.word.replace(/\s*\(.*?\)\s*/g, ' ').trim(); }

function wordCard(w) {
  const open = wOpen.has(w.id), st = status(w.id);
  return `
    <div class="idiom ${open ? 'open' : ''}" data-id="${w.id}">
      <div class="idiom-head" role="button" tabindex="0">
        <span class="fdot f${w.level}" title="빈도"></span>
        <div class="idiom-main">
          <div class="idiom-en">${esc(w.word)} ${regChip(w.register)}${st === 'known' ? ' <span class="chip known-chip">익힘</span>' : ''}</div>
          <div class="hint">${esc(w.meaning)}</div>
        </div>
        <button class="icon-btn small" data-say="${esc(sayWord(w))}" aria-label="듣기">🔊</button>
      </div>
      ${open ? `
        <div class="idiom-body">
          <p>${esc(w.nuance)}</p>
          <div class="sound small-sound">
            <button class="say-btn" data-say="${esc(sayWord(w))}" aria-label="듣기">🔊</button>
            <div><div class="sound-ko">${esc(w.sound)}</div><div class="stress">${esc(w.stress)}</div></div>
          </div>
          <div class="ex">
            <button class="icon-btn small" data-say="${esc(w.ex)}" aria-label="예문 듣기">🔊</button>
            <div><div class="ex-en">${esc(w.ex)}</div><div class="ex-ko">${esc(w.exKo)}</div></div>
          </div>
          ${w.tip ? `<p class="tip">💡 ${esc(w.tip)}</p>` : ''}
          <div class="row end">
            ${st === 'known'
              ? '<button class="btn" data-mark="again">다시 익히기</button>'
              : '<button class="btn" data-mark="again">헷갈려요</button><button class="btn primary" data-mark="known">알아요</button>'}
          </div>
        </div>` : ''}
    </div>`;
}
