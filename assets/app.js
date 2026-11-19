/* 연구하는 교사되기 2027 · 연수 운영 사이트 */
(function () {
  'use strict';

  var API = (window.SITE_CONFIG && window.SITE_CONFIG.API_URL || '').trim();
  var DEMO = !API;
  var C = null; // 공개 콘텐츠 캐시

  var SIDO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];

  // ───────── 페이지 정의 ─────────
  var GROUPS = {
    guide: { name: '연수 안내', en: 'Course Guide', tabs: [['guide', '연수 개요'], ['schedule', '일정·시간표'], ['access', '접속 안내']] },
    talk: { name: '공지·FAQ', en: 'Notice & FAQ', tabs: [['notice', '공지사항'], ['faq', '자주 묻는 질문']] },
    self: { name: '셀프 서비스', en: 'Self Service', tabs: [['request', '셀프 신청'], ['info', '이수정보 입력'], ['status', '내 현황 조회']] }
  };
  var PAGES = {
    guide: { g: 'guide', t: '연수 개요', r: renderGuide },
    schedule: { g: 'guide', t: '일정·시간표', r: renderSchedule },
    access: { g: 'guide', t: '접속 안내', r: renderAccess },
    notice: { g: 'talk', t: '공지사항', r: renderNotice },
    faq: { g: 'talk', t: '자주 묻는 질문', r: renderFaq },
    request: { g: 'self', t: '셀프 신청', r: renderRequest },
    info: { g: 'self', t: '이수정보 입력', r: renderInfo },
    status: { g: 'self', t: '내 현황 조회', r: renderStatus },
    privacy: { g: null, t: '개인정보 처리 안내', r: renderPrivacy }
  };

  // ───────── 공통 ─────────
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function linkify(s) { return esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color:var(--accent-blue);text-decoration:underline">$1</a>'); }
  function won(n) { return Number(n || 0).toLocaleString('ko-KR') + '원'; }

  function api(action, data) {
    if (DEMO) return demoApi(action, data);
    if (action === 'content') {
      return fetch(API + '?action=content').then(function (r) { return r.json(); });
    }
    return fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 프리플라이트 없이 앱스 스크립트로 전송
      body: JSON.stringify({ action: action, data: data })
    }).then(function (r) { return r.json(); });
  }

  function loadContent() {
    if (C) return Promise.resolve(C);
    return api('content').then(function (res) {
      if (!res.ok) throw new Error(res.error || '불러오기 실패');
      C = res; fillFooter(); return C;
    });
  }

  function fillFooter() {
    $('#ftTitle').textContent = C.site.title || '연구하는 교사되기 2027';
    $('#ftOrg').textContent = '연수기관 : ' + (C.site.org || '') + '  ·  운영 : ' + (C.site.operator || '');
    $('#ftMail').textContent = C.site.email || '';
    $('#mailLink').href = 'mailto:' + (C.site.email || '');
  }

  // ───────── 라우터 ─────────
  function route() {
    var key = (location.hash.replace(/^#\/?/, '').split('?')[0]) || '';
    $('#gnb').classList.remove('open');
    if (!key) return renderHome();
    var p = PAGES[key];
    if (!p) { location.hash = '#/'; return; }
    renderChrome(key, p);
    $('#view').innerHTML = '<div class="loading">불러오는 중…</div>';
    loadContent().then(function () { p.r($('#view')); }).catch(showLoadError);
    window.scrollTo(0, 0);
  }

  function renderChrome(key, p) {
    var g = p.g ? GROUPS[p.g] : { name: p.t, en: 'Information', tabs: [] };
    $('#hero').innerHTML = '<section class="hero"><h1>' + esc(g.name) + '</h1><p>' + esc(g.en) + '</p></section>';
    $('#subtabs').innerHTML = g.tabs.length ? '<div class="subtabs"><div class="wrap"><ul>' + g.tabs.map(function (t) {
      var on = t[0] === key;
      return '<li class="' + (on ? 'on' : '') + '"><a class="' + (on ? 'on' : '') + '" href="#/' + t[0] + '">' + (on ? '<small>' + esc(g.name) + '</small>' : '') + esc(t[1]) + '</a></li>';
    }).join('') + '</ul></div></div>' : '';
    $('#ptitle').innerHTML = '<div class="ptitle"><div class="wrap"><h2>' + esc(p.t) + '</h2><div class="crumb"><a class="home" href="#/" aria-label="홈"><i class="xi-home"></i></a><span>' + esc(g.name) + '</span><span>' + esc(p.t) + '</span></div></div></div>';
    $$('#gnb a').forEach(function (a) {
      var on = a.dataset.page ? a.dataset.page === key : a.dataset.group === p.g;
      a.classList.toggle('on', on);
    });
  }

  function showLoadError(e) {
    $('#view').innerHTML = '<div class="result fail"><i class="xi-error-o"></i><h4>정보를 불러오지 못했어요</h4><p class="note">잠시 후 새로고침해 주세요. 계속 안 되면 문의 메일로 알려 주세요.<br>(' + esc(e && e.message) + ')</p></div>';
  }

  // ───────── 홈 ─────────
  function renderHome() {
    $('#hero').innerHTML = '<section class="hero home"><p style="margin:0 0 12px">CENTER FOR RESEARCHING TEACHERS</p><h1>연구하는 교사되기 2027</h1><p class="lead">필요한 건 여기서 바로. 신청 변경부터 이수정보, 납입 확인까지 한 곳에서 해결하세요.</p></section>';
    $('#subtabs').innerHTML = '';
    $('#ptitle').innerHTML = '';
    $$('#gnb a').forEach(function (a) { a.classList.remove('on'); });
    var v = $('#view');
    v.innerHTML = '<div class="loading">불러오는 중…</div>';
    loadContent().then(function () {
      var notices = C.notices.slice(0, 5);
      var terms = C.terms.map(function (t) {
        var days = C.schedule.filter(function (s) { return s.term === t; });
        var range = days.length ? days[0].date + '(' + days[0].dow + ') ~ ' + days[days.length - 1].date + '(' + days[days.length - 1].dow + ')' : '일정 안내 예정';
        return '<tr><th>' + esc(t) + '</th><td>' + esc(range) + '</td></tr>';
      }).join('');
      v.innerHTML =
        '<div class="quick">' +
        quick('#/info', 'xi-pen-o', '이수정보 입력', '이수증 발급에 꼭 필요해요. 생년월일·나이스 번호를 정확히!') +
        quick('#/request', 'xi-exchange', '기수변경 · 취소 · 영수증', '메일 대신 여기서 신청하면 바로 접수돼요.') +
        quick('#/status', 'xi-search', '내 현황 · 납입확인', '신청 상태와 처리 결과를 확인해요.') +
        quick('#/faq', 'xi-help-o', '자주 묻는 질문', '문의 전에 먼저 확인해 주세요.') +
        '</div>' +
        '<div class="home-grid"><section><div class="sec-row"><h3 class="sec">공지사항</h3><a class="more" href="#/notice">더보기 <i class="xi-plus"></i></a></div>' +
        (notices.length ? '<ul class="list-simple">' + notices.map(function (n, i) {
          return '<li data-i="' + C.notices.indexOf(n) + '">' + '<b>' + (n.pinned ? '<span class="badge navy">공지</span> ' : '') + esc(n.title) + '</b><time>' + esc(n.date) + '</time></li>';
        }).join('') + '</ul>' : '<div class="empty">등록된 공지가 없어요.</div>') +
        '</section><section><div class="sec-row"><h3 class="sec">연수 일정</h3><a class="more" href="#/schedule">시간표 <i class="xi-plus"></i></a></div>' +
        '<table class="info-table">' + terms + '<tr><th>이수 기준</th><td>' + esc(C.site.criteria) + '</td></tr>' +
        (C.deadlines.info ? '<tr><th>이수정보 마감</th><td><b style="color:var(--danger)">' + esc(C.deadlines.info) + '</b></td></tr>' : '') +
        '</table></section></div>';
      $$('.list-simple li', v).forEach(function (li) { li.onclick = function () { location.hash = '#/notice?i=' + li.dataset.i; }; });
    }).catch(showLoadError);
    window.scrollTo(0, 0);
  }
  function quick(href, icon, title, desc) { return '<a href="' + href + '"><i class="' + icon + '"></i><b>' + esc(title) + '</b><span>' + esc(desc) + '</span></a>'; }

  // ───────── 연수 안내 ─────────
  function renderGuide(v) {
    var s = C.site;
    v.innerHTML = '<div class="narrow"><h3 class="sec">연수 개요</h3><table class="info-table">' +
      row('연수명', s.title) + row('연수기관', s.org) + row('운영', s.operator) +
      row('기수', C.terms.join(' / ')) + row('연수 방식', '실시간 원격(Zoom), 기수별 15시간') +
      row('이수 기준', s.criteria) + (s.fee ? row('연수비', won(s.fee)) : '') +
      '</table><h3 class="sec">이렇게 진행돼요</h3><div class="steps">' +
      '<div><b>STEP 1</b><strong>연수원 신청·입금</strong>서울대 사범대 교육연수원 사이트에서 신청</div>' +
      '<div><b>STEP 2</b><strong>이수정보 입력</strong>이 사이트에서 마감 전까지 입력</div>' +
      '<div><b>STEP 3</b><strong>연수 참여·이수</strong>Zoom 출석 80% 이상 → 이수증·나이스 등재(연수원)</div>' +
      '</div><div class="box note">신청 접수, 이수증 발급, 나이스 등재는 교육연수원에서 처리해요. 기수변경·취소·현금영수증·이수정보처럼 운영팀이 처리하는 일은 이 사이트의 셀프 서비스로 접수해 주세요.</div></div>';
  }
  function row(k, val) { return '<tr><th>' + esc(k) + '</th><td>' + esc(val) + '</td></tr>'; }

  var curTerm = null;
  function renderSchedule(v) {
    curTerm = curTerm || C.terms[0];
    var list = C.schedule.filter(function (s) { return s.term === curTerm; });
    v.innerHTML = '<div class="term-tabs">' + C.terms.map(function (t) { return '<button class="' + (t === curTerm ? 'on' : '') + '" data-t="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      (list.length ? '<table class="board"><thead><tr><th>날짜</th><th>시간</th><th>내용</th><th class="hide-m">강사</th></tr></thead><tbody>' +
        list.map(function (s) {
          return '<tr><td class="c">' + esc(s.date) + ' (' + esc(s.dow) + ')</td><td class="c">' + esc(s.start) + '~' + esc(s.end) + '</td><td>' + esc(s.title) + '</td><td class="c hide-m">' + esc(s.who) + '</td></tr>';
        }).join('') + '</tbody></table>' : '<div class="empty">' + esc(curTerm) + ' 시간표는 곧 안내할게요.</div>') +
      '<p class="note" style="margin-top:16px">요일은 날짜에서 자동으로 계산돼요. 일정이 바뀌면 이 표가 가장 최신이에요.</p>';
    $$('.term-tabs button', v).forEach(function (b) { b.onclick = function () { curTerm = b.dataset.t; renderSchedule(v); }; });
  }

  function renderAccess(v) {
    v.innerHTML = '<div class="narrow"><h3 class="sec">기수별 접속 링크</h3><table class="info-table">' +
      C.terms.map(function (t) {
        var l = C.links[t] || {};
        return '<tr><th>' + esc(t) + '</th><td>' +
          (l.zoom ? '<a class="btn navy" style="height:40px;padding:0 18px" href="' + esc(l.zoom) + '" target="_blank" rel="noopener"><i class="xi-video-camera"></i>Zoom 입장</a> ' : '<span class="note">Zoom 링크는 연수 전날 공개돼요.</span> ') +
          (l.kakao ? '<a class="btn line" style="height:40px;padding:0 18px" href="' + esc(l.kakao) + '" target="_blank" rel="noopener"><i class="xi-kakaotalk"></i>오픈채팅</a>' : '') +
          '</td></tr>';
      }).join('') +
      (C.padlet ? '<tr><th>질문 게시판</th><td><a class="btn line" style="height:40px;padding:0 18px" href="' + esc(C.padlet) + '" target="_blank" rel="noopener">패들렛 열기</a></td></tr>' : '') +
      '</table><h3 class="sec">출석이 인정되려면</h3><div class="box"><ul style="margin:0;padding-left:20px">' +
      '<li>Zoom 이름을 <b>기수_성명</b>(예: 1기_홍길동)으로 바꿔 주세요. 이름으로 출석을 확인해요.</li>' +
      '<li>카메라를 켜고 참여해 주세요. 장시간 자리 비움은 출석으로 인정되지 않을 수 있어요.</li>' +
      '<li>' + esc(C.site.criteria) + '이어야 이수돼요.</li></ul></div></div>';
  }

  // ───────── 공지·FAQ ─────────
  function renderNotice(v) {
    var m = location.hash.match(/[?&]i=(\d+)/);
    if (m && C.notices[+m[1]]) {
      var n = C.notices[+m[1]];
      v.innerHTML = '<div class="view"><p class="vTit">' + esc(n.title) + '</p><div class="meta"><span><i class="xi-user-o"></i> 운영팀</span><span><i class="xi-calendar"></i> ' + esc(n.date) + '</span></div><div class="body">' + linkify(n.body) + '</div></div><div class="btns"><a class="btn" href="#/notice">목록</a></div>';
      return;
    }
    v.innerHTML = C.notices.length ? '<table class="board"><thead><tr><th style="width:90px">번호</th><th>제목</th><th style="width:140px">등록일</th></tr></thead><tbody>' +
      C.notices.map(function (n, i) {
        return '<tr class="click" data-i="' + i + '"><td class="c">' + (n.pinned ? '<span class="badge navy">공지</span>' : (C.notices.length - i)) + '</td><td>' + esc(n.title) + '</td><td class="c">' + esc(n.date) + '</td></tr>';
      }).join('') + '</tbody></table>' : '<div class="empty">등록된 공지가 없어요.</div>';
    $$('tr.click', v).forEach(function (tr) { tr.onclick = function () { location.hash = '#/notice?i=' + tr.dataset.i; }; });
  }

  var faqCat = '전체';
  function renderFaq(v) {
    var cats = ['전체'].concat(C.faq.map(function (f) { return f.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
    var list = C.faq.filter(function (f) { return faqCat === '전체' || f.cat === faqCat; });
    v.innerHTML = '<div class="faq-cats">' + cats.map(function (c) { return '<button class="' + (c === faqCat ? 'on' : '') + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<div class="faq">' + list.map(function (f) {
        return '<details><summary><span class="q">Q</span><span>' + esc(f.q) + '</span></summary><div class="ans"><span class="a">A</span><div>' + linkify(f.a) + '</div></div></details>';
      }).join('') + '</div>' +
      '<div class="faq-cta"><p class="note">찾는 답이 없나요? 기수변경·취소·영수증은 메일보다 셀프 신청이 빨라요.</p><a class="btn navy" href="#/request">셀프 신청하기</a></div>';
    $$('.faq-cats button', v).forEach(function (b) { b.onclick = function () { faqCat = b.textContent; renderFaq(v); }; });
  }

  // ───────── 셀프 신청 ─────────
  function renderRequest(v) {
    var termOpts = C.terms.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
    v.innerHTML = '<div class="narrow">' +
      (C.deadlines.request ? '<p class="note" style="text-align:right">셀프 신청 마감 : <b style="color:var(--danger)">' + esc(C.deadlines.request) + '</b></p>' : '') +
      '<form class="form" id="reqForm" novalidate>' +
      field('신청 유형', true, '<div class="radios">' + ['기수변경', '수강취소', '현금영수증 수정', '기타 문의'].map(function (t, i) {
        return '<label><input type="radio" name="type" value="' + t + '"' + (i === 0 ? ' checked' : '') + '>' + t + '</label>';
      }).join('') + '</div>', 'type') +
      field('성명', true, '<input type="text" name="name" autocomplete="name" placeholder="연수 신청할 때 쓴 이름">', 'name') +
      field('휴대폰', true, '<input type="tel" name="phone" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000">', 'phone', '신청할 때 쓴 번호로 본인을 확인해요.') +
      field('현재 기수', false, '<select name="fromTerm"><option value="">선택</option>' + termOpts + '</select>', 'fromTerm') +
      '<div data-show="기수변경">' + field('희망 기수', true, '<select name="toTerm"><option value="">선택</option>' + termOpts + '</select>', 'toTerm', '정원이 찬 기수는 대기로 접수되고, 자리가 나면 순서대로 안내해요.') + '</div>' +
      '<div data-show="현금영수증 수정">' + field('현금영수증 번호', true, '<input type="text" name="receipt" inputmode="numeric" placeholder="휴대폰 번호 또는 사업자번호">', 'receipt') + '</div>' +
      '<div data-show="수강취소">' + '<div class="field"><div class="lbl">취소 안내</div><div class="note">취소·환불 기준은 교육연수원 규정을 따라요. 접수되면 운영팀이 확인 후 연수원에 전달해요.</div></div></div>' +
      field('내용', false, '<textarea name="memo" placeholder="필요한 내용을 적어 주세요. (선택)"></textarea>', 'memo') +
      '</form>' + agreeBox() +
      '<div class="btns"><button class="btn navy" id="reqSubmit"><i class="xi-check"></i>신청하기</button></div></div>';
    var f = $('#reqForm');
    function toggle() {
      var t = f.type.value;
      $$('[data-show]', f).forEach(function (d) { d.hidden = d.dataset.show !== t; });
    }
    $$('input[name=type]', f).forEach(function (r) { r.onchange = toggle; });
    toggle();
    autoPhone(f.phone);
    $('#reqSubmit').onclick = function () {
      clearErrs(f);
      var d = { type: f.type.value, name: f.name.value.trim(), phone: f.phone.value, fromTerm: f.fromTerm.value, toTerm: f.toTerm.value, receipt: f.receipt.value.trim(), memo: f.memo.value.trim() };
      var bad = false;
      if (!d.name) bad = setErr(f, 'name', '성명을 입력해 주세요.') || true;
      if (!normPhone(d.phone)) bad = setErr(f, 'phone', '010-0000-0000 형식으로 입력해 주세요.') || true;
      if (d.type === '기수변경' && !d.toTerm) bad = setErr(f, 'toTerm', '희망 기수를 골라 주세요.') || true;
      if (d.type === '기수변경' && d.toTerm && d.toTerm === d.fromTerm) bad = setErr(f, 'toTerm', '현재 기수와 같은 기수예요.') || true;
      if (d.type === '현금영수증 수정' && !d.receipt) bad = setErr(f, 'receipt', '현금영수증 번호를 입력해 주세요.') || true;
      if (!$('#agree').checked) { alertBox('개인정보 수집·이용에 동의해 주세요.'); bad = true; }
      if (bad) return focusErr(f);
      submit(this, 'request', d, function (res) {
        v.innerHTML = '<div class="narrow"><div class="result"><i class="xi-check-circle-o"></i><h4>' + esc(d.type) + ' 신청이 접수됐어요</h4>' +
          '<p>접수번호 <b style="color:var(--navy);font-size:20px">' + esc(res.no) + '</b></p>' +
          '<p class="note">처리 결과는 <a href="#/status" style="text-decoration:underline">내 현황 조회</a>에서 확인할 수 있어요. 같은 내용으로 메일을 다시 보내지 않으셔도 돼요.' +
          (res.matched ? '' : '<br><b style="color:var(--danger)">신청자 명단에서 이름·번호를 바로 찾지 못했어요. 운영팀이 직접 확인할게요.</b>') + '</p></div>' +
          '<div class="btns"><a class="btn line" href="#/">처음으로</a><a class="btn" href="#/status">내 현황 조회</a></div></div>';
      });
    };
  }

  // ───────── 이수정보 입력 ─────────
  function renderInfo(v) {
    var termOpts = C.terms.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
    v.innerHTML = '<div class="narrow">' +
      '<div class="box" style="margin-bottom:28px"><b style="color:var(--navy)">이수증과 나이스 연수 이력에 그대로 들어가는 정보예요.</b><br><span class="note">틀리면 이수 처리가 늦어져요. 잘못 넣었다면 같은 이름·휴대폰으로 다시 제출하면 최신 내용으로 바뀌어요.' +
      (C.deadlines.info ? ' 마감 <b style="color:var(--danger)">' + esc(C.deadlines.info) + '</b>' : '') + '</span></div>' +
      '<form class="form" id="infoForm" novalidate>' +
      field('수강 기수', true, '<select name="term"><option value="">선택</option>' + termOpts + '</select>', 'term') +
      field('성명', true, '<input type="text" name="name" autocomplete="name" placeholder="홍길동">', 'name', '띄어쓰기 없이 실명으로 입력해 주세요.') +
      field('생년월일', true, '<input type="text" name="birth" inputmode="numeric" maxlength="10" placeholder="19850315">', 'birth', '숫자 8자리로 입력하면 자동으로 정리돼요.') +
      field('휴대폰', true, '<input type="tel" name="phone" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000">', 'phone') +
      field('시도교육청', true, '<select name="sido"><option value="">선택</option>' + SIDO.map(function (s) { return '<option>' + s + '</option>'; }).join('') + '</select>', 'sido', '근무하는 학교가 속한 교육청을 골라 주세요.') +
      field('학교명', true, '<input type="text" name="school" placeholder="OO초등학교">', 'school', '"OO초", "OO중"처럼 줄이지 말고 정식 명칭으로 적어 주세요.') +
      field('나이스 개인번호', true, '<input type="text" name="neis" autocapitalize="characters" placeholder="나이스 개인번호">', 'neis', '나이스 > 나의 메뉴 > 인사기록에서 확인할 수 있어요.') +
      field('이메일', false, '<input type="email" name="email" autocomplete="email" placeholder="선택 입력">', 'email') +
      '</form>' + agreeBox() +
      '<div class="btns"><button class="btn navy" id="infoSubmit"><i class="xi-check"></i>이수정보 제출</button></div></div>';
    var f = $('#infoForm');
    autoPhone(f.phone);
    f.birth.addEventListener('blur', function () {
      var b = normBirth(f.birth.value);
      if (b) { f.birth.value = b; showOk(f, 'birth', b.slice(0, 4) + '년 ' + (+b.slice(5, 7)) + '월 ' + (+b.slice(8)) + '일 맞나요?'); }
    });
    f.school.addEventListener('blur', function () {
      var s = f.school.value.trim().replace(/초$/, '초등학교').replace(/중$/, '중학교').replace(/고$/, '고등학교');
      f.school.value = s;
    });
    $('#infoSubmit').onclick = function () {
      clearErrs(f);
      var d = { term: f.term.value, name: f.name.value.replace(/\s/g, ''), birth: normBirth(f.birth.value), phone: normPhone(f.phone.value), sido: f.sido.value, school: f.school.value.trim(), neis: f.neis.value.replace(/\s/g, '').toUpperCase(), email: f.email.value.trim() };
      var bad = false;
      if (!d.term) bad = setErr(f, 'term', '수강 기수를 골라 주세요.') || true;
      if (d.name.length < 2) bad = setErr(f, 'name', '성명을 정확히 입력해 주세요.') || true;
      if (!d.birth) bad = setErr(f, 'birth', '생년월일 8자리를 확인해 주세요. (예: 19850315)') || true;
      if (!d.phone) bad = setErr(f, 'phone', '010-0000-0000 형식으로 입력해 주세요.') || true;
      if (!d.sido) bad = setErr(f, 'sido', '시도교육청을 골라 주세요.') || true;
      if (!/(학교|유치원|교육청|교육지원청|연구원|센터)$/.test(d.school)) bad = setErr(f, 'school', '정식 학교명으로 입력해 주세요. (예: OO초등학교)') || true;
      if (!/^[A-Za-z0-9]{5,15}$/.test(d.neis)) bad = setErr(f, 'neis', '나이스 개인번호를 확인해 주세요.') || true;
      if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) bad = setErr(f, 'email', '이메일 형식을 확인해 주세요.') || true;
      if (!$('#agree').checked) { alertBox('개인정보 수집·이용에 동의해 주세요.'); bad = true; }
      if (bad) return focusErr(f);
      submit(this, 'info', d, function (res) {
        v.innerHTML = '<div class="narrow"><div class="result"><i class="xi-check-circle-o"></i><h4>' + (res.updated ? '이수정보가 수정됐어요' : '이수정보가 제출됐어요') + '</h4>' +
          '<table class="info-table" style="text-align:left;margin:24px 0 8px">' + row('기수', d.term) + row('성명', d.name) + row('생년월일', d.birth) + row('시도교육청', d.sido) + row('학교명', d.school) + '</table>' +
          '<p class="note">틀린 곳이 있으면 같은 이름·휴대폰으로 다시 제출하면 돼요.' +
          (res.matched ? '' : '<br><b style="color:var(--danger)">신청자 명단에서 이름·번호를 바로 찾지 못했어요. 연수 신청할 때 쓴 휴대폰 번호인지 확인해 주세요.</b>') + '</p></div>' +
          '<div class="btns"><a class="btn line" href="#/info">다시 입력</a><a class="btn" href="#/status">내 현황 조회</a></div></div>';
      });
    };
  }

  // ───────── 내 현황 조회 ─────────
  function renderStatus(v) {
    v.innerHTML = '<div class="narrow"><form class="form" id="stForm" novalidate>' +
      field('성명', true, '<input type="text" name="name" autocomplete="name">', 'name') +
      field('휴대폰', true, '<input type="tel" name="phone" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000">', 'phone', '연수 신청할 때 쓴 번호를 입력해 주세요.') +
      '</form><div class="btns"><button class="btn navy" id="stSubmit"><i class="xi-search"></i>조회하기</button></div><div id="stOut"></div></div>';
    var f = $('#stForm');
    autoPhone(f.phone);
    $('#stSubmit').onclick = function () {
      clearErrs(f);
      var d = { name: f.name.value.replace(/\s/g, ''), phone: normPhone(f.phone.value) };
      var bad = false;
      if (!d.name) bad = setErr(f, 'name', '성명을 입력해 주세요.') || true;
      if (!d.phone) bad = setErr(f, 'phone', '010-0000-0000 형식으로 입력해 주세요.') || true;
      if (bad) return focusErr(f);
      submit(this, 'status', d, function (res) { showStatus($('#stOut'), res); }, function (msg) {
        $('#stOut').innerHTML = '<div class="result fail" style="margin-top:32px"><i class="xi-error-o"></i><h4>조회 결과가 없어요</h4><p class="note">' + esc(msg) + '</p></div>';
      });
    };
  }

  function showStatus(out, r) {
    var a = r.applicant, info = r.info;
    var stateBadge = a ? (a.state === '취소' ? '<span class="badge red">취소</span>' : a.state === '대기' ? '<span class="badge gray">대기</span>' : '<span class="badge ok">신청 완료</span>') : '<span class="badge gray">명단 확인 중</span>';
    var reqs = r.requests.length ? r.requests.map(function (q) {
      var cls = q.state === '완료' ? 'ok' : q.state === '반려' ? 'red' : 'navy';
      return '<div style="padding:6px 0"><span class="badge ' + cls + '">' + esc(q.state) + '</span> ' + esc(q.type) + ' <span class="note">(' + esc(q.no) + ', ' + esc(q.at) + ')</span>' + (q.memo ? '<div class="note">↳ ' + esc(q.memo) + '</div>' : '') + '</div>';
    }).join('') : '<span class="note">셀프 신청 내역이 없어요.</span>';
    out.innerHTML = '<div style="margin-top:40px"><h3 class="sec">' + esc(r.name) + ' 선생님 현황</h3><div class="status-card">' +
      '<div class="status-row"><div>신청 상태</div><div>' + stateBadge + (a ? ' ' + esc(a.term) : '') + '</div></div>' +
      '<div class="status-row"><div>이수정보</div><div>' + (info ? '<span class="badge ok">제출 완료</span> <span class="note">' + esc(info.at) + ' · ' + esc(info.term) + ' · ' + esc(info.sido) + ' ' + esc(info.school) + ' · ' + esc(info.birthMasked) + '</span>' : '<span class="badge red">미제출</span> <a href="#/info" style="text-decoration:underline;margin-left:6px">지금 입력하기</a>') + '</div></div>' +
      '<div class="status-row"><div>셀프 신청 처리</div><div>' + reqs + '</div></div>' +
      '<div class="status-row"><div>연수비 납입 확인서</div><div>' + (r.certificate ? '<button class="btn line" style="height:40px;padding:0 18px" id="certBtn"><i class="xi-print"></i>확인서 보기·인쇄</button>' : '<span class="note">' + (C.certificate ? '입금 확인 후 출력할 수 있어요.' : '발급 준비 중이에요.') + '</span>') + '</div></div>' +
      '</div><div id="certOut"></div></div>';
    if (r.certificate) $('#certBtn').onclick = function () { showCert($('#certOut'), r.certificate); };
  }

  function showCert(out, c) {
    out.innerHTML = '<div class="cert"><h4>납입확인서</h4><table>' +
      '<tr><th>성명</th><td>' + esc(c.name) + '</td></tr>' +
      '<tr><th>연수명</th><td>' + esc(c.course) + ' (' + esc(c.term) + ')</td></tr>' +
      '<tr><th>연수기관</th><td>' + esc(c.org) + '</td></tr>' +
      '<tr><th>납입 금액</th><td>' + won(c.amount) + '</td></tr>' +
      '<tr><th>납입일</th><td>' + esc(c.paidAt) + '</td></tr>' +
      '</table><p>위와 같이 연수비를 납입하였음을 확인합니다.</p><p class="note">' + esc(c.issuedAt) + '</p><div class="issuer">' + esc(c.operator) + '</div></div>' +
      '<div class="btns"><button class="btn" onclick="window.print()"><i class="xi-print"></i>인쇄 / PDF 저장</button></div>';
    out.scrollIntoView({ behavior: 'smooth' });
  }

  function renderPrivacy(v) {
    v.innerHTML = '<div class="narrow"><table class="info-table">' +
      row('수집 항목', '성명, 휴대폰, 생년월일, 시도교육청, 학교명, 나이스 개인번호, 이메일(선택), 현금영수증 번호(해당 시)') +
      row('이용 목적', '직무연수 이수 처리(이수증 발급·나이스 등재), 신청 변경 처리, 연수 운영 안내') +
      row('보관 기간', '연수 종료 후 이수 처리 완료 시점부터 1년 (이후 파기)') +
      row('제공', '이수 처리를 위해 교육연수원에 제공') +
      row('보관 위치', '운영팀 구글 계정의 비공개 시트 (운영 담당자만 열람)') +
      '</table><p class="note">동의하지 않을 수 있지만, 이 경우 이수 처리가 어려울 수 있어요.</p></div>';
  }

  // ───────── 폼 도우미 ─────────
  function field(label, req, inner, name, hint) {
    return '<div class="field" data-f="' + name + '"><' + (inner.indexOf('radios') > -1 ? 'div class="lbl"' : 'label for="f_' + name + '"') + '>' + esc(label) + (req ? '<span class="req">*</span>' : '') + '</' + (inner.indexOf('radios') > -1 ? 'div' : 'label') + '><div>' +
      inner.replace(/name="([a-zA-Z]+)"/, function (m, n) { return n === name && inner.indexOf('radio') < 0 ? 'id="f_' + n + '" name="' + n + '"' : m; }) +
      (hint ? '<div class="hint">' + esc(hint) + '</div>' : '') + '</div></div>';
  }
  function agreeBox() {
    return '<div class="agree">입력한 정보는 연수 이수 처리와 신청 변경 처리에만 쓰고, 이수 처리를 위해 교육연수원에 제공돼요. 보관 기간 등 자세한 내용은 <a href="#/privacy" style="text-decoration:underline" target="_blank">개인정보 처리 안내</a>를 확인해 주세요.<label><input type="checkbox" id="agree"> 개인정보 수집·이용에 동의합니다.</label></div>';
  }
  function setErr(f, name, msg) {
    var box = $('[data-f="' + name + '"]', f);
    if (!box) return;
    box.classList.add('invalid');
    var e = document.createElement('div'); e.className = 'err'; e.textContent = msg;
    box.lastElementChild.appendChild(e);
  }
  function showOk(f, name, msg) {
    var box = $('[data-f="' + name + '"]', f);
    $$('.ok-msg', box).forEach(function (x) { x.remove(); });
    var e = document.createElement('div'); e.className = 'ok-msg'; e.textContent = msg;
    box.lastElementChild.appendChild(e);
  }
  function clearErrs(f) {
    $$('.invalid', f).forEach(function (x) { x.classList.remove('invalid'); });
    $$('.err', f).forEach(function (x) { x.remove(); });
  }
  function focusErr(f) {
    var el = $('.invalid input, .invalid select', f);
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  function alertBox(msg) {
    var a = $('.agree'); if (!a) return;
    $$('.err', a).forEach(function (x) { x.remove(); });
    var e = document.createElement('div'); e.className = 'err'; e.style.cssText = 'color:var(--danger);font-weight:700;margin-top:6px'; e.textContent = msg; a.appendChild(e);
  }
  function autoPhone(el) {
    el.addEventListener('input', function () {
      var d = el.value.replace(/\D/g, '').slice(0, 11);
      el.value = d.length < 4 ? d : d.length < 8 ? d.slice(0, 3) + '-' + d.slice(3) : d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
    });
  }
  function submit(btn, action, data, ok, fail) {
    btn.disabled = true;
    var label = btn.innerHTML;
    btn.innerHTML = '보내는 중…';
    api(action, data).then(function (res) {
      if (res.ok) ok(res);
      else if (fail) fail(res.error);
      else window.alert(res.error || '처리하지 못했어요.');
    }).catch(function () {
      window.alert('연결이 불안정해요. 잠시 후 다시 시도해 주세요.');
    }).then(function () { btn.disabled = false; btn.innerHTML = label; });
  }

  function normPhone(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (!/^01[016789]\d{7,8}$/.test(d)) return '';
    return d.length === 11 ? d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7) : d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  }
  function normBirth(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 6) d = (+d.slice(0, 2) > 30 ? '19' : '20') + d;
    if (d.length !== 8) return '';
    var y = +d.slice(0, 4), m = +d.slice(4, 6), day = +d.slice(6);
    var dt = new Date(y, m - 1, day);
    if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== day || y < 1940 || y > 2008) return '';
    return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6);
  }

  // ───────── 미리보기(예시 데이터) ─────────
  function demoApi(action, data) {
    var wait = function (x) { return new Promise(function (r) { setTimeout(function () { r(x); }, 350); }); };
    if (action === 'content') {
      var sch = [];
      [['1기', '2027-02-01'], ['2기', '2027-02-04']].forEach(function (t) {
        var base = new Date(t[1]);
        for (var i = 0; i < 3; i++) {
          var d = new Date(base); d.setDate(d.getDate() + i);
          var ds = d.toISOString().slice(0, 10);
          [['09:00', '12:00', ['연구하는 교사의 첫 질문', '연구 설계와 자료 수집', '연구 결과 정리와 공유'][i]], ['13:00', '15:00', ['교실 연구 사례 나누기', 'AI로 자료 분석하기', '나의 연구 계획 발표'][i]]].forEach(function (s) {
            sch.push({ term: t[0], date: ds, dow: DOW[d.getDay()], start: s[0], end: s[1], title: s[2], who: '강사 예정' });
          });
        }
      });
      return wait({
        ok: true,
        site: { title: '연구하는 교사되기 2027', org: '서울대학교 사범대학 교육연수원', operator: '연구하는 교사되기 운영팀', email: 'snu27@dumokquoka.com', criteria: '총 15시간 중 12시간(80%) 이상 출석', fee: 0 },
        terms: ['1기', '2기'], links: { '1기': { zoom: '', kakao: '' }, '2기': { zoom: '', kakao: '' } }, padlet: '',
        deadlines: { request: '2027-01-25', info: '2027-02-10' }, certificate: true, sido: SIDO,
        notices: [
          { date: '2027-01-05', title: '[필독] 이수정보 입력 안내 (마감 2/10)', body: '이수증 발급과 나이스 등재를 위해 이수정보를 꼭 입력해 주세요.\n생년월일은 8자리, 시도교육청은 목록에서 골라 주세요.', pinned: true },
          { date: '2027-01-03', title: '기수변경·취소·현금영수증은 셀프 신청으로 접수해 주세요', body: '메일 대신 셀프 신청 메뉴를 이용하면 바로 접수되고, 처리 결과도 내 현황에서 확인할 수 있어요.', pinned: true },
          { date: '2026-12-20', title: '2027 연구하는 교사되기 일정 안내', body: '1기 2/1~2/3, 2기 2/4~2/6 (예시 일정입니다)', pinned: false }
        ],
        faq: [
          { cat: '신청·변경', q: '기수를 바꾸고 싶어요.', a: '셀프 신청 > 기수변경으로 접수해 주세요. 희망 기수 정원이 차 있으면 대기로 접수되고, 자리가 나면 순서대로 안내해요.' },
          { cat: '신청·변경', q: '수강을 취소하고 환불받고 싶어요.', a: '셀프 신청 > 수강취소로 접수해 주세요. 환불 기준은 교육연수원 규정을 따라요.' },
          { cat: '영수증·증빙', q: '현금영수증 번호를 잘못 넣었어요.', a: '셀프 신청 > 현금영수증 수정으로 올바른 번호를 접수해 주세요.' },
          { cat: '영수증·증빙', q: '연수비 납입증명서가 필요해요.', a: '내 현황 조회에서 입금이 확인된 분은 납입확인서를 바로 인쇄하거나 PDF로 저장할 수 있어요.' },
          { cat: '이수', q: '이수 기준이 어떻게 되나요?', a: '총 15시간 중 12시간(80%) 이상 출석하면 이수돼요. Zoom 이름을 기수_성명으로 바꿔 주세요.' },
          { cat: '이수', q: '이수정보를 잘못 입력했어요.', a: '같은 이름과 휴대폰 번호로 이수정보를 다시 제출하면 최신 내용으로 바뀌어요. 메일을 따로 보내지 않으셔도 돼요.' },
          { cat: '이수', q: '이수증은 언제 나오나요?', a: '연수가 끝나고 교육연수원에서 이수 처리를 마치면 발급돼요. 나이스 등재도 연수원에서 진행해요.' }
        ],
        schedule: sch
      });
    }
    if (action === 'request') return wait({ ok: true, no: 'R0105-' + (1000 + Math.floor(Math.random() * 9000)), matched: true });
    if (action === 'info') return wait({ ok: true, updated: false, matched: true });
    if (action === 'status') {
      return wait({
        ok: true, name: data.name,
        applicant: { term: '1기', state: '신청', paid: true },
        info: { at: '2027-01-08', term: '1기', sido: '경기', school: '예시초등학교', birthMasked: '1985-**-**' },
        requests: [{ no: 'R0104-2381', type: '현금영수증 수정', at: '2027-01-04', state: '완료', memo: '수정한 번호로 재발행했어요.' }],
        certificate: { name: data.name, term: '1기', amount: 120000, paidAt: '2026-12-28', course: '연구하는 교사되기 2027', org: '서울대학교 사범대학 교육연수원', operator: '연구하는 교사되기 운영팀', issuedAt: new Date().toISOString().slice(0, 10) }
      });
    }
    return wait({ ok: false, error: '알 수 없는 요청' });
  }

  // ───────── 시작 ─────────
  if (DEMO) $('#demo').hidden = false;
  $('#menuBtn').onclick = function () { $('#gnb').classList.toggle('open'); };
  window.addEventListener('hashchange', route);
  route();
})();
