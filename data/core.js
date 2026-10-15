// 불변사 핵심 이미지와 소리 규칙 (앱용으로 새로 작성)

window.PARTICLES = {
  up:      { img: '⬆️', core: '위로 · 끝까지 · 늘어남', hint: '완전히 끝내거나(eat up), 생겨나거나(come up), 커지는(turn up) 느낌' },
  down:    { img: '⬇️', core: '아래로 · 줄어듦 · 가라앉힘', hint: '낮추고(turn down) 진정시키고(calm down) 적어두는(write down) 느낌' },
  out:     { img: '📤', core: '밖으로 · 드러남 · 다 써버림', hint: '알아내고(find out) 사라지고(run out) 밖으로 나가는(go out) 느낌' },
  in:      { img: '📥', core: '안으로 · 참여 · 굴복', hint: '들어가고(come in) 끼어들고(cut in) 받아들이는(give in) 느낌' },
  on:      { img: '🔛', core: '붙어서 · 계속 · 켜짐', hint: '입고(put on) 계속하고(go on) 켜는(turn on) 느낌' },
  off:     { img: '📴', core: '떨어져서 · 멈춤 · 출발', hint: '벗고(take off) 끄고(turn off) 취소하고(call off) 떠나는 느낌' },
  over:    { img: '🔄', core: '넘어서 · 처음부터 끝까지 · 넘겨줌', hint: '극복하고(get over) 훑어보고(look over) 들르는(come over) 느낌' },
  back:    { img: '↩️', core: '되돌아 · 원래대로 · 뒤로', hint: '돌려주고(give back) 다시 연락하고(call back) 물러서는 느낌' },
  away:    { img: '💨', core: '멀리 · 사라짐 · 계속', hint: '치우고(put away) 버리고(throw away) 떠나는 느낌' },
  around:  { img: '🔁', core: '주변 · 빙 돌아 · 여기저기', hint: '어슬렁대고(hang around) 둘러보고(look around) 돌아서는 느낌' },
  through: { img: '➡️', core: '통과해서 · 끝까지 해냄', hint: '겪어내고(go through) 버티고(get through) 끝까지 가는 느낌' },
  into:    { img: '🎯', core: '안으로 부딪힘 · 변화', hint: '우연히 마주치고(run into) 조사하고(look into) 바뀌는(turn into) 느낌' },
  along:   { img: '🤝', core: '함께 · 따라서', hint: '잘 지내고(get along) 데려가는(bring along) 느낌' },
  by:      { img: '🚶', core: '옆으로 · 잠깐 들름 · 버팀', hint: '들르고(drop by) 그럭저럭 버티는(get by) 느낌' },
  with:    { img: '🔗', core: '~와 함께 · ~를 상대로', hint: '처리하고(deal with) 계속 가는(stick with) 느낌' },
  for:     { img: '🎁', core: '~을 향해 · ~를 위해', hint: '속아 넘어가고(fall for) 지지하는 느낌' },
  apart:   { img: '🧩', core: '조각조각 · 따로', hint: '분해하고(take apart) 무너지는(fall apart) 느낌' },
  after:   { img: '👣', core: '뒤를 따라', hint: '돌보고(look after) 닮는(take after) 느낌' },
  together:{ img: '🧷', core: '한데 모아', hint: '합치고 조립하는(put together) 느낌' },
  forward: { img: '⏩', core: '앞으로', hint: '기대하는(look forward to) 느낌' },
  ahead:   { img: '🏃', core: '앞서서 · 먼저', hint: '먼저 하라고 허락하는(go ahead) 느낌' },
  across:  { img: '↔️', core: '가로질러 · 우연히', hint: '우연히 발견하는(come across) 느낌' },
  behind:  { img: '🐢', core: '뒤에 · 뒤처져', hint: '뒤처지는(fall behind) 느낌' },
  to:      { img: '👉', core: '~쪽으로 · ~에 붙어', hint: '고수하고(stick to) 의지하는(turn to) 느낌' },
};

// 격자 열 순서 (나머지 불변사는 '기타' 열로)
window.GRID_PARTICLES = ['up', 'out', 'off', 'on', 'over', 'back', 'down', 'in', 'away', 'around', 'through', 'into'];

window.SOUND_RULES = {
  flap: {
    name: '굴리는 t (flap)',
    emoji: '👅',
    what: '모음 사이에 낀 t·d는 혀끝으로 한 번 톡 치는 소리가 돼서 우리 귀엔 "ㄹ"로 들려요.',
    how: 'get it을 "겟 잇"으로 끊지 말고 "게릿"으로 이어서 말해요.',
    ex: [['get it', '게릿'], ['put it on', '푸리론'], ['a lot of', '얼라러']],
  },
  link: {
    name: '이어 붙이기 (linking)',
    emoji: '🔗',
    what: '자음으로 끝난 단어 뒤에 모음으로 시작하는 단어가 오면 한 단어처럼 붙어요.',
    how: '단어 경계를 지우고 받침을 다음 모음으로 넘겨요.',
    ex: [['pick it up', '피키럽'], ['come on', '커먼'], ['check it out', '체키라웃']],
  },
  drop: {
    name: '사라지는 소리 (drop)',
    emoji: '🫥',
    what: 'n 뒤의 t, 자음 사이의 t·d, 대명사의 h는 아예 소리가 안 나는 경우가 많아요.',
    how: '안 들리는 게 정상이에요. 그 자리를 비워두고 듣는 연습을 해요.',
    ex: [['hold on', '호론'], ['went out', '웨나웃'], ['call him', '콜림']],
  },
  weak: {
    name: '약해지는 기능어 (weak form)',
    emoji: '🔉',
    what: 'to, of, for, them, you 같은 작은 단어는 모음이 "어"로 뭉개지고 짧아져요.',
    how: '내용어(동사·명사)에 힘을 주고 기능어는 흘려요.',
    ex: [['back to you', '빽터유'], ['out of', '아우러'], ['call you back', '콜야빽']],
  },
  glottal: {
    name: '삼키는 t (glottal stop)',
    emoji: '✋',
    what: '자음 앞이나 문장 끝의 t는 터뜨리지 않고 목에서 멈춰요. 받침처럼만 남아요.',
    how: '"겟-빽"에서 t를 내뱉지 말고 숨을 잠깐 멈추는 느낌으로 넘어가요.',
    ex: [['get back', '겟빽'], ['put down', '풋다운'], ['sit down', '씻다운']],
  },
  stress: {
    name: '불변사에 강세 (stress)',
    emoji: '📢',
    what: '구동사는 보통 동사보다 뒤의 불변사가 더 세게 들려요.',
    how: 'give UP, show UP처럼 뒤쪽을 또렷하게 말하면 원어민처럼 들려요.',
    ex: [['give up', '기-법'], ['show up', '쇼-업'], ['find out', '파인다웃']],
  },
};
