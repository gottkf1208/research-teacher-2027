/**
 * 연구하는 교사되기 2027 · 연수운영 백엔드 (Google Apps Script)
 *
 * - 이 파일은 운영용 구글 시트에 붙여서 씁니다. (확장 프로그램 > Apps Script)
 * - 공개 사이트(GitHub Pages)는 아래 doGet / doPost 로만 데이터를 주고받습니다.
 * - PM 기능은 시트 상단 "연수운영" 메뉴로 실행합니다. 웹에는 관리자 화면이 없습니다.
 * - 강사 주민번호·계좌는 이 시트에 넣지 않습니다. (별도 시트로 분리)
 */

// ───────────────────────── 시트 구조 ─────────────────────────
var SHEETS = {
  설정: ['항목', '값', '설명'],
  공지: ['게시일', '제목', '내용', '상단고정(Y)', '공개(Y)'],
  FAQ: ['분류', '질문', '답변', '공개(Y)'],
  연수일정: ['기수', '날짜', '요일', '시작', '종료', '시간(h)', '내용', '강사'],
  신청자: ['기수', '성명', '휴대폰', '이메일', '입금액', '입금일', '상태', '메모'],
  이수정보: ['제출시각', '기수', '성명', '생년월일', '휴대폰', '시도교육청', '학교명', '나이스개인번호', '이메일', '명단확인', '수정횟수'],
  셀프신청: ['접수시각', '접수번호', '유형', '성명', '휴대폰', '현재기수', '희망기수', '현금영수증번호', '내용', '처리상태', '처리메모', '처리일'],
  강사일정: ['날짜', '요일', '시작', '종료', '시간(h)', '기수', '강사명', '소속', '역할', '강의주제', '비고']
};

var DEFAULT_SETTINGS = [
  ['연수명', '연구하는 교사되기 2027', '사이트 제목'],
  ['연수기관', '서울대학교 사범대학 교육연수원', '안내문에 표기'],
  ['운영', '연구하는 교사되기 운영팀', '푸터·확인서 발급자 표기'],
  ['문의메일', 'snu27@dumokquoka.com', '사이트에 노출되는 문의 메일'],
  ['연수비', '0', '숫자만'],
  ['이수기준', '총 15시간 중 12시간(80%) 이상 출석', ''],
  ['기수목록', '1기,2기', '쉼표로 구분'],
  ['셀프신청마감', '', '예: 2027-01-31 (비우면 상시)'],
  ['이수정보마감', '', '예: 2027-02-10 (비우면 상시)'],
  ['줌링크_1기', '', '연수 당일 공개'],
  ['줌링크_2기', '', ''],
  ['오픈카톡_1기', '', ''],
  ['오픈카톡_2기', '', ''],
  ['패들렛_질문', '', ''],
  ['나이스번호형식', '^[A-Za-z0-9]{5,15}$', '정규식. 연수원 양식 확인 후 조정'],
  ['이수생관리부_열순서', '연번,기수,성명,생년월일,시도교육청,학교명,나이스개인번호,휴대폰,이메일', '연수원 표준양식 열 순서와 똑같이 맞추기'],
  ['납입확인서_사용', 'N', 'Y면 사이트에서 셀프 출력 가능']
];

// 시도교육청 17개 (표준 약어)
var SIDO = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];
var SIDO_ALIAS = {
  '서울특별시': '서울', '부산광역시': '부산', '대구광역시': '대구', '인천광역시': '인천', '광주광역시': '광주',
  '대전광역시': '대전', '울산광역시': '울산', '세종특별자치시': '세종', '경기도': '경기', '강원도': '강원',
  '강원특별자치도': '강원', '충청북도': '충북', '충청남도': '충남', '전라북도': '전북', '전북특별자치도': '전북',
  '전라남도': '전남', '경상북도': '경북', '경상남도': '경남', '제주특별자치도': '제주', '제주도': '제주'
};
var DOW = ['일', '월', '화', '수', '목', '금', '토'];

// ───────────────────────── 웹 API ─────────────────────────
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'content';
  try {
    if (action === 'content') return json_(getContent_());
    return json_({ ok: false, error: '알 수 없는 요청입니다.' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (x) { return json_({ ok: false, error: '요청 형식 오류' }); }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    switch (body.action) {
      case 'request': return json_(submitRequest_(body.data || {}));
      case 'info': return json_(submitInfo_(body.data || {}));
      case 'status': return json_(lookupStatus_(body.data || {}));
      default: return json_({ ok: false, error: '알 수 없는 요청입니다.' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// 공개 콘텐츠: 공지·FAQ·일정·안내 (개인정보 없음)
function getContent_() {
  var s = settings_();
  var notices = rows_('공지').filter(function (r) { return yes_(r['공개(Y)'], true); }).map(function (r) {
    return { date: fmtDate_(r['게시일']), title: r['제목'], body: r['내용'], pinned: yes_(r['상단고정(Y)']) };
  }).sort(function (a, b) { return (b.pinned - a.pinned) || (a.date < b.date ? 1 : -1); });
  var faq = rows_('FAQ').filter(function (r) { return yes_(r['공개(Y)'], true) && r['질문']; }).map(function (r) {
    return { cat: r['분류'] || '기타', q: r['질문'], a: r['답변'] };
  });
  var schedule = rows_('연수일정').filter(function (r) { return r['날짜']; }).map(function (r) {
    var d = toDate_(r['날짜']);
    return { term: r['기수'], date: fmtDate_(d), dow: d ? DOW[d.getDay()] : '', start: fmtTime_(r['시작']), end: fmtTime_(r['종료']), hours: r['시간(h)'], title: r['내용'], who: r['강사'] };
  });
  var terms = String(s['기수목록'] || '1기,2기').split(',').map(function (t) { return t.trim(); }).filter(String);
  var links = {};
  terms.forEach(function (t) {
    links[t] = { zoom: s['줌링크_' + t] || '', kakao: s['오픈카톡_' + t] || '' };
  });
  return {
    ok: true,
    site: { title: s['연수명'], org: s['연수기관'], operator: s['운영'], email: s['문의메일'], criteria: s['이수기준'], fee: Number(s['연수비'] || 0) },
    terms: terms, links: links, padlet: s['패들렛_질문'] || '',
    deadlines: { request: fmtDate_(s['셀프신청마감']), info: fmtDate_(s['이수정보마감']) },
    certificate: yes_(s['납입확인서_사용']),
    sido: SIDO, notices: notices, faq: faq, schedule: schedule
  };
}

// 셀프신청: 기수변경 / 취소 / 현금영수증 수정 / 기타
function submitRequest_(d) {
  var s = settings_();
  if (passed_(s['셀프신청마감'])) return { ok: false, error: '셀프 신청 기간이 끝났습니다. 문의메일로 연락해 주세요.' };
  var type = clean_(d.type);
  var name = clean_(d.name);
  var phone = normPhone_(d.phone);
  var errs = [];
  if (['기수변경', '수강취소', '현금영수증 수정', '기타 문의'].indexOf(type) < 0) errs.push('신청 유형을 골라 주세요.');
  if (!name) errs.push('성명을 입력해 주세요.');
  if (!phone) errs.push('휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.');
  if (type === '기수변경' && !clean_(d.toTerm)) errs.push('희망 기수를 골라 주세요.');
  if (type === '현금영수증 수정' && !clean_(d.receipt)) errs.push('현금영수증 번호를 입력해 주세요.');
  if (errs.length) return { ok: false, error: errs.join('\n') };

  var applicant = findApplicant_(name, phone);
  var no = 'R' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'MMdd') + '-' + Math.floor(1000 + Math.random() * 9000);
  sheet_('셀프신청').appendRow([
    new Date(), no, type, name, "'" + phone, applicant ? applicant['기수'] : clean_(d.fromTerm),
    clean_(d.toTerm), clean_(d.receipt) ? "'" + clean_(d.receipt) : '', clean_(d.memo), '접수', applicant ? '' : '신청자 명단에서 찾지 못함', ''
  ]);
  return { ok: true, no: no, matched: !!applicant };
}

// 이수정보 입력 (같은 이름+휴대폰이면 덮어쓰기 = 수정)
function submitInfo_(d) {
  var s = settings_();
  if (passed_(s['이수정보마감'])) return { ok: false, error: '이수정보 입력 기간이 끝났습니다. 문의메일로 연락해 주세요.' };
  var v = validateInfo_(d, s);
  if (v.errors.length) return { ok: false, error: v.errors.join('\n') };
  var x = v.value;
  var applicant = findApplicant_(x.name, x.phone);
  var sh = sheet_('이수정보');
  var data = sh.getDataRange().getValues();
  var row = -1, count = 0;
  for (var i = 1; i < data.length; i++) {
    if (clean_(data[i][2]) === x.name && normPhone_(data[i][4]) === x.phone) { row = i + 1; count = Number(data[i][10] || 0) + 1; break; }
  }
  var values = [new Date(), x.term, x.name, "'" + x.birth, "'" + x.phone, x.sido, x.school, "'" + x.neis, x.email, applicant ? 'O' : '명단없음', count];
  if (row > 0) sh.getRange(row, 1, 1, values.length).setValues([values]);
  else sh.appendRow(values);
  return { ok: true, updated: row > 0, matched: !!applicant };
}

function validateInfo_(d, s) {
  var errors = [];
  var name = clean_(d.name).replace(/\s/g, '');
  var phone = normPhone_(d.phone);
  var birth = normBirth_(d.birth);
  var sido = normSido_(d.sido);
  var school = clean_(d.school);
  var neis = clean_(d.neis).replace(/\s/g, '').toUpperCase();
  var email = clean_(d.email);
  var term = clean_(d.term);
  if (!name || name.length < 2) errors.push('성명을 정확히 입력해 주세요.');
  if (!phone) errors.push('휴대폰 번호 형식이 맞지 않아요. (예: 010-1234-5678)');
  if (!birth) errors.push('생년월일은 8자리로 입력해 주세요. (예: 19850315)');
  if (!sido) errors.push('시도교육청을 목록에서 골라 주세요.');
  if (!school) errors.push('학교명을 입력해 주세요.');
  if (school && !/(학교|유치원|교육청|교육지원청|연구원|센터)$/.test(school)) errors.push('학교명은 "OO초등학교"처럼 정식 명칭으로 입력해 주세요.');
  var re = new RegExp(s['나이스번호형식'] || '^[A-Za-z0-9]{5,15}$');
  if (!re.test(neis)) errors.push('나이스 개인번호 형식을 확인해 주세요.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('이메일 형식을 확인해 주세요.');
  if (!term) errors.push('수강 기수를 골라 주세요.');
  return { errors: errors, value: { name: name, phone: phone, birth: birth, sido: sido, school: school, neis: neis, email: email, term: term } };
}

// 내 현황 조회: 성명 + 휴대폰 전체번호가 일치해야 함
function lookupStatus_(d) {
  var name = clean_(d.name).replace(/\s/g, '');
  var phone = normPhone_(d.phone);
  if (!name || !phone) return { ok: false, error: '성명과 휴대폰 번호를 정확히 입력해 주세요.' };
  var a = findApplicant_(name, phone);
  var info = rows_('이수정보').filter(function (r) { return clean_(r['성명']) === name && normPhone_(r['휴대폰']) === phone; })[0];
  var reqs = rows_('셀프신청').filter(function (r) { return clean_(r['성명']) === name && normPhone_(r['휴대폰']) === phone; }).map(function (r) {
    return { no: r['접수번호'], type: r['유형'], at: fmtDate_(r['접수시각']), state: r['처리상태'] || '접수', memo: r['처리메모'] && r['처리상태'] === '완료' ? r['처리메모'] : '' };
  });
  if (!a && !info && !reqs.length) return { ok: false, error: '일치하는 정보가 없어요. 신청할 때 쓴 이름과 휴대폰 번호인지 확인해 주세요.' };
  var s = settings_();
  var out = {
    ok: true, name: name,
    applicant: a ? { term: a['기수'], state: a['상태'] || '신청', paid: !!a['입금일'] } : null,
    info: info ? { at: fmtDate_(info['제출시각']), term: info['기수'], sido: info['시도교육청'], school: info['학교명'], birthMasked: mask_(String(info['생년월일'])) } : null,
    requests: reqs
  };
  if (a && a['입금일'] && yes_(s['납입확인서_사용']) && a['상태'] !== '취소') {
    out.certificate = { name: name, term: a['기수'], amount: Number(a['입금액'] || s['연수비'] || 0), paidAt: fmtDate_(a['입금일']), course: s['연수명'], org: s['연수기관'], operator: s['운영'], issuedAt: fmtDate_(new Date()) };
  }
  return out;
}

// ───────────────────────── PM 메뉴 ─────────────────────────
function onOpen() {
  SpreadsheetApp.getUi().createMenu('연수운영')
    .addItem('① 오늘 할 일 보기', 'menuToday')
    .addSeparator()
    .addItem('이수정보 미입력자 목록 만들기', 'menuMissing')
    .addItem('이수생관리부(연수원 양식) 만들기', 'menuRoster')
    .addItem('강사 위촉공문 자료 만들기', 'menuInstructorDoc')
    .addSeparator()
    .addItem('요일 다시 계산', 'menuRecalcDow')
    .addItem('처음 설정: 시트 만들기', 'setup')
    .addToUi();
}

// 날짜를 넣으면 요일 자동 (연수일정, 강사일정)
function onEdit(e) {
  var sh = e.range.getSheet();
  var name = sh.getName();
  if (name !== '연수일정' && name !== '강사일정') return;
  var dateCol = name === '연수일정' ? 2 : 1;
  var dowCol = name === '연수일정' ? 3 : 2;
  if (e.range.getColumn() > dateCol || e.range.getLastColumn() < dateCol || e.range.getRow() < 2) return;
  for (var r = e.range.getRow(); r <= e.range.getLastRow(); r++) {
    var d = toDate_(sh.getRange(r, dateCol).getValue());
    sh.getRange(r, dowCol).setValue(d ? DOW[d.getDay()] : '');
  }
}

function setup() {
  var ss = SpreadsheetApp.getActive();
  Object.keys(SHEETS).forEach(function (n) {
    var sh = ss.getSheetByName(n) || ss.insertSheet(n);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SHEETS[n].length).setValues([SHEETS[n]]).setFontWeight('bold').setBackground('#001871').setFontColor('#ffffff');
      sh.setFrozenRows(1);
    }
  });
  var st = ss.getSheetByName('설정');
  if (st.getLastRow() < 2) st.getRange(2, 1, DEFAULT_SETTINGS.length, 3).setValues(DEFAULT_SETTINGS);
  // 입력 규칙
  var sido = SpreadsheetApp.newDataValidation().requireValueInList(SIDO, true).build();
  ss.getSheetByName('이수정보').getRange('F2:F').setDataValidation(sido);
  var state = SpreadsheetApp.newDataValidation().requireValueInList(['접수', '처리중', '완료', '반려'], true).build();
  ss.getSheetByName('셀프신청').getRange('J2:J').setDataValidation(state);
  var astate = SpreadsheetApp.newDataValidation().requireValueInList(['신청', '대기', '취소'], true).build();
  ss.getSheetByName('신청자').getRange('G2:G').setDataValidation(astate);
  ss.getSheetByName('이수정보').getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  ss.getSheetByName('셀프신청').getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  SpreadsheetApp.getUi().alert('시트 준비 완료! "설정" 시트에서 연수명·기수·마감일을 먼저 채워 주세요.');
}

function menuToday() {
  var pending = rows_('셀프신청').filter(function (r) { return ['완료', '반려'].indexOf(r['처리상태']) < 0; });
  var byType = {};
  pending.forEach(function (r) { byType[r['유형']] = (byType[r['유형']] || 0) + 1; });
  var missing = missingList_();
  var info = rows_('이수정보');
  var unmatched = info.filter(function (r) { return r['명단확인'] === '명단없음'; }).length;
  var applicants = rows_('신청자').filter(function (r) { return r['상태'] !== '취소'; }).length;
  var html = '<div style="font-family:sans-serif;font-size:14px;line-height:1.7">' +
    '<h3 style="margin:0 0 8px;color:#001871">오늘 할 일</h3>' +
    '<b>처리 안 된 셀프신청: ' + pending.length + '건</b><br>' +
    Object.keys(byType).map(function (k) { return '· ' + k + ' ' + byType[k] + '건'; }).join('<br>') +
    '<hr><b>이수정보 입력: ' + (applicants - missing.length) + ' / ' + applicants + '명</b><br>' +
    '· 미입력 ' + missing.length + '명 → 메뉴에서 "미입력자 목록 만들기"<br>' +
    '· 명단과 안 맞는 입력 ' + unmatched + '건 (이수정보 시트 J열 "명단없음")' +
    '</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(380).setHeight(300), '연수운영');
}

function missingList_() {
  var info = rows_('이수정보');
  var done = {};
  info.forEach(function (r) { done[clean_(r['성명']) + '|' + normPhone_(r['휴대폰'])] = true; });
  return rows_('신청자').filter(function (r) {
    return r['상태'] !== '취소' && !done[clean_(r['성명']).replace(/\s/g, '') + '|' + normPhone_(r['휴대폰'])];
  });
}

function menuMissing() {
  var list = missingList_();
  var out = [['기수', '성명', '휴대폰', '이메일']].concat(list.map(function (r) { return [r['기수'], r['성명'], "'" + normPhone_(r['휴대폰']), r['이메일']]; }));
  var sh = freshSheet_('미입력자_' + stamp_());
  sh.getRange(1, 1, out.length, 4).setValues(out);
  sh.getRange(1, 6).setValue('문자 발송용 번호(복사해서 붙여넣기)').setFontWeight('bold');
  sh.getRange(2, 6).setValue(list.map(function (r) { return normPhone_(r['휴대폰']); }).join(','));
  SpreadsheetApp.getUi().alert('미입력자 ' + list.length + '명 목록을 새 시트로 만들었어요.');
}

function menuRoster() {
  var ui = SpreadsheetApp.getUi();
  var terms = String(settings_()['기수목록'] || '1기,2기');
  var res = ui.prompt('이수생관리부 만들기', '기수를 입력하세요 (' + terms + ', 전체는 비워 두기)', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var term = res.getResponseText().trim();
  var cols = String(settings_()['이수생관리부_열순서']).split(',').map(function (c) { return c.trim(); });
  var list = rows_('이수정보').filter(function (r) { return !term || r['기수'] === term; })
    .sort(function (a, b) { return String(a['기수']).localeCompare(String(b['기수'])) || String(a['성명']).localeCompare(String(b['성명']), 'ko'); });
  var out = [cols].concat(list.map(function (r, i) {
    return cols.map(function (c) {
      if (c === '연번') return i + 1;
      if (c === '휴대폰') return "'" + normPhone_(r['휴대폰']);
      if (c === '생년월일' || c === '나이스개인번호') return "'" + String(r[c]);
      if (c === '시도교육청') return normSido_(r[c]) || r[c];
      return r[c] !== undefined ? r[c] : '';
    });
  }));
  var sh = freshSheet_('이수생관리부_' + (term || '전체') + '_' + stamp_());
  sh.getRange(1, 1, out.length, cols.length).setValues(out);
  sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
  ui.alert(list.length + '명 이수생관리부를 만들었어요.\n파일 > 다운로드 > Microsoft Excel 로 받아서 연수원 양식에 그대로 붙여 넣으세요.');
}

function menuRecalcDow() {
  [['연수일정', 2, 3], ['강사일정', 1, 2]].forEach(function (c) {
    var sh = sheet_(c[0]);
    var n = sh.getLastRow() - 1;
    if (n < 1) return;
    var dates = sh.getRange(2, c[1], n, 1).getValues();
    sh.getRange(2, c[2], n, 1).setValues(dates.map(function (d) { var x = toDate_(d[0]); return [x ? DOW[x.getDay()] : '']; }));
  });
  SpreadsheetApp.getUi().alert('요일을 다시 계산했어요.');
}

// 위촉공문 자료: 강사별로 날짜(요일)·시간·주제를 한 줄로 정리
function menuInstructorDoc() {
  var list = rows_('강사일정').filter(function (r) { return r['강사명'] && r['날짜']; });
  var by = {};
  list.forEach(function (r) {
    var k = r['강사명'];
    (by[k] = by[k] || { 소속: r['소속'], 역할: r['역할'], items: [], hours: 0 });
    var d = toDate_(r['날짜']);
    by[k].items.push(fmtDate_(d) + '(' + DOW[d.getDay()] + ') ' + fmtTime_(r['시작']) + '~' + fmtTime_(r['종료']) + (r['강의주제'] ? ' ' + r['강의주제'] : ''));
    by[k].hours += Number(r['시간(h)'] || 0);
  });
  var out = [['연번', '성명', '소속', '역할', '강의 일시(요일 자동)', '총 시간(h)']];
  Object.keys(by).forEach(function (k, i) {
    out.push([i + 1, k, by[k].소속, by[k].역할, by[k].items.join('\n'), by[k].hours]);
  });
  var sh = freshSheet_('위촉공문자료_' + stamp_());
  sh.getRange(1, 1, out.length, 6).setValues(out).setWrap(true).setVerticalAlignment('top');
  sh.getRange(1, 1, 1, 6).setFontWeight('bold');
  sh.setColumnWidth(5, 420);
  SpreadsheetApp.getUi().alert('강사 ' + (out.length - 1) + '명 위촉공문 자료를 만들었어요. 주민번호·계좌는 별도 시트에서 붙여 넣어 주세요.');
}

// ───────────────────────── 도우미 ─────────────────────────
function sheet_(n) {
  var sh = SpreadsheetApp.getActive().getSheetByName(n);
  if (!sh) throw new Error('"' + n + '" 시트가 없어요. 메뉴에서 "처음 설정"을 먼저 실행해 주세요.');
  return sh;
}
function rows_(n) {
  var v = sheet_(n).getDataRange().getValues();
  var h = v.shift() || [];
  return v.filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    var o = {}; h.forEach(function (k, i) { o[k] = r[i]; }); return o;
  });
}
function settings_() {
  var o = {};
  rows_('설정').forEach(function (r) { o[String(r['항목']).trim()] = r['값']; });
  return o;
}
function freshSheet_(name) {
  var ss = SpreadsheetApp.getActive();
  var old = ss.getSheetByName(name);
  if (old) ss.deleteSheet(old);
  var sh = ss.insertSheet(name);
  ss.setActiveSheet(sh);
  return sh;
}
function findApplicant_(name, phone) {
  name = clean_(name).replace(/\s/g, '');
  return rows_('신청자').filter(function (r) { return clean_(r['성명']).replace(/\s/g, '') === name && normPhone_(r['휴대폰']) === phone; })[0] || null;
}
function clean_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function yes_(v, dflt) { var s = clean_(v).toUpperCase(); return s === '' ? !!dflt : (s === 'Y' || s === 'O' || s === 'TRUE'); }
function normPhone_(v) {
  var d = clean_(v).replace(/\D/g, '');
  if (d.length === 10 && d.indexOf('10') === 0) d = '0' + d; // 앞자리 0 빠진 경우
  if (!/^01[016789]\d{7,8}$/.test(d)) return '';
  return d.length === 11 ? d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7) : d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
}
function normBirth_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd');
  var d = clean_(v).replace(/\D/g, '');
  if (d.length === 6) d = (Number(d.slice(0, 2)) > 30 ? '19' : '20') + d;
  if (d.length !== 8) return '';
  var y = +d.slice(0, 4), m = +d.slice(4, 6), day = +d.slice(6, 8);
  var dt = new Date(y, m - 1, day);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== day) return '';
  if (y < 1940 || y > 2008) return '';
  return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
}
function normSido_(v) {
  var s = clean_(v).replace(/교육청$/, '').replace(/\s/g, '');
  if (SIDO.indexOf(s) >= 0) return s;
  return SIDO_ALIAS[s] || '';
}
function toDate_(v) {
  if (v instanceof Date) return v;
  var s = clean_(v).replace(/[.\/]/g, '-').replace(/-$/, '');
  if (!s) return null;
  var p = s.split('-').map(Number);
  if (p.length < 3) return null;
  var d = new Date(p[0], p[1] - 1, p[2]);
  return isNaN(d) ? null : d;
}
function fmtDate_(v) { var d = toDate_(v); return d ? Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd') : ''; }
function fmtTime_(v) { if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Seoul', 'HH:mm'); return clean_(v); }
function passed_(v) { var d = toDate_(v); if (!d) return false; d.setHours(23, 59, 59); return new Date() > d; }
function mask_(s) { return s.length >= 4 ? s.slice(0, 4) + '-**-**' : '****'; }
function stamp_() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'MMdd_HHmm'); }
