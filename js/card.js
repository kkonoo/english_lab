// 카드 상세 (공통) · 상세 대화상자

const STATUS_LABEL = { new: '🆕 새 카드', learning: '🌱 익히는 중', known: '✅ 익힘' };

function ruleChips(p) {
  return p.rules.map(r => {
    const R = SOUND_RULES[r];
    return R ? `<span class="chip rule" title="${esc(R.what)}">${R.emoji} ${esc(R.name.split(' (')[0])}</span>` : '';
  }).join('');
}

function soundBlock(p) {
  return `
    <div class="sound">
      <button class="say-btn" data-say="${esc(p.chunk)}" aria-label="듣기">🔊</button>
      <div>
        <div class="sound-ko">${esc(p.sound)}</div>
        <div class="sound-en">${esc(p.chunk)}</div>
      </div>
    </div>`;
}

function cardBack(p) {
  const pt = PARTICLES[p.particle.split(' ')[0]];
  return `
    <div class="phrase-line">
      <span class="phrase">${esc(p.phrase)}</span>
      <span class="lv lv${p.level}" title="빈도">${'●'.repeat(4 - p.level)}${'○'.repeat(p.level - 1)}</span>
      ${p.ctx === 'work' ? '<span class="chip">💼 업무·연구</span>' : ''}
      ${regChip(p.register)}
      ${p.sep === true ? '<span class="chip" title="목적어를 가운데 넣을 수 있어요 (pick it up)">↔ 사이에 넣기 OK</span>' : ''}
    </div>
    ${soundBlock(p)}
    <div class="rules">${ruleChips(p)}</div>
    ${p.senses.map(s => `
      <div class="sense">
        <div class="ko">${esc(s.ko)}</div>
        <div class="ex">
          <button class="icon-btn small" data-say="${esc(s.ex)}" aria-label="예문 듣기">🔊</button>
          <div><div class="ex-en">${esc(s.ex)}</div><div class="ex-ko">${esc(s.exKo)}</div></div>
        </div>
      </div>`).join('')}
    ${p.tip ? `<p class="tip">💡 ${esc(p.tip)}</p>` : ''}
    ${pt ? `<p class="hint">${pt.img} <b>${esc(p.particle.split(' ')[0])}</b>: ${esc(pt.core)}</p>` : ''}`;
}

function openCard(id) {
  const p = BY_ID[id];
  if (!p) return;
  const dlg = document.getElementById('cardDlg');
  const draw = () => {
    const st = status(id), pr = prog(id);
    dlg.innerHTML = `
      <div class="panel-head">
        <span class="chip">${STATUS_LABEL[st]}${pr.due && st !== 'new' ? ` · 다음 복습 ${pr.due.slice(5).replace('-', '/')}` : ''}</span>
        <div>
          <button class="icon-btn small" id="starBtn" title="즐겨찾기" aria-label="즐겨찾기">${db.starred[id] ? '⭐' : '☆'}</button>
          <button class="icon-btn small" data-close aria-label="닫기">✕</button>
        </div>
      </div>
      ${cardBack(p)}
      <div class="row end">
        ${st === 'known'
          ? '<button class="btn" id="relearnBtn">다시 익히기</button>'
          : '<button class="btn" id="knowBtn">이미 알아요</button>'}
      </div>`;
    dlg.querySelector('#starBtn').onclick = () => {
      if (db.starred[id]) delete db.starred[id]; else db.starred[id] = true;
      persist(); draw(); render();
    };
    const kb = dlg.querySelector('#knowBtn');
    if (kb) kb.onclick = () => {
      db.progress[id] = { ...prog(id), box: 4, due: today(INTERVAL[4]) };
      persist(); draw(); render(); toast('익힌 카드로 옮겼어요.');
    };
    const rb = dlg.querySelector('#relearnBtn');
    if (rb) rb.onclick = () => {
      db.progress[id] = { ...prog(id), box: 1, due: today() };
      persist(); draw(); render(); toast('오늘 복습에 넣었어요.');
    };
  };
  draw();
  if (!dlg.open) dlg.showModal();
}
