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
    attend: { name: '출석체크', en: 'Attendance', tabs: [] },
    materials: { name: '연수자료', en: 'Course Materials', tabs: [] },
    talk: { name: '공지·FAQ', en: 'Notice & FAQ', tabs: [['notice', '공지사항'], ['faq', '자주 묻는 질문']] },
    board: { name: '게시판', en: 'Q&A · Refund', tabs: [['qna', 'Q&A'], ['refund', '환불 요청']] },
    self: { name: '셀프 서비스', en: 'Self Service', tabs: [['request', '셀프 신청'], ['info', '이수정보 입력'], ['status', '내 현황 조회']] }
  };
  var PAGES = {
    guide: { g: 'guide', t: '연수 개요', r: renderGuide },
    schedule: { g: 'guide', t: '일정·시간표', r: renderSchedule },
    access: { g: 'guide', t: '접속 안내', r: renderAccess },
    notice: { g: 'talk', t: '공지사항', r: renderNotice },
    faq: { g: 'talk', t: '자주 묻는 질문', r: renderFaq },
    attend: { g: 'attend', t: '출석체크', r: renderAttend },
    materials: { g: 'materials', t: '연수자료', r: renderMaterials },
    qna: { g: 'board', t: 'Q&A', r: function (v) { renderBoard(v, 'Q&A'); } },
    refund: { g: 'board', t: '환불 요청', r: function (v) { renderBoard(v, '환불요청'); } },
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
        quick('#/attend', 'xi-check-circle-o', '출석체크', '연수 당일 여기서 출석 → 강의실 입장 → 퇴실체크') +
        quick('#/info', 'xi-pen-o', '이수정보 입력', '이수증 발급에 꼭 필요해요. 생년월일·나이스 번호를 정확히!') +
        quick('#/request', 'xi-exchange', '취소 · 현금영수증', '메일 대신 여기서 신청하면 바로 접수돼요. (기수 변경 불가)') +
        quick('#/qna', 'xi-forum', 'Q&A · 환불 요청', '궁금한 점과 환불 요청은 게시판에 남겨 주세요.') +
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
      '</div><div class="box" style="margin-bottom:16px;border-left:4px solid var(--danger)"><b style="color:var(--danger)">2027년에는 기수 변경을 받지 않습니다.</b><br><span class="note">신청한 기수 그대로 참여해 주세요. 일정이 맞지 않으면 기수 변경 대신 수강 취소로 접수됩니다. 신청할 때 기수를 신중히 골라 주세요.</span></div><div class="box note">신청 접수, 이수증 발급, 나이스 등재는 교육연수원에서 처리해요. 취소·현금영수증·이수정보처럼 운영팀이 처리하는 일은 이 사이트의 셀프 서비스로 접수해 주세요.</div></div>';
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
      ('<tr><th>연수자료</th><td><a class="btn line" style="height:40px;padding:0 18px" href="#/materials">연수자료 보기</a></td></tr>' + '') +
      '</table><h3 class="sec">출석이 인정되려면</h3><div class="box"><ul style="margin:0;padding-left:20px">' +
      '<li>연수 당일 <a href="#/attend" style="text-decoration:underline"><b>출석체크</b></a>에서 출석하고 강의실에 들어가, 끝날 때 <b>퇴실체크</b>까지 눌러 주세요. 둘 다 있어야 그날 출석이 인정돼요.</li>' +
      '<li>Zoom 이름은 <b>기수_성명</b>(예: 1기_홍길동)으로 바꿔 주세요.</li>' +
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
      '<div class="faq-cta"><p class="note">찾는 답이 없나요? 취소·현금영수증은 메일보다 셀프 신청이 빨라요. (기수 변경은 받지 않아요)</p><a class="btn navy" href="#/request">셀프 신청하기</a></div>';
    $$('.faq-cats button', v).forEach(function (b) { b.onclick = function () { faqCat = b.textContent; renderFaq(v); }; });
  }

  // ───────── 셀프 신청 ─────────
  function renderRequest(v) {
    var termOpts = C.terms.map(function (t) { return '<option>' + esc(t) + '</option>'; }).join('');
    v.innerHTML = '<div class="narrow">' +
      (C.deadlines.request ? '<p class="note" style="text-align:right">셀프 신청 마감 : <b style="color:var(--danger)">' + esc(C.deadlines.request) + '</b></p>' : '') +
      '<div class="box" style="margin-bottom:24px;border-left:4px solid var(--danger)"><b style="color:var(--danger)">기수 변경은 받지 않아요.</b> <span class="note">신청한 기수 그대로 참여해 주세요. 참여가 어려우면 수강 취소로 접수해 주세요.</span></div>' +
      '<form class="form" id="reqForm" novalidate>' +
      field('신청 유형', true, '<div class="radios">' + ['수강취소', '현금영수증 수정', '기타 문의'].map(function (t, i) {
        return '<label><input type="radio" name="type" value="' + t + '"' + (i === 0 ? ' checked' : '') + '>' + t + '</label>';
      }).join('') + '</div>', 'type') +
      field('성명', true, '<input type="text" name="name" autocomplete="name" placeholder="연수 신청할 때 쓴 이름">', 'name') +
      field('휴대폰', true, '<input type="tel" name="phone" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000">', 'phone', '신청할 때 쓴 번호로 본인을 확인해요.') +
      field('수강 기수', false, '<select name="fromTerm"><option value="">선택</option>' + termOpts + '</select>', 'fromTerm') +
      '<div data-show="현금영수증 수정">' + field('현금영수증 번호', true, '<input type="text" name="receipt" inputmode="numeric" placeholder="휴대폰 번호 또는 사업자번호">', 'receipt') + '</div>' +
      '<div data-show="수강취소">' + '<div class="field"><div class="lbl">취소 안내</div><div class="note">취소·환불 기준은 교육연수원 규정을 따라요. 이미 입금하셨다면 <a href="#/refund" style="text-decoration:underline"><b>환불 요청 게시판</b></a>에 사유와 함께 따로 남겨 주세요.</div></div></div>' +
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
      var d = { type: f.type.value, name: f.name.value.trim(), phone: f.phone.value, fromTerm: f.fromTerm.value, receipt: f.receipt.value.trim(), memo: f.memo.value.trim() };
      var bad = false;
      if (!d.name) bad = setErr(f, 'name', '성명을 입력해 주세요.') || true;
      if (!normPhone(d.phone)) bad = setErr(f, 'phone', '010-0000-0000 형식으로 입력해 주세요.') || true;
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
      field('나이스 개인번호', true, '<input type="text" name="neis" autocapitalize="characters" placeholder="J123456789" maxlength="10">', 'neis', '영문 1자 + 숫자 9자. 나이스 > 나의 메뉴 > 인사기록에서 확인할 수 있어요.') +
      field('이메일', true, '<input type="email" name="email" autocomplete="email" placeholder="name@example.com">', 'email', '환불·이수 안내를 이메일로 보내 드려요.') +
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
      if (!/^[A-Z][0-9]{9}$/.test(d.neis)) bad = setErr(f, 'neis', '나이스 개인번호는 영문 1자 + 숫자 9자예요. (예: J123456789)') || true;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) bad = setErr(f, 'email', '이메일 형식을 확인해 주세요.') || true;
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

  // ───────── 출석체크: 출석 → 강의실 입장 → 퇴실 ─────────
  var ME_KEY = 'snu27_me';
  function loadMe() { try { return JSON.parse(localStorage.getItem(ME_KEY) || 'null'); } catch (e) { return null; } }
  function saveMe(me) { try { if (me) localStorage.setItem(ME_KEY, JSON.stringify(me)); else localStorage.removeItem(ME_KEY); } catch (e) {} }
  function renderAttend(v) {
    var me = loadMe() || {};
    var a = C.attend || { before: 30, outBefore: 20, need: 12 };
    v.innerHTML = '<div class="narrow">' +
      '<ol class="att-steps"><li id="st1" class="on"><b>1</b>출석체크</li><li id="st2"><b>2</b>강의실 입장</li><li id="st3"><b>3</b>퇴실체크</li></ol>' +
      '<form class="form" id="atForm" novalidate>' +
      field('성명', true, '<input type="text" name="name" autocomplete="name" placeholder="연수 신청할 때 쓴 이름" value="' + esc(me.name || '') + '">', 'name') +
      field('휴대폰', true, '<input type="tel" name="phone" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" value="' + esc(me.phone || '') + '">', 'phone', '같은 이름이 여러 분 계셔서 휴대폰 번호로 본인을 확인해요.') +
      '<label class="remember"><input type="checkbox" id="atRemember"' + (me.name ? ' checked' : '') + '> 이 기기에 기억하기 (퇴실할 때 다시 안 써도 돼요)</label>' +
      '</form>' +
      '<div class="att-actions"><button class="btn navy big" id="atIn"><i class="xi-check-circle-o"></i>출석체크하고 강의실 입장</button><button class="btn line big" id="atOut"><i class="xi-log-out"></i>퇴실체크</button></div>' +
      '<div id="atOut2"></div>' +
      '<div class="box" style="margin-top:32px"><b>출석 인정 방법</b><ul style="margin:8px 0 0;padding-left:20px" class="note">' +
      '<li>출석체크는 연수 시작 <b>' + a.before + '분 전</b>부터, 퇴실체크는 끝나기 <b>' + a.outBefore + '분 전</b>부터 할 수 있어요.</li>' +
      '<li>출석과 퇴실이 <b>둘 다</b> 있어야 그날 출석으로 인정돼요. Zoom이 끊겨서 다시 들어올 때도 출석체크를 다시 누르면 강의실 링크가 나와요.</li>' +
      '<li>' + esc(C.site.criteria) + '이어야 이수돼요. (인정 ' + a.need + '시간 이상)</li>' +
      '<li>Zoom 이름은 <b>기수_성명</b>(예: 1기_홍길동)으로 바꿔 주세요.</li>' +
      '<li>깜빡했거나 오류가 났다면 <a href="#/qna" style="text-decoration:underline">Q&A 게시판</a>에 남겨 주세요. 운영팀이 확인해요.</li></ul></div></div>';
    var f = $('#atForm');
    autoPhone(f.phone);
    function go(kind, btn) {
      clearErrs(f);
      var d = { name: f.name.value.replace(/\s/g, ''), phone: normPhone(f.phone.value), kind: kind };
      var bad = false;
      if (d.name.length < 2) bad = setErr(f, 'name', '성명을 입력해 주세요.') || true;
      if (!d.phone) bad = setErr(f, 'phone', '010-0000-0000 형식으로 입력해 주세요.') || true;
      if (bad) return focusErr(f);
      saveMe($('#atRemember').checked ? { name: d.name, phone: d.phone } : null);
      submit(btn, 'attend', d, function (res) { attendDone($('#atOut2'), res); }, function (msg) {
        $('#atOut2').innerHTML = '<div class="result fail" style="margin-top:28px"><i class="xi-error-o"></i><h4>' + (kind === 'in' ? '출석체크가 안 됐어요' : '퇴실체크가 안 됐어요') + '</h4><p class="note" style="white-space:pre-line">' + esc(msg) + '</p></div>';
      });
    }
    $('#atIn').onclick = function () { go('in', this); };
    $('#atOut').onclick = function () { go('out', this); };
  }
  function attendDone(out, r) {
    var test = r.test ? ' <span class="badge gray">리허설</span>' : '';
    if (r.kind === 'in') {
      $('#st1').className = 'done'; $('#st2').className = 'on';
      out.innerHTML = '<div class="result" style="margin-top:28px"><i class="xi-check-circle-o"></i><h4>' + esc(r.time) + ' 출석 완료' + test + '</h4>' +
        '<p class="note">' + esc(r.term) + ' · ' + esc(r.date) + ' (' + esc(r.start) + '~' + esc(r.end) + ')' + (r.late > 0 ? '<br>시작 시각보다 ' + r.late + '분 늦게 출석했어요.' : '') + '</p>' +
        (r.zoom ? '<a class="btn navy big" id="zoomGo" href="' + esc(r.zoom) + '" target="_blank" rel="noopener" style="margin-top:12px"><i class="xi-video-camera"></i>강의실(Zoom) 입장</a>' : '<p class="note"><b>강의실 링크가 아직 등록되지 않았어요.</b> 오픈채팅 공지를 확인해 주세요.</p>') +
        '<p class="note" style="margin-top:16px">연수가 끝나면 이 화면에서 <b>퇴실체크</b>를 꼭 눌러 주세요.</p></div>';
      var z = $('#zoomGo'); if (z) z.onclick = function () { $('#st2').className = 'done'; $('#st3').className = 'on'; };
    } else {
      $('#st1').className = 'done'; $('#st2').className = 'done'; $('#st3').className = 'done';
      out.innerHTML = '<div class="result" style="margin-top:28px"><i class="xi-check-circle-o"></i><h4>' + esc(r.time) + ' 퇴실 완료' + test + '</h4><p class="note">오늘도 함께해 주셔서 고마워요. 출석 현황은 <a href="#/status" style="text-decoration:underline">내 현황 조회</a>에서 볼 수 있어요.</p></div>';
    }
    out.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function attSummary(at) {
    if (!at) return '<span class="note">연수가 시작되면 날짜별 출석이 보여요.</span>';
    var j = at.judge === 'Y' ? '<span class="badge ok">이수 기준 충족</span>' : at.judge === 'N' ? '<span class="badge red">이수 기준 미달</span>' : '<span class="badge navy">' + esc(at.judge) + '</span>';
    return '<div style="margin-bottom:6px">' + j + ' <span class="note">인정 ' + at.total + '시간 / 기준 ' + at.need + '시간</span></div>' +
      at.days.map(function (d) {
        return '<div class="note" style="padding:2px 0">' + esc(d.date) + '(' + esc(d.dow) + ') · 입실 ' + esc(d.in || '-') + ' · 퇴실 ' + esc(d.out || '-') + ' · <b>' + esc(d.status) + '</b>' + (d.got ? ' (' + d.got + 'h)' : '') + '</div>';
      }).join('');
  }

  // ───────── 게시판: Q&A · 환불 요청 (내용은 본인만) ─────────
  var REFUND_REASONS = ['개인 사정(일정 충돌 등)', '중복 신청', '건강·가족 사유', '연수 내용이 기대와 다름', '기타'];
  function stateBadge2(st) {
    var cls = /완료/.test(st) ? 'ok' : st === '반려' ? 'red' : st === '접수' ? 'gray' : 'navy';
    return '<span class="badge ' + cls + '">' + esc(st) + '</span>';
  }
  function renderBoard(v, board) {
    var q = location.hash.split('?')[1] || '';
    if (/(^|&)w=1/.test(q)) return boardWrite(v, board);
    var no = (q.match(/(?:^|&)no=([A-Z0-9]+)/) || [])[1];
    if (no) return boardView(v, board, no);
    var page = board === '환불요청' ? 'refund' : 'qna';
    v.innerHTML = '<div class="loading">불러오는 중…</div>';
    api('boardList', { board: board }).then(function (res) {
      var items = res.items || [];
      v.innerHTML = (board === '환불요청' ? refundNotice(true) : '<p class="note" style="margin:0 0 16px">비공개로 쓴 글은 작성자 본인(이름+휴대폰)만 볼 수 있어요. 출결·이수·연수 내용 무엇이든 남겨 주세요.</p>') +
        '<div class="board-top"><span class="note">전체 ' + items.length + '건</span><a class="btn navy" href="#/' + page + '?w=1"><i class="xi-pen-o"></i>' + (board === '환불요청' ? '환불 요청하기' : '글쓰기') + '</a></div>' +
        (items.length ? '<table class="board"><thead><tr><th style="width:90px">번호</th><th>제목</th><th style="width:100px" class="hide-m">작성자</th><th style="width:120px" class="hide-m">작성일</th><th style="width:110px">상태</th></tr></thead><tbody>' +
          items.map(function (x) {
            return '<tr class="click" data-no="' + esc(x.no) + '"><td class="c">' + esc(x.no) + '</td><td>' + (x.pub ? '' : '<i class="xi-lock" style="color:var(--gray-2)"></i> ') + esc(x.title) + '</td><td class="c hide-m">' + esc(x.author) + '</td><td class="c hide-m">' + esc(x.at) + '</td><td class="c">' + stateBadge2(x.state) + '</td></tr>';
          }).join('') + '</tbody></table>' : '<div class="empty">아직 글이 없어요.</div>');
      $$('tr.click', v).forEach(function (tr) { tr.onclick = function () { location.hash = '#/' + page + '?no=' + tr.dataset.no; }; });
    }).catch(showLoadError);
  }
  function refundNotice(short) {
    var r = C.refund || { wait: '영업일 기준 2~3주', rule: '' };
    return '<div class="refund-note"><b><i class="xi-time-o"></i> 환불은 실시간으로 처리되지 않아요</b>' +
      '<ol class="refund-flow"><li>접수</li><li>운영팀 확인</li><li>교육연수원 전달</li><li>연수원 환불 처리</li></ol>' +
      '<p>연수원 처리 일정에 따라 <b>' + esc(r.wait) + '</b> 정도 걸릴 수 있어요. 접수되면 확인 메일을, <b>최종 환불이 완료되면 이메일로</b> 알려 드려요. 진행 단계는 이 게시판과 내 현황 조회에서 언제든 확인할 수 있어요.' +
      (short ? '' : ' 같은 내용으로 메일이나 전화를 다시 주시지 않아도 순서대로 처리돼요.') + '</p>' +
      (r.rule ? '<p class="note" style="margin:6px 0 0">' + esc(r.rule) + '</p>' : '') + '</div>';
  }
  function boardWrite(v, board) {
    var refund = board === '환불요청', page = refund ? 'refund' : 'qna';
    var me = loadMe() || {};
    v.innerHTML = '<div class="narrow">' + (refund ? refundNotice(false) : '') + '<form class="form" id="bForm" novalidate>' +
      field('성명', true, '<input type="text" name="name" autocomplete="name" value="' + esc(me.name || '') + '" placeholder="연수 신청할 때 쓴 이름">', 'name') +
      field('휴대폰', true, '<input type="tel" name="phone" inputmode="numeric" autocomplete="tel" value="' + esc(me.phone || '') + '" placeholder="010-0000-0000">', 'phone', '답변 확인과 본인 확인에 써요. 목록에는 이름 가운데가 가려져 보여요.') +
      field('이메일', refund, '<input type="email" name="email" autocomplete="email" value="' + esc(me.email || '') + '" placeholder="' + (refund ? '환불 완료 안내를 받을 이메일' : '답변 알림 (선택)') + '">', 'email', refund ? '최종 환불이 완료되면 이 주소로 알려 드려요.' : '') +
      (refund
        ? field('환불 사유', true, '<select name="reason"><option value="">선택</option>' + REFUND_REASONS.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>', 'reason') +
          field('자세한 사유', true, '<textarea name="content" placeholder="예: 학교 업무 일정과 겹쳐 참여가 어려워 환불을 요청드립니다."></textarea>', 'content', '10자 이상. 사유를 알려 주셔야 연수원에 전달할 수 있어요. 계좌번호는 쓰지 마세요.')
        : field('제목', true, '<input type="text" name="title" maxlength="80">', 'title') +
          field('내용', true, '<textarea name="content" placeholder="궁금한 점을 적어 주세요. 주민번호·계좌번호 같은 정보는 쓰지 마세요."></textarea>', 'content') +
          '<div class="field" data-f="pub"><div class="lbl">공개 여부</div><div><label class="remember" style="margin:0"><input type="checkbox" name="pub"> 다른 선생님들도 볼 수 있게 공개 (이름·번호는 보이지 않아요)</label></div></div>') +
      '</form>' + agreeBox() +
      (refund ? '<label class="remember strong"><input type="checkbox" id="waitOk"> 실시간 환불이 아니며, 처리까지 기다려야 할 수 있다는 점을 확인했어요.</label>' : '') +
      '<div class="btns"><a class="btn line" href="#/' + page + '">목록</a><button class="btn navy" id="bSubmit"><i class="xi-check"></i>' + (refund ? '환불 요청 접수' : '등록하기') + '</button></div></div>';
    var f = $('#bForm');
    autoPhone(f.phone);
    $('#bSubmit').onclick = function () {
      clearErrs(f);
      var d = { board: board, name: f.name.value.replace(/\s/g, ''), phone: normPhone(f.phone.value), content: f.content.value.trim(), email: f.email.value.trim() };
      var bad = false;
      if (d.name.length < 2) bad = setErr(f, 'name', '성명을 입력해 주세요.') || true;
      if (!d.phone) bad = setErr(f, 'phone', '010-0000-0000 형식으로 입력해 주세요.') || true;
      if ((refund || d.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) bad = setErr(f, 'email', '이메일을 정확히 입력해 주세요.') || true;
      if (refund) {
        d.reason = f.reason.value; d.agree = $('#waitOk').checked;
        if (!d.reason) bad = setErr(f, 'reason', '환불 사유를 골라 주세요.') || true;
        if (d.content.length < 10) bad = setErr(f, 'content', '사유를 10자 이상 적어 주세요.') || true;
      } else {
        d.title = f.title.value.trim(); d.public = f.pub.checked;
        if (!d.title) bad = setErr(f, 'title', '제목을 입력해 주세요.') || true;
        if (d.content.length < 5) bad = setErr(f, 'content', '내용을 5자 이상 적어 주세요.') || true;
      }
      if (!$('#agree').checked) { alertBox('개인정보 수집·이용에 동의해 주세요.'); bad = true; }
      else if (refund && !d.agree) { alertBox('처리 기간 안내를 확인했다고 체크해 주세요.'); bad = true; }
      if (bad) return focusErr(f);
      submit(this, 'boardWrite', d, function (res) {
        v.innerHTML = '<div class="narrow"><div class="result"><i class="xi-check-circle-o"></i><h4>' + (refund ? '환불 요청이 접수됐어요' : '글이 등록됐어요') + '</h4>' +
          '<p>글번호 <b style="color:var(--navy);font-size:20px">' + esc(res.no) + '</b></p>' +
          '<p class="note">' + (refund ? '운영팀 확인 → 연수원 전달 → 환불 처리 순서로 진행돼요. <b>' + esc((C.refund || {}).wait || '') + '</b> 정도 걸릴 수 있고, 최종 환불이 완료되면 이메일로 알려 드릴게요. 접수 확인 메일도 곧 보내 드려요.' : '답변이 달리면 ' + (d.email ? '이메일로 알려 드리고, ' : '') + '이 게시판에서 이름과 휴대폰 번호로 확인할 수 있어요.') +
          (res.matched ? '' : '<br><b style="color:var(--danger)">신청자 명단에서 이름·번호를 바로 찾지 못했어요. 운영팀이 직접 확인할게요.</b>') + '</p></div>' +
          '<div class="btns"><a class="btn line" href="#/' + page + '">목록</a><a class="btn" href="#/status">내 현황 조회</a></div></div>';
      });
    };
  }
  function boardView(v, board, no) {
    var page = board === '환불요청' ? 'refund' : 'qna';
    var me = loadMe() || {};
    function show(res) {
      v.innerHTML = '<div class="view"><p class="vTit">' + (res.pub ? '' : '<i class="xi-lock"></i> ') + esc(res.board === '환불요청' ? '환불 요청' : res.title) + ' ' + stateBadge2(res.state) + '</p>' +
        '<div class="meta"><span><i class="xi-user-o"></i> ' + esc(res.author) + '</span><span><i class="xi-calendar"></i> ' + esc(res.at) + '</span><span>' + esc(res.no) + '</span></div>' +
        '<div class="body">' + (res.reason ? '<p><b>환불 사유 :</b> ' + esc(res.reason) + '</p>' : '') + linkify(res.content) + '</div></div>' +
        (res.answer ? '<div class="answer"><b><i class="xi-forum"></i> 운영팀 답변</b> <span class="note">' + esc(res.answeredAt) + '</span><div>' + linkify(res.answer) + '</div></div>' : '<div class="answer wait"><span class="note">' + (res.board === '환불요청' ? '현재 단계: <b>' + esc(res.state) + '</b>. 단계가 바뀌면 문자로 알려 드려요.' : '아직 답변 전이에요. 조금만 기다려 주세요.') + '</span></div>') +
        '<div class="btns"><a class="btn" href="#/' + page + '">목록</a></div>';
    }
    function ask(msg) {
      v.innerHTML = '<div class="narrow"><div class="box" style="margin-bottom:20px"><i class="xi-lock"></i> <b>' + esc(no) + '</b> · ' + esc(msg) + '</div><form class="form" id="vForm" novalidate>' +
        field('성명', true, '<input type="text" name="name" value="' + esc(me.name || '') + '">', 'name') +
        field('휴대폰', true, '<input type="tel" name="phone" inputmode="numeric" value="' + esc(me.phone || '') + '" placeholder="010-0000-0000">', 'phone') +
        '</form><div class="btns"><a class="btn line" href="#/' + page + '">목록</a><button class="btn navy" id="vGo">확인</button></div></div>';
      var f = $('#vForm'); autoPhone(f.phone);
      $('#vGo').onclick = function () {
        var d = { no: no, name: f.name.value.replace(/\s/g, ''), phone: normPhone(f.phone.value) };
        submit(this, 'boardView', d, show, function (m) { ask(m); });
      };
    }
    v.innerHTML = '<div class="loading">불러오는 중…</div>';
    api('boardView', { no: no, name: me.name || '', phone: me.phone || '' }).then(function (res) {
      if (res.ok) show(res); else ask(res.error || '본인 글만 볼 수 있어요.');
    }).catch(showLoadError);
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
      '<div class="status-row"><div>출석</div><div>' + attSummary(r.attendance) + '</div></div>' +
      '<div class="status-row"><div>게시판 글</div><div>' + ((r.posts || []).length ? r.posts.map(function (q) {
        return '<div style="padding:6px 0">' + stateBadge2(q.state) + ' ' + esc(q.board === '환불요청' ? '환불 요청' : q.title) + ' <span class="note">(' + esc(q.no) + ', ' + esc(q.at) + ')</span></div>';
      }).join('') : '<span class="note">남긴 글이 없어요.</span>') + '</div></div>' +
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

  // ───────── 연수자료: 수강생 확인 → 차시별 자료 덱 ─────────
  function hashParam(k) { var q = (location.hash.split('?')[1] || '').split('&'); for (var i = 0; i < q.length; i++) { var p = q[i].split('='); if (p[0] === k) return decodeURIComponent(p[1] || ''); } return ''; }
  function embedUrl(u) {
    var m;
    if ((m = u.match(/docs\.google\.com\/presentation\/d\/([\w-]+)/))) return 'https://docs.google.com/presentation/d/' + m[1] + '/embed?start=false&loop=false';
    if ((m = u.match(/docs\.google\.com\/(document|spreadsheets)\/d\/([\w-]+)/))) return 'https://docs.google.com/' + m[1] + '/d/' + m[2] + '/preview';
    if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/)) || (m = u.match(/drive\.google\.com\/open\?id=([\w-]+)/))) return 'https://drive.google.com/file/d/' + m[1] + '/preview';
    if ((m = u.match(/canva\.com\/design\/([\w-]+)\/([\w-]+)/))) return 'https://www.canva.com/design/' + m[1] + '/' + m[2] + '/view?embed';
    if ((m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/))) return 'https://www.youtube.com/embed/' + m[1];
    if ((m = u.match(/gamma\.app\/(?:docs|public)\/([\w-]+)/))) return 'https://gamma.app/embed/' + m[1];
    if (/\.pdf(\?|$)/i.test(u) || /github\.io|dumokquoka\.com/.test(u)) return u;
    return '';
  }
  var KIND_ICON = { '슬라이드': 'xi-presentation', '문서': 'xi-document', '영상': 'xi-youtube-play', 'PDF·파일': 'xi-file-text-o', '링크': 'xi-link' };
  function renderMaterials(v) {
    if (hashParam('upload')) return renderUpload(v);
    var me = loadMe() || {};
    v.innerHTML = '<div class="narrow"><p class="lead-note">연수자료는 <b>수강생만</b> 볼 수 있어요. 출석체크와 같은 이름·휴대폰으로 확인해요.</p>' +
      '<form class="form" id="mtForm" novalidate>' +
      field('성명', true, '<input type="text" name="name" autocomplete="name" placeholder="연수 신청할 때 쓴 이름" value="' + esc(me.name || '') + '">', 'name') +
      field('휴대폰', true, '<input type="tel" name="phone" inputmode="numeric" autocomplete="tel" placeholder="010-0000-0000" value="' + esc(me.phone || '') + '">', 'phone') +
      '<label class="remember"><input type="checkbox" id="mtRemember"' + (me.name ? ' checked' : '') + '> 이 기기에 기억하기</label>' +
      '<div class="actions"><button type="submit" class="btn navy big"><i class="xi-lock-open"></i>자료 열기</button></div></form>' +
      '<p class="note" style="margin-top:20px">강사님이신가요? <a href="#/materials?upload=1" style="text-decoration:underline">강의 자료 올리기</a></p></div><div id="mtOut"></div>';
    var f = $('#mtForm'); autoPhone(f.phone);
    function open(d, btn) {
      var done = function (res) { saveMe($('#mtRemember') && $('#mtRemember').checked ? { name: d.name, phone: d.phone } : loadMe()); drawDecks(res); };
      if (btn) submit(btn, 'materials', d, done, function (msg) { $('#mtOut').innerHTML = '<div class="result fail"><i class="xi-error-o"></i><h4>자료를 열지 못했어요</h4><p class="note">' + esc(msg) + '</p></div>'; });
      else api('materials', d).then(function (res) { if (res.ok) done(res); });
    }
    f.onsubmit = function (e) {
      e.preventDefault(); clearErrs(f);
      var d = { name: f.name.value.replace(/\s/g, ''), phone: normPhone(f.phone.value) }, bad = false;
      if (d.name.length < 2) bad = setErr(f, 'name', '성명을 입력해 주세요.') || true;
      if (!d.phone) bad = setErr(f, 'phone', '010-0000-0000 형식으로 입력해 주세요.') || true;
      if (bad) return focusErr(f);
      open(d, $('button[type=submit]', f));
    };
    if (me.name && me.phone) open({ name: me.name, phone: me.phone });
  }
  function drawDecks(res) {
    var v = $('#view'), items = res.items || [];
    var groups = [], by = {};
    items.forEach(function (x) { var g = x.session || '공통 자료'; if (!by[g]) { by[g] = []; groups.push(g); } by[g].push(x); });
    var sched = (C.schedule || []).filter(function (s) { return s.term === res.term; });
    var when = function (g) { var s = sched.filter(function (x) { return g.indexOf(x.title) >= 0 || x.title.indexOf(g) >= 0; })[0]; return s ? s.date.slice(5).replace('-', '.') + ' (' + s.dow + ') ' + s.start + '~' + s.end : ''; };
    v.innerHTML = '<div class="mt-head"><div><b>' + esc(res.term) + '</b> 수강생 확인됨 · 자료 ' + items.length + '개</div><button class="btn line sm" id="mtOff">다른 사람으로 보기</button></div>' +
      (items.length ? groups.map(function (g) {
        return '<section class="mt-group"><h3>' + esc(g) + (when(g) ? '<small>' + esc(when(g)) + '</small>' : '') + '</h3><div class="deck-grid">' + by[g].map(function (x, i) {
          var idx = items.indexOf(x);
          return '<button class="deck" data-i="' + idx + '"><span class="deck-cover k' + (idx % 4) + '"><i class="' + (KIND_ICON[x.kind] || 'xi-link') + '"></i><em>' + esc(x.kind || '자료') + '</em></span><span class="deck-body"><b>' + esc(x.title) + '</b><small>' + esc(x.who) + '</small>' + (x.desc ? '<span>' + esc(x.desc) + '</span>' : '') + '</span></button>';
        }).join('') + '</div></section>';
      }).join('') : '<div class="result"><i class="xi-folder-open"></i><h4>아직 공개된 자료가 없어요</h4><p class="note">강사님 자료가 올라오면 이곳에 차시별로 보여요.</p></div>');
    $('#mtOff').onclick = function () { saveMe(null); renderMaterials(v); };
    $$('.deck', v).forEach(function (b) { b.onclick = function () { viewer(items[+b.dataset.i]); }; });
  }
  function viewer(x) {
    var src = embedUrl(x.link);
    var el = document.createElement('div'); el.className = 'viewer';
    el.innerHTML = '<div class="viewer-bar"><b>' + esc(x.title) + '</b><span>' + esc(x.who) + '</span><a class="btn line sm" href="' + esc(x.link) + '" target="_blank" rel="noopener"><i class="xi-external-link"></i>새 창</a><button class="btn navy sm" id="vClose">닫기</button></div>' +
      (src ? '<div class="viewer-frame"><iframe src="' + esc(src) + '" allowfullscreen allow="fullscreen; autoplay" loading="lazy"></iframe></div>' : '<div class="viewer-frame empty"><p>이 자료는 사이트 안에서 미리 보기가 안 돼요.</p><a class="btn navy big" href="' + esc(x.link) + '" target="_blank" rel="noopener">새 창으로 열기</a></div>');
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    var close = function () { el.remove(); document.body.style.overflow = ''; document.removeEventListener('keydown', esc1); };
    var esc1 = function (e) { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', esc1);
    $('#vClose', el).onclick = close;
  }
  function renderUpload(v) {
    var titles = []; (C.schedule || []).forEach(function (s) { if (titles.indexOf(s.title) < 0) titles.push(s.title); });
    v.innerHTML = '<div class="narrow"><p class="lead-note">강사님 전용이에요. 자료 <b>공유 링크</b>를 올려 주시면 운영팀 확인 후 <b>수강생에게만</b> 공개돼요.</p>' +
      '<form class="form" id="upForm" novalidate>' +
      field('강사용 코드', true, '<input type="text" name="code" placeholder="운영팀이 보내 드린 코드">', 'code') +
      field('강사명', true, '<input type="text" name="who" placeholder="예: 홍길동">', 'who') +
      field('차시', true, '<select name="session">' + titles.map(function (t, i) { return '<option value="' + esc(t) + '" data-o="' + (i + 1) + '">' + esc(t) + '</option>'; }).join('') + '<option value="공통 자료" data-o="99">공통 자료</option></select>', 'session') +
      field('자료 제목', true, '<input type="text" name="title" placeholder="예: 연구 주제 선정 실습 슬라이드">', 'title') +
      field('공유 링크', true, '<input type="url" name="link" placeholder="https://docs.google.com/presentation/…">', 'link', '구글 슬라이드·드라이브·Canva·유튜브 링크는 사이트 안에서 바로 열려요. 공유는 \'링크가 있는 모든 사용자(뷰어)\'로 해 주세요.') +
      field('설명 (선택)', false, '<input type="text" name="desc" placeholder="한 줄 소개">', 'desc') +
      '<div class="actions"><button type="submit" class="btn navy big">자료 올리기</button></div></form><div id="upOut"></div></div>';
    var f = $('#upForm');
    f.onsubmit = function (e) {
      e.preventDefault(); clearErrs(f);
      var o = f.session.options[f.session.selectedIndex];
      var d = { code: f.code.value.trim(), who: f.who.value.trim(), session: f.session.value, order: o ? o.dataset.o : 99, title: f.title.value.trim(), link: f.link.value.trim(), desc: f.desc.value.trim() }, bad = false;
      ['code', 'who', 'title'].forEach(function (k) { if (!d[k]) bad = setErr(f, k, '입력해 주세요.') || true; });
      if (!/^https:\/\/\S+$/.test(d.link)) bad = setErr(f, 'link', 'https:// 로 시작하는 링크를 넣어 주세요.') || true;
      if (bad) return focusErr(f);
      submit($('button[type=submit]', f), 'materialUpload', d, function () {
        $('#upOut').innerHTML = '<div class="result"><i class="xi-check-circle-o"></i><h4>올렸어요. 고맙습니다!</h4><p class="note">운영팀이 확인하면 수강생 연수자료에 공개돼요. 자료를 더 올리려면 제목과 링크만 바꿔 다시 눌러 주세요.</p></div>';
        f.title.value = ''; f.link.value = ''; f.desc.value = '';
      });
    };
  }

  // ───────── 쿼카 챗봇: FAQ 검색형 (API 키·비용 없음) ─────────
  var BOT_ROUTES = [[/셀프 신청|수강취소|현금영수증 수정/, '#/request', '셀프 신청'], [/환불 요청/, '#/refund', '환불 요청'], [/Q&A/, '#/qna', 'Q&A 게시판'], [/내 현황/, '#/status', '내 현황 조회'], [/출석체크/, '#/attend', '출석체크'], [/연수자료/, '#/materials', '연수자료'], [/이수정보/, '#/info', '이수정보 입력'], [/일정·시간표/, '#/schedule', '일정·시간표'], [/접속 안내/, '#/access', '접속 안내']];
  var BOT_CHIPS = ['출석은 어떻게 해요?', '환불은 언제 돼요?', '기수 바꿀 수 있어요?', '이수 기준이 뭐예요?', '납입증명서', '강의 자료'];
  var botOpen = false;
  function botNorm(s) { return String(s || '').toLowerCase().replace(/[^0-9a-z가-힣]/g, ''); }
  var BOT_SB = '어디 디서 어떻 떻게 나요 하나 있나 싶어 해요 돼요 되나 하면 는데 에서 으로 할수 수있 언제'.split(' ');
  var BOT_STOP = '요나있수어해게는은이가을를에도할하좀돼되고면데서와과의로까지어떻게뭐예언제디서받보싶';
  function botGrams(s) { var n = botNorm(s), g = {}; for (var i = 0; i < n.length - 1; i++) { var k = n.substr(i, 2); if (BOT_SB.indexOf(k) < 0) g[k] = 1; } return g; }
  function botSylls(s) { var g = {}; botNorm(s).split('').forEach(function (c) { if (BOT_STOP.indexOf(c) < 0) g[c] = 1; }); return g; }
  function botSearch(q) {
    var qg = Object.keys(botGrams(q)), qs = Object.keys(botSylls(q)), qn = botNorm(q);
    if (!qg.length && !qs.length) return [];
    return (C.faq || []).map(function (f) {
      var t = f.q + ' ' + (f.kw || '') + ' ' + f.cat, tg = botGrams(t), ts = botSylls(t), ag = botGrams(f.a), h = 0, ah = 0, sh = 0;
      qg.forEach(function (k) { if (tg[k]) h++; else if (ag[k]) ah++; });
      qs.forEach(function (c) { if (ts[c]) sh++; });
      var kwb = String(f.kw || '').split(/\s+/).filter(function (k) { return k.length > 1 && qn.indexOf(botNorm(k)) >= 0; }).length;
      return { f: f, s: (qg.length ? (h + 0.25 * ah) / qg.length : 0) * 0.6 + (qs.length ? sh / qs.length : 0) * 0.4 + 0.3 * kwb };
    }).filter(function (x) { return x.s >= 0.5; }).sort(function (a, b) { return b.s - a.s; });
  }
  function botInit() {
    if ($('#qbotBtn')) return;
    var btn = document.createElement('button'); btn.id = 'qbotBtn'; btn.className = 'qbot-btn'; btn.setAttribute('aria-label', '쿼카에게 물어보기');
    btn.innerHTML = '<span class="qbot-face">' + (window.QK ? window.QK('cheer') : '') + '</span><span class="qbot-label">쿼카에게 물어보기</span>';
    var panel = document.createElement('section'); panel.id = 'qbot'; panel.className = 'qbot'; panel.hidden = true;
    panel.innerHTML = '<header><span class="qbot-face sm">' + (window.QK ? window.QK('people') : '') + '</span><div><b>쿼카 도우미</b><small>자주 묻는 질문에 바로 답해요</small></div><button id="qbotX" aria-label="닫기">×</button></header>' +
      '<div class="qbot-log" id="qbotLog"></div><div class="qbot-chips" id="qbotChips"></div>' +
      '<form id="qbotForm"><input id="qbotIn" autocomplete="off" placeholder="궁금한 걸 적어 주세요" maxlength="120"><button aria-label="보내기"><i class="xi-arrow-up"></i></button></form>';
    document.body.appendChild(btn); document.body.appendChild(panel);
    btn.onclick = function () { botOpen = !botOpen; panel.hidden = !botOpen; btn.classList.toggle('on', botOpen); if (botOpen) { if (!$('#qbotLog').children.length) botHello(); $('#qbotIn').focus(); } };
    $('#qbotX').onclick = function () { botOpen = false; panel.hidden = true; btn.classList.remove('on'); };
    $('#qbotForm').onsubmit = function (e) { e.preventDefault(); var q = $('#qbotIn').value.trim(); if (!q) return; $('#qbotIn').value = ''; botAsk(q); };
  }
  function botSay(html, who) {
    var log = $('#qbotLog'), d = document.createElement('div');
    d.className = 'qbot-msg ' + (who || 'bot'); d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight;
  }
  function botChips(list) {
    $('#qbotChips').innerHTML = list.map(function (c) { return '<button>' + esc(c) + '</button>'; }).join('');
    $$('#qbotChips button').forEach(function (b) { b.onclick = function () { botAsk(b.textContent); }; });
  }
  function botHello() {
    botSay('안녕하세요, 쿼카예요 : )<br>출석, 환불, 이수, 자료처럼 자주 묻는 것은 바로 답해 드려요. 개인 기록 확인이 필요한 일은 게시판으로 안내할게요.');
    botChips(BOT_CHIPS);
  }
  function botAsk(q) {
    botSay(esc(q), 'me');
    loadContent().then(function () {
      var r = botSearch(q);
      var personal = /(제\s|저는|저의|제가|내\s|확인\s?(해|좀)|누락|오류|틀렸|안\s?(돼|되|나와)|처리\s?해)/.test(q);
      if (!r.length) {
        botSay('음… 이건 제가 정확히 모르는 질문이에요. 잘못 안내하면 안 되니까 <b>Q&A 게시판</b>에 남겨 주세요. 운영팀이 직접 답해 드려요.' +
          '<div class="qbot-acts"><a href="#/qna?w=1">Q&A 글쓰기</a><a href="#/refund?w=1">환불 요청</a></div>');
        botChips(BOT_CHIPS.slice(0, 4)); return;
      }
      var top = r[0].f, acts = [];
      BOT_ROUTES.forEach(function (x) { if (acts.length < 2 && x[0].test(top.a)) acts.push('<a href="' + x[1] + '">' + esc(x[2]) + '</a>'); });
      if (personal && acts.join('').indexOf('#/qna') < 0) acts.push('<a href="#/qna?w=1">내 경우 문의하기</a>');
      botSay('<b>' + esc(top.q) + '</b><br>' + linkify(top.a) + (acts.length ? '<div class="qbot-acts">' + acts.join('') + '</div>' : ''));
      botChips(r.slice(1, 4).map(function (x) { return x.f.q; }).concat(r.length < 2 ? BOT_CHIPS.slice(0, 3) : []));
    });
  }

  // ───────── 미리보기(예시 데이터) ─────────
  function demoApi(action, data) {
    var wait = function (x) { return new Promise(function (r) { setTimeout(function () { r(x); }, 350); }); };
    if (action === 'content') {
      var sch = [];
      var CUR = [[0, '13:00', '15:00', '연구하는 교사의 길', '박성춘 교수님'], [0, '15:00', '18:00', '디지털교육 연구대회의 실제', '이대형'],
        [1, '13:00', '15:00', '수업혁신 사례 연구 (초등)', '미정'], [1, '15:00', '17:00', '수업혁신 사례 연구 (중등)', '한세웅'], [1, '17:00', '18:00', '연구 주제 선정 (실습)', '김햇살'],
        [2, '13:00', '15:00', '인성교육 실천사례 연구', '방정은'], [2, '15:00', '17:00', '영상·방송 연구대회의 실제', '미정'], [2, '17:00', '18:00', '연구하는 교사되기 로드맵 (종합 질의응답)', '박성춘 교수님']];
      [['1기', '2027-01-11'], ['2기', '2027-02-01']].forEach(function (t) {
        CUR.forEach(function (c) {
          var d = new Date(t[1] + 'T00:00:00'); d.setDate(d.getDate() + c[0]);
          var ds = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
          sch.push({ term: t[0], date: ds, dow: DOW[d.getDay()], start: c[1], end: c[2], title: c[3], who: c[4] });
        });
      });
      return wait({
        ok: true,
        site: { title: '연구하는 교사되기 2027', org: '서울대학교 사범대학 교육연수원', operator: '연구하는 교사되기 운영팀', email: 'snu27@dumokquoka.com', criteria: '총 15시간 중 12시간(80%) 이상 출석', fee: 0 },
        terms: ['1기', '2기'], links: { '1기': { zoom: '', kakao: '' }, '2기': { zoom: '', kakao: '' } }, padlet: '',
        deadlines: { request: '2027-01-25', info: '2027-02-10' }, certificate: true, sido: SIDO,
        refund: { wait: '영업일 기준 2~3주', rule: '환불 가능 여부와 금액은 교육연수원 환불 규정을 따릅니다.' }, attend: { before: 30, outBefore: 20, need: 12 },
        notices: [
          { date: '2027-01-05', title: '[필독] 이수정보 입력 안내 (마감 2/10)', body: '이수증 발급과 나이스 등재를 위해 이수정보를 꼭 입력해 주세요.\n생년월일은 8자리, 시도교육청은 목록에서 골라 주세요.', pinned: true },
          { date: '2027-01-04', title: '[필독] 2027년에는 기수 변경을 받지 않습니다', body: '신청한 기수 그대로 참여해 주세요. 참여가 어려우면 기수 변경 대신 수강 취소로 접수됩니다. 신청할 때 기수를 신중히 골라 주세요.', pinned: true },
          { date: '2027-01-03', title: '취소·현금영수증은 셀프 신청으로 접수해 주세요', body: '메일 대신 셀프 신청 메뉴를 이용하면 바로 접수되고, 처리 결과도 내 현황에서 확인할 수 있어요.', pinned: true },
          { date: '2026-12-20', title: '2027 연구하는 교사되기 일정 안내', body: '1기 1/11~1/13, 2기 2/1~2/3, 매일 13:00~18:00 (예시 일정입니다)', pinned: false }
        ],
        faq: [
          { cat: '신청·변경', q: '기수를 바꾸고 싶어요.', a: '2027년에는 기수 변경을 받지 않아요. 신청한 기수 그대로 참여해 주세요. 참여가 어려우면 셀프 신청 > 수강취소로 접수해 주세요. 신청할 때 기수를 신중히 골라 주세요.' },
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
    if (action === 'attend') {
      var t = new Date(), hm = ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2);
      return wait(data.kind === 'in' ? { ok: true, kind: 'in', time: hm, term: '1기', date: t.toISOString().slice(0, 10), start: '09:00', end: '15:00', zoom: 'https://zoom.us/', late: 0, test: true } : { ok: true, kind: 'out', time: hm, test: true });
    }
    if (action === 'materials') {
      if (!data.name || !data.phone) return wait({ ok: false, error: '성명과 휴대폰을 입력해 주세요.' });
      return wait({ ok: true, term: '1기', items: [
        { order: 1, session: '연구하는 교사의 길', who: '박성춘 교수님', title: '연구하는 교사의 길 (강의 슬라이드)', kind: '슬라이드', link: 'https://docs.google.com/presentation/d/EXAMPLE/edit', desc: '1일차 여는 강의' },
        { order: 2, session: '디지털교육 연구대회의 실제', who: '이대형', title: '디지털교육 연구대회 보고서 구조', kind: 'PDF·파일', link: 'https://example.com/sample.pdf', desc: '' },
        { order: 5, session: '연구 주제 선정 (실습)', who: '김햇살', title: '연구 주제 선정 워크시트', kind: '문서', link: 'https://docs.google.com/document/d/EXAMPLE/edit', desc: '실습 시간에 같이 써요' },
        { order: 5, session: '연구 주제 선정 (실습)', who: '김햇살', title: '실습 안내 영상', kind: '영상', link: 'https://youtu.be/dQw4w9WgXcQ', desc: '' }] });
    }
    if (action === 'materialUpload') return wait(data.code === 'quoka' ? { ok: true } : { ok: false, error: '강사용 코드가 맞지 않아요. (미리보기 코드: quoka)' });
    if (action === 'boardList') {
      return wait({ ok: true, items: data.board === '환불요청'
        ? [{ no: 'F0002', title: '환불 요청', pub: false, author: '김*늘', at: '2027-01-14', state: '연수원 전달' }, { no: 'F0001', title: '환불 요청', pub: false, author: '이*', at: '2027-01-10', state: '환불 완료' }]
        : [{ no: 'Q0003', title: '비공개 문의', pub: false, author: '박*연', at: '2027-01-15', state: '접수' }, { no: 'Q0002', title: 'Zoom이 끊겼는데 출석은 어떻게 되나요?', pub: true, author: '최*우', at: '2027-01-12', state: '답변 완료' }] });
    }
    if (action === 'boardView') {
      if (data.no === 'Q0002') return wait({ ok: true, no: 'Q0002', board: 'Q&A', title: 'Zoom이 끊겼는데 출석은 어떻게 되나요?', content: '중간에 인터넷이 끊겨서 10분 정도 나갔다 들어왔어요.', state: '답변 완료', answer: '출석체크를 다시 누르면 강의실 링크가 다시 나와요. 잠깐 끊긴 건 출석에 영향이 없어요 : )', answeredAt: '2027-01-12 14:10', at: '2027-01-12 09:30', author: '최*우', pub: true });
      if (!data.name || !data.phone) return wait({ ok: false, needAuth: true, error: '본인 글만 볼 수 있어요. 작성할 때 쓴 이름과 휴대폰 번호를 넣어 주세요.' });
      return wait({ ok: true, no: data.no, board: data.no[0] === 'F' ? '환불요청' : 'Q&A', title: data.no[0] === 'F' ? '환불 요청' : '문의', content: '예시 내용이에요.', reason: data.no[0] === 'F' ? '개인 사정(일정 충돌 등)' : '', state: '검토 중', answer: '', at: '2027-01-14 10:00', author: '김*늘', pub: false });
    }
    if (action === 'boardWrite') return wait({ ok: true, no: (data.board === '환불요청' ? 'F' : 'Q') + '0004', matched: true });
    if (action === 'request') return wait({ ok: true, no: 'R0105-' + (1000 + Math.floor(Math.random() * 9000)), matched: true });
    if (action === 'info') return wait({ ok: true, updated: false, matched: true });
    if (action === 'status') {
      return wait({
        ok: true, name: data.name,
        applicant: { term: '1기', state: '신청', paid: true },
        info: { at: '2027-01-08', term: '1기', sido: '경기', school: '예시초등학교', birthMasked: '1985-**-**' },
        posts: [{ no: 'Q0003', board: 'Q&A', title: '출석 문의', at: '2027-01-15', state: '답변 완료' }],
        attendance: { term: '1기', need: 12, total: 10, judge: '진행 중', days: [{ date: '2027-02-01', dow: '월', in: '08:52', out: '15:02', got: 5, status: '정상' }, { date: '2027-02-02', dow: '화', in: '09:24', out: '15:01', got: 4, status: '지각 24분' }, { date: '2027-02-03', dow: '수', in: '', out: '', got: 0, status: '예정' }] },
        requests: [{ no: 'R0104-2381', type: '현금영수증 수정', at: '2027-01-04', state: '완료', memo: '수정한 번호로 재발행했어요.' }],
        certificate: { name: data.name, term: '1기', amount: 120000, paidAt: '2026-12-28', course: '연구하는 교사되기 2027', org: '서울대학교 사범대학 교육연수원', operator: '연구하는 교사되기 운영팀', issuedAt: new Date().toISOString().slice(0, 10) }
      });
    }
    return wait({ ok: false, error: '알 수 없는 요청' });
  }

  // ───────── 시작 ─────────
  if (DEMO) $('#demo').hidden = false;
  var ADMIN = (window.SITE_CONFIG && window.SITE_CONFIG.ADMIN_URL || '').trim();
  if (ADMIN) { var al = $('#adminLink'); al.href = ADMIN; al.hidden = false; }
  $('#menuBtn').onclick = function () { $('#gnb').classList.toggle('open'); };
  window.addEventListener('hashchange', route);
  route();
  botInit();
})();
