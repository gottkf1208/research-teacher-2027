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
  // 연수원 신청자 목록 열 그대로 + 운영 열 (메뉴 "연수원 명단 가져오기"가 채워 줌)
  신청자: ['기수', '신청일', 'NEIS 번호', '성명', '생년월일', '전공', '소속학교', '소속청', '연락처', '연수지명번호', '이메일', '입금액', '입금일', '상태', '이수(Y/N)', '메모'],
  붙여넣기: ['← 1행에 연수원 신청자 목록 엑셀의 제목줄까지 통째로 붙여넣고, 메뉴 > 연수원 명단 가져오기'],
  이수정보: ['제출시각', '기수', '성명', '생년월일', '휴대폰', '시도교육청', '학교명', '나이스개인번호', '이메일', '명단확인', '수정횟수'],
  셀프신청: ['접수시각', '접수번호', '유형', '성명', '휴대폰', '현재기수', '희망기수', '현금영수증번호', '내용', '처리상태', '처리메모', '처리일'],
  강사일정: ['날짜', '요일', '시작', '종료', '시간(h)', '기수', '강사명', '소속', '역할', '강의주제', '비고'],
  문자기록: ['보낸시각', '문자종류', '대상', '인원', '내용'],
  // 출석: 연수생이 사이트에서 직접 입실/퇴실 체크. 운영자가 고치면 구분=조정 + 인정시간
  출석: ['기록시각', '기수', '날짜', '구분', '성명', '휴대폰', '인정시간', '비고'],
  // 게시판: Q&A, 환불요청. 내용은 본인(이름+휴대폰)만 열람
  게시판: ['작성시각', '글번호', '게시판', '제목', '내용', '성명', '휴대폰', '기수', '공개', '환불사유', '처리상태', '답변', '답변시각', '운영메모']
};
// 강사 민감정보는 운영 시트와 다른 파일(비공개)에 저장
var INSTRUCTOR_HEADERS = ['성명', '소속', '직위', '전화', '이메일', '생년월일', '주민등록번호', '은행', '계좌번호', '예금주', '비고'];

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
  ['나이스번호형식', '^[A-Z][0-9]{9}$', '영문 1자 + 숫자 9자 (2026 이수생관리부 기준)'],
  ['연수기간_1기', '2027-01-11~2027-01-13', '이수대장 연수시작·종료일자 (초안: 날짜 확정되면 고치고 seedCurriculum2027 다시 실행)'],
  ['연수기간_2기', '2027-02-01~2027-02-03', ''],
  ['담당자', '', '이수정보확인서 담당자 이름'],
  ['이수대장_연수과정명', '연구하는 교사되기', ''],
  ['이수대장_교육유형구분코드', '010', '2026 제출값'],
  ['이수대장_연수구분코드', '02', '직무연수'],
  ['이수대장_연수내용구분코드', '01', '교수학습'],
  ['이수대장_연수시간(분)', '900', '15시간'],
  ['이수대장_직무관련성여부', 'Y', ''],
  ['이수대장_교육형태코드', 'C', '원격교육'],
  ['납입확인서_사용', 'N', 'Y면 사이트에서 셀프 출력 가능'],
  ['관리자메일', '', '운영자 페이지에 들어올 구글 계정 (쉼표로 여러 명, 비우면 시트 주인만)'],
  ['사이트주소', 'https://snu27.dumokquoka.com', '문자에 들어가는 주소'],
  ['이수인정시간', '12', '이 시간 이상 출석하면 이수 (15시간의 80%)'],
  ['입실가능(분)', '30', '연수 시작 몇 분 전부터 출석체크 가능'],
  ['퇴실가능(분)', '20', '연수 종료 몇 분 전부터 퇴실체크 가능 (종료 후 2시간까지)'],
  ['지각허용(분)', '10', '이 시간 안의 지각·조퇴는 감점 없음. 넘으면 1시간 단위로 뺌'],
  ['출석테스트', 'N', 'Y면 연수일이 아니어도 출석체크 가능 (리허설용, 끝나면 N)'],
  ['환불소요', '영업일 기준 2~3주', '환불 요청 화면과 문자에 들어가는 예상 기간'],
  ['환불규정', '환불 가능 여부와 금액은 교육연수원 환불 규정을 따릅니다.', '환불 요청 화면 안내']
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
  var p = (e && e.parameter) || {};
  if (p.page === 'admin') {
    if (!isAdmin_()) {
      return HtmlService.createHtmlOutput('<p style="font-family:sans-serif;padding:40px">운영자만 들어올 수 있어요. 운영자 구글 계정으로 로그인해 주세요.</p>').setTitle('운영자 관리');
    }
    return HtmlService.createHtmlOutputFromFile('Admin').setTitle('운영자 관리 · 연구하는 교사되기 2027')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  var action = p.action || 'content';
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
  try {
    if (body.action === 'attend') return json_(attend_(body.data || {}));
    if (body.action === 'boardList') return json_(boardList_(body.data || {}));
    if (body.action === 'boardView') return json_(boardView_(body.data || {}));
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    switch (body.action) {
      case 'request': return json_(submitRequest_(body.data || {}));
      case 'info': return json_(submitInfo_(body.data || {}));
      case 'status': return json_(lookupStatus_(body.data || {}));
      case 'boardWrite': return json_(boardWrite_(body.data || {}));
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
    sido: SIDO, notices: notices, faq: faq, schedule: schedule,
    refund: { wait: s['환불소요'] || '영업일 기준 2~3주', rule: s['환불규정'] || '' },
    attend: { before: Number(s['입실가능(분)'] || 30), outBefore: Number(s['퇴실가능(분)'] || 20), need: Number(s['이수인정시간'] || 12) }
  };
}

// 셀프신청: 취소 / 현금영수증 수정 / 기타  (2027: 기수변경은 받지 않음)
function submitRequest_(d) {
  var s = settings_();
  if (passed_(s['셀프신청마감'])) return { ok: false, error: '셀프 신청 기간이 끝났습니다. 문의메일로 연락해 주세요.' };
  var type = clean_(d.type);
  var name = clean_(d.name);
  var phone = normPhone_(d.phone);
  var errs = [];
  if (type === '기수변경') return { ok: false, error: '2027년에는 기수 변경을 받지 않아요. 신청한 기수 그대로 참여하시거나, 어려우면 수강취소로 접수해 주세요.' };
  if (['수강취소', '현금영수증 수정', '기타 문의'].indexOf(type) < 0) errs.push('신청 유형을 골라 주세요.');
  if (!name) errs.push('성명을 입력해 주세요.');
  if (!phone) errs.push('휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.');
  if (type === '현금영수증 수정' && !clean_(d.receipt)) errs.push('현금영수증 번호를 입력해 주세요.');
  if (errs.length) return { ok: false, error: errs.join('\n') };

  var applicant = findApplicant_(name, phone);
  var no = 'R' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'MMdd') + '-' + Math.floor(1000 + Math.random() * 9000);
  sheet_('셀프신청').appendRow([
    new Date(), no, type, name, "'" + phone, applicant ? applicant['기수'] : clean_(d.fromTerm),
    '', clean_(d.receipt) ? "'" + clean_(d.receipt) : '', clean_(d.memo), '접수', applicant ? '' : '신청자 명단에서 찾지 못함', ''
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
  if (applicant) x.term = clean_(applicant['기수']);
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
    requests: reqs,
    posts: rows_('게시판').filter(function (r) { return clean_(r['성명']).replace(/\s/g, '') === name && normPhone_(r['휴대폰']) === phone; }).map(function (r) {
      return { no: r['글번호'], board: r['게시판'], title: r['제목'], at: fmtDate_(r['작성시각']), state: r['처리상태'] || '접수', answered: !!clean_(r['답변']) };
    }),
    attendance: a ? (attendanceOf_(name, phone) || null) : null
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
    .addItem('연수원 명단 가져오기 (붙여넣기 시트 → 신청자)', 'menuImport')
    .addItem('이수정보 점검 (빠진 사람 + 문자 번호)', 'menuCheck')
    .addItem('이수생관리부 만들기 (연수원 표준양식 순서)', 'menuRoster')
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
  else {
    var haveKeys = st.getRange(2, 1, st.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]).trim(); });
    var missing = DEFAULT_SETTINGS.filter(function (r) { return haveKeys.indexOf(r[0]) < 0; });
    if (missing.length) st.getRange(st.getLastRow() + 1, 1, missing.length, 3).setValues(missing);
  }
  ss.getSheetByName('출석').getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  ss.getSheetByName('출석').getRange('C:C').setNumberFormat('@');
  ss.getSheetByName('게시판').getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  var nt = ss.getSheetByName('공지');
  if (nt.getLastRow() < 2) nt.appendRow([Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd'), '[필독] 2027년에는 기수 변경을 받지 않습니다', '신청한 기수 그대로 참여해 주세요.\n참여가 어려우면 기수 변경 대신 셀프 신청 > 수강취소로 접수됩니다.\n신청할 때 기수를 신중히 골라 주세요.', 'Y', 'Y']);
  var fq = ss.getSheetByName('FAQ');
  if (fq.getLastRow() < 2) fq.getRange(2, 1, 4, 4).setValues([
    ['신청·변경', '기수를 바꾸고 싶어요.', '2027년에는 기수 변경을 받지 않아요. 신청한 기수 그대로 참여해 주세요. 참여가 어려우면 셀프 신청 > 수강취소로 접수해 주세요.', 'Y'],
    ['환불', '환불은 언제 되나요?', '환불은 실시간으로 처리되지 않아요. 게시판 > 환불 요청에 사유와 함께 남겨 주시면 운영팀 확인 → 교육연수원 전달 → 연수원 환불 처리 순서로 진행되고, 단계가 바뀔 때마다 문자로 알려 드려요.', 'Y'],
    ['출석', '출석은 어떻게 하나요?', '연수 당일 사이트의 출석체크에서 출석 → 강의실(Zoom) 입장 → 끝날 때 퇴실체크까지 눌러 주세요. 출석과 퇴실이 둘 다 있어야 그날 출석이 인정돼요.', 'Y'],
    ['출석', 'Zoom이 끊겼어요.', '출석체크를 다시 누르면 강의실 링크가 다시 나와요. 잠깐 끊긴 것은 출석에 영향이 없어요.', 'Y']
  ]);
  // 입력 규칙
  var sido = SpreadsheetApp.newDataValidation().requireValueInList(SIDO, true).build();
  ss.getSheetByName('이수정보').getRange('F2:F').setDataValidation(sido);
  var state = SpreadsheetApp.newDataValidation().requireValueInList(['접수', '처리중', '완료', '반려'], true).build();
  ss.getSheetByName('셀프신청').getRange('J2:J').setDataValidation(state);
  var astate = SpreadsheetApp.newDataValidation().requireValueInList(['신청', '대기', '취소'], true).build();
  ss.getSheetByName('신청자').getRange('N2:N').setDataValidation(astate);
  ss.getSheetByName('신청자').getRange('O2:O').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Y', 'N'], true).build());
  ss.getSheetByName('이수정보').getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  ss.getSheetByName('셀프신청').getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  try { SpreadsheetApp.getUi().alert('시트 준비 완료! "설정" 시트에서 연수명·기수·마감일을 먼저 채워 주세요.'); } catch (e) { Logger.log('시트 준비 완료'); }
}

function menuToday() {
  var pending = rows_('셀프신청').filter(function (r) { return ['완료', '반려'].indexOf(r['처리상태']) < 0; });
  var byType = {};
  pending.forEach(function (r) { byType[r['유형']] = (byType[r['유형']] || 0) + 1; });
  var chk = checkIssues_();
  var info = rows_('이수정보');
  var unmatched = info.filter(function (r) { return r['명단확인'] === '명단없음'; }).length;
  var applicants = chk.total;
  var missing = chk.issues;
  var html = '<div style="font-family:sans-serif;font-size:14px;line-height:1.7">' +
    '<h3 style="margin:0 0 8px;color:#001871">오늘 할 일</h3>' +
    '<b>처리 안 된 셀프신청: ' + pending.length + '건</b><br>' +
    Object.keys(byType).map(function (k) { return '· ' + k + ' ' + byType[k] + '건'; }).join('<br>') +
    '<hr><b>이수정보 이상 없음: ' + (applicants - missing.length) + ' / ' + applicants + '명</b><br>' +
    '· 확인 필요 ' + missing.length + '명 → 메뉴에서 "이수정보 점검"<br>' +
    '· 명단과 안 맞는 입력 ' + unmatched + '건 (이수정보 시트 J열 "명단없음")' +
    '</div>';
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput(html).setWidth(380).setHeight(300), '연수운영');
}

// 연수원 신청자 목록 → 신청자 시트 (제목줄 이름으로 열을 찾아서, 1기·2기 양식이 달라도 OK)
function menuImport() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('연수원 명단 가져오기', '이 명단은 몇 기인가요? (예: 1기)', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var r = importRows_(sheet_('붙여넣기').getDataRange().getValues(), res.getResponseText().trim());
  ui.alert(r.ok ? r.msg : r.error);
}

function importRows_(src, term) {
  if (!term) return { ok: false, error: '기수를 입력해 주세요.' };
  var hi = -1;
  for (var i = 0; i < Math.min(src.length, 10); i++) if (src[i].join('|').indexOf('성명') >= 0) { hi = i; break; }
  if (hi < 0) return { ok: false, error: '제목줄(성명이 들어간 줄)까지 함께 붙여넣어 주세요.' };
  var head = src[hi].map(function (h) { return clean_(h).replace(/\s/g, ''); });
  var col = function (names) { for (var k = 0; k < names.length; k++) { var j = head.indexOf(names[k]); if (j >= 0) return j; } return -1; };
  var map = {
    '신청일': col(['신청일']), 'NEIS 번호': col(['NEIS번호', 'NEIS개인번호', '개인번호']), '성명': col(['성명']),
    '생년월일': col(['생년월일']), '전공': col(['전공']), '소속학교': col(['소속학교', '소속학교명']), '소속청': col(['소속청', '소속교육청']),
    '연락처': col(['연락처', '휴대폰']), '연수지명번호': col(['연수지명번호']), '이메일': col(['이메일'])
  };
  var dest = sheet_('신청자');
  var have = {};
  rows_('신청자').forEach(function (r) { have[clean_(r['성명']).replace(/\s/g, '') + '|' + normPhone_(r['연락처'])] = true; });
  var heads = SHEETS['신청자'];
  var add = [], skip = 0;
  src.slice(hi + 1).forEach(function (r) {
    var name = map['성명'] >= 0 ? clean_(r[map['성명']]).replace(/\s/g, '') : '';
    if (!name) return;
    var phone = map['연락처'] >= 0 ? normPhone_(r[map['연락처']]) : '';
    if (have[name + '|' + phone]) { skip++; return; }
    have[name + '|' + phone] = true;
    add.push(heads.map(function (h) {
      if (h === '기수') return term;
      if (h === '성명') return name;
      if (h === '연락처') return phone ? "'" + phone : '';
      if (h === '상태') return '신청';
      if (map[h] === undefined || map[h] < 0) return '';
      var v = r[map[h]];
      return (h === '생년월일' || h === 'NEIS 번호') && v !== '' ? "'" + clean_(v) : v;
    }));
  });
  if (add.length) dest.getRange(dest.getLastRow() + 1, 1, add.length, heads.length).setValues(add);
  return { ok: true, added: add.length, skipped: skip, msg: term + ' ' + add.length + '명 추가' + (skip ? ', 이미 있던 ' + skip + '명은 건너뜀' : '') + '.' };
}

// 신청자 원본 + 사이트 보완 입력(이수정보 시트)을 합친 최종 이수정보
function mergedRoster_() {
  var fix = {};
  rows_('이수정보').forEach(function (r) { fix[clean_(r['성명']) + '|' + normPhone_(r['휴대폰'])] = r; });
  return rows_('신청자').filter(function (r) { return r['상태'] !== '취소'; }).map(function (r) {
    var name = clean_(r['성명']).replace(/\s/g, '');
    var phone = normPhone_(r['연락처']);
    var f = fix[name + '|' + phone];
    return {
      term: r['기수'], name: name, phone: phone, // 기수는 신청자 명단이 원본 (기수 변경 불가)
      birth: normBirth_(f ? f['생년월일'] : r['생년월일']),
      neis: clean_(f ? f['나이스개인번호'] : r['NEIS 번호']).replace(/\s/g, '').toUpperCase(),
      school: clean_(f ? f['학교명'] : r['소속학교']),
      sido: normSido_(f ? f['시도교육청'] : r['소속청']),
      email: clean_(f ? f['이메일'] : r['이메일']),
      done: clean_(r['이수(Y/N)']).toUpperCase() !== 'N',
      fixed: !!f
    };
  });
}

// 이수정보 점검: 빠지거나 틀린 사람만 골라 문자 보낼 번호까지
function checkIssues_() {
  var re = new RegExp(settings_()['나이스번호형식'] || '^[A-Z][0-9]{9}$');
  var list = mergedRoster_();
  var seen = {}, issues = [];
  list.forEach(function (x) { var k = x.name + '|' + x.birth; seen[k] = (seen[k] || 0) + 1; });
  list.forEach(function (x) {
    var p = [];
    if (!re.test(x.neis)) p.push(x.neis ? 'NEIS 번호 형식' : 'NEIS 번호 없음');
    if (!x.birth) p.push('생년월일');
    if (!x.sido) p.push('소속교육청');
    if (!x.school) p.push('학교명 없음');
    else if (!/(학교|유치원|교육청|교육지원청|연구원|센터)$/.test(x.school)) p.push('학교명 줄임말?');
    if (!x.phone) p.push('연락처');
    if (seen[x.name + '|' + x.birth] > 1) p.push('중복 신청?');
    if (p.length) issues.push({ term: x.term, name: x.name, phone: x.phone, problem: p.join(', '), fixed: x.fixed });
  });
  var s = settings_();
  return {
    total: list.length, issues: issues,
    phones: issues.map(function (x) { return x.phone; }).filter(String).join(','),
    sms: '[연구하는 교사되기] 이수정보에 빠진 곳이 있어요. snu27.dumokquoka.com > 이수정보 입력에서 ' + (s['이수정보마감'] ? fmtDate_(s['이수정보마감']) + '까지 ' : '') + '보완해 주세요. 이수증 발급에 꼭 필요해요.'
  };
}

function menuCheck() {
  var r = checkIssues_();
  var out = [['기수', '성명', '연락처', '문제', '보완입력']].concat(r.issues.map(function (x) { return [x.term, x.name, x.phone ? "'" + x.phone : '', x.problem, x.fixed ? '했음' : '']; }));
  var sh = freshSheet_('점검결과_' + stamp_());
  sh.getRange(1, 1, out.length, 5).setValues(out);
  sh.getRange(1, 1, 1, 5).setFontWeight('bold');
  sh.getRange(1, 7).setValue('문자 보낼 번호 (복사 → 문자나라)').setFontWeight('bold');
  sh.getRange(2, 7).setValue(r.phones);
  sh.getRange(4, 7).setValue('문자 예시').setFontWeight('bold');
  sh.getRange(5, 7).setValue(r.sms);
  SpreadsheetApp.getUi().alert('전체 ' + r.total + '명 중 확인이 필요한 사람 ' + r.issues.length + '명이에요.');
}

// 이수생관리부: 연수원 표준양식의 두 시트(이수정보확인서, 이수대장)와 같은 열 순서
function rosterData_(term) {
  var s = settings_();
  var period = String(s['연수기간_' + term] || '').split('~');
  var start = (period[0] || '').replace(/\D/g, ''), end = (period[1] || '').replace(/\D/g, '');
  var list = mergedRoster_().filter(function (x) { return x.term === term && x.done; })
    .sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
  var a = [['연번', '성명(가나다순)', '생년월일(주민번호 앞 6자리)', 'NEIS 개인번호', '소속학교명', '소속교육청', '연락처', '본인 확인', '확인결과']];
  list.forEach(function (x, i) {
    a.push([i + 1, x.name, x.birth ? x.birth.replace(/-/g, '').slice(2) : '', x.neis, x.school, x.sido, x.phone, '☑', '확인 완료']);
  });
  var b = [['오류여부', '오류내용', '연번', '*성명', '*개인번호', '*연수과정연도', '*교육유형구분코드', '*연수구분코드', '*연수내용구분코드', '*연수시간(분)', '*직무관련성여부', '*연수과정명', '*교육형태코드', '*연수시작일자', '*연수종료일자', '*소속기관(학교명)', '*생년월일(예시: 1990.02.07)', '연수성적', '평정학점', '법정의무교육코드', '법정의무교육시간']];
  list.forEach(function (x, i) {
    b.push(['', '', i + 1, x.name, x.neis, start.slice(0, 4), String(s['이수대장_교육유형구분코드']), String(s['이수대장_연수구분코드']), String(s['이수대장_연수내용구분코드']),
      String(s['이수대장_연수시간(분)']), s['이수대장_직무관련성여부'], s['이수대장_연수과정명'], s['이수대장_교육형태코드'], start, end, x.school, x.birth.replace(/-/g, '.'), '', '', '', '']);
  });
  return { count: list.length, a: a, b: b, period: start && end };
}

function menuRoster() {
  var ui = SpreadsheetApp.getUi();
  var res = ui.prompt('이수생관리부 만들기', '기수를 입력하세요 (예: 1기)', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  var term = res.getResponseText().trim();
  var r = rosterData_(term);
  if (!r.count) return ui.alert(term + ' 이수자가 없어요. 기수 이름을 확인해 주세요.');
  var text = function (rows) { return rows.map(function (row, i) { return i === 0 ? row : row.map(function (v) { return v === '' ? '' : "'" + v; }); }); };
  var sh1 = freshSheet_(term + '_이수정보확인서');
  sh1.getRange(1, 1, r.a.length, r.a[0].length).setValues(text(r.a));
  var sh2 = freshSheet_(term + '_이수대장');
  sh2.getRange(1, 1, r.b.length, r.b[0].length).setValues(text(r.b));
  ui.alert(term + ' 이수자 ' + r.count + '명으로 두 시트를 만들었어요.\n연수원 표준양식 파일의 같은 이름 시트에 2행부터 "값만 붙여넣기" 하면 끝이에요.');
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
  return rows_('신청자').filter(function (r) { return clean_(r['성명']).replace(/\s/g, '') === name && normPhone_(r['연락처']) === phone; })[0] || null;
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
  var s = clean_(v).replace(/\s/g, '');
  if (!s) return '';
  var full = Object.keys(SIDO_ALIAS).sort(function (a, b) { return b.length - a.length; });
  for (var i = 0; i < full.length; i++) if (s.indexOf(full[i]) === 0) return SIDO_ALIAS[full[i]];
  var two = s.slice(0, 2);
  return SIDO.indexOf(two) >= 0 ? two : '';
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


// ───────────────────────── 운영자 관리 페이지 API ─────────────────────────
// 웹앱 배포를 두 개로 나눕니다.
//  · 공개용: 실행 = 나, 액세스 = 모든 사용자  → 연수생 사이트가 씀
//  · 운영자용: 실행 = 나, 액세스 = 나만       → ?page=admin 으로 관리 페이지
// 공개용 배포로 ?page=admin 을 열어도 isAdmin_() 에서 막힙니다.
function isAdmin_() {
  var me = '';
  try { me = Session.getActiveUser().getEmail(); } catch (e) {}
  if (!me) return false;
  var owner = Session.getEffectiveUser().getEmail();
  var extra = String(settings_()['관리자메일'] || '').split(',').map(function (x) { return x.trim().toLowerCase(); }).filter(String);
  return me.toLowerCase() === owner.toLowerCase() || extra.indexOf(me.toLowerCase()) >= 0;
}

var ADMIN_SHEETS = ['신청자', '이수정보', '셀프신청', '공지', 'FAQ', '연수일정', '강사일정', '설정', '문자기록', '강사정보', '출석', '게시판'];
var TEXT_COLS = ['연락처', '휴대폰', '생년월일', 'NEIS 번호', '나이스개인번호', '현금영수증번호', '전화', '주민등록번호', '계좌번호', '연수지명번호'];

function adminApi(action, p) {
  if (!isAdmin_()) throw new Error('운영자 계정이 아니에요.');
  p = p || {};
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    switch (action) {
      case 'boot': return adminBoot_();
      case 'table': return adminTable_(p.sheet);
      case 'save': return adminSave_(p.sheet, p.row, p.data);
      case 'del': return adminDel_(p.sheet, p.row);
      case 'process': return adminProcess_(p.row, p.state, p.memo);
      case 'check': return checkIssues_();
      case 'import': return importRows_(Utilities.parseCsv(String(p.text || ''), '\t'), String(p.term || '').trim());
      case 'roster': return rosterData_(String(p.term || '').trim());
      case 'people': return peopleList_();
      case 'smsLog':
        sheet_('문자기록').appendRow([new Date(), p.kind, p.target, p.count, p.text]);
        return { ok: true };
      case 'doc': return instructorDoc_();
      case 'attendance': return attendanceReport_(String(p.term || '').trim());
      case 'attendAdjust': return attendAdjust_(p);
      case 'attendApply': return attendApply_(String(p.term || '').trim());
      case 'board': return adminTable_('게시판');
      case 'boardReply': return boardReply_(p);
      default: throw new Error('알 수 없는 요청: ' + action);
    }
  } finally { lock.releaseLock(); }
}

function adminBoot_() {
  var s = settings_();
  var terms = String(s['기수목록'] || '1기,2기').split(',').map(function (t) { return t.trim(); }).filter(String);
  var apps = rows_('신청자');
  var byTerm = {};
  terms.forEach(function (t) { byTerm[t] = { 신청: 0, 대기: 0, 취소: 0 }; });
  apps.forEach(function (r) { var t = byTerm[r['기수']] || (byTerm[r['기수']] = { 신청: 0, 대기: 0, 취소: 0 }); var st = r['상태'] || '신청'; t[st] = (t[st] || 0) + 1; });
  var pending = rows_('셀프신청').filter(function (r) { return ['완료', '반려'].indexOf(r['처리상태']) < 0; });
  var chk = checkIssues_();
  return {
    email: Session.getActiveUser().getEmail(), settings: s, terms: terms, byTerm: byTerm,
    pending: pending.length, issues: chk.issues.length, total: chk.total,
    ssUrl: SpreadsheetApp.getActive().getUrl(), site: s['사이트주소'] || '',
    dups: dupNames_(),
    board: boardPending_()
  };
}

function targetSheet_(name) {
  if (ADMIN_SHEETS.indexOf(name) < 0) throw new Error('편집할 수 없는 시트예요: ' + name);
  if (name !== '강사정보') return sheet_(name);
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('INSTRUCTOR_SHEET_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('연구하는교사되기2027_강사정보(비공개)');
    var sh0 = ss.getSheets()[0];
    sh0.setName('강사정보');
    sh0.getRange(1, 1, 1, INSTRUCTOR_HEADERS.length).setValues([INSTRUCTOR_HEADERS]).setFontWeight('bold');
    sh0.setFrozenRows(1);
    props.setProperty('INSTRUCTOR_SHEET_ID', ss.getId());
  }
  return ss.getSheetByName('강사정보') || ss.getSheets()[0];
}

function cellOut_(v) {
  if (v instanceof Date) {
    var hasTime = v.getHours() || v.getMinutes();
    if (v.getFullYear() < 1901) return Utilities.formatDate(v, 'Asia/Seoul', 'HH:mm');
    return Utilities.formatDate(v, 'Asia/Seoul', hasTime ? 'yyyy-MM-dd HH:mm' : 'yyyy-MM-dd');
  }
  return v === null || v === undefined ? '' : String(v);
}

function adminTable_(name) {
  var sh = targetSheet_(name);
  var v = sh.getDataRange().getValues();
  var headers = (v.shift() || []).map(String);
  var rows = [];
  v.forEach(function (r, i) {
    if (r.join('') === '') return;
    var o = { _row: i + 2 };
    headers.forEach(function (h, j) { o[h] = cellOut_(r[j]); });
    rows.push(o);
  });
  var out = { sheet: name, headers: headers, rows: rows };
  if (name === '강사정보') out.url = sh.getParent().getUrl();
  return out;
}

function adminSave_(name, row, data) {
  var sh = targetSheet_(name);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  var cur = row ? sh.getRange(row, 1, 1, headers.length).getValues()[0] : headers.map(function () { return ''; });
  var vals = headers.map(function (h, j) {
    if (!data || !(h in data)) return cur[j];
    var v = data[h];
    if (h === '연락처' || h === '휴대폰') v = normPhone_(v) || v;
    if (TEXT_COLS.indexOf(h) >= 0 && v !== '' && v !== null) return "'" + String(v);
    return v;
  });
  if (row) sh.getRange(row, 1, 1, headers.length).setValues([vals]);
  else sh.appendRow(vals);
  if (name === '연수일정' || name === '강사일정') menuRecalcDowSilent_();
  return { ok: true };
}

function adminDel_(name, row) {
  if (name === '설정') throw new Error('설정은 지울 수 없어요.');
  targetSheet_(name).deleteRow(Number(row));
  return { ok: true };
}

// 셀프신청 처리: 완료로 바꾸면 신청자 시트에도 자동 반영
function adminProcess_(row, state, memo) {
  var sh = sheet_('셀프신청');
  var h = SHEETS['셀프신청'];
  var r = sh.getRange(row, 1, 1, h.length).getValues()[0];
  var o = {}; h.forEach(function (k, i) { o[k] = r[i]; });
  sh.getRange(row, 10, 1, 3).setValues([[state, memo || '', new Date()]]);
  var applied = '';
  if (state === '완료') {
    var a = sheet_('신청자');
    var ah = a.getRange(1, 1, 1, a.getLastColumn()).getValues()[0].map(String);
    var data = a.getDataRange().getValues();
    var ni = ah.indexOf('성명'), pi = ah.indexOf('연락처');
    for (var i = 1; i < data.length; i++) {
      if (clean_(data[i][ni]).replace(/\s/g, '') === clean_(o['성명']).replace(/\s/g, '') && normPhone_(data[i][pi]) === normPhone_(o['휴대폰'])) {
        if (o['유형'] === '수강취소') { a.getRange(i + 1, ah.indexOf('상태') + 1).setValue('취소'); applied = '신청자 상태를 취소로 바꿨어요.'; }
        if (o['유형'] === '현금영수증 수정') {
          var mi = ah.indexOf('메모') + 1;
          var prev = clean_(a.getRange(i + 1, mi).getValue());
          a.getRange(i + 1, mi).setValue((prev ? prev + ' / ' : '') + '현금영수증: ' + clean_(o['현금영수증번호']));
          applied = '신청자 메모에 현금영수증 번호를 남겼어요.';
        }
        break;
      }
    }
    if (!applied && ['수강취소', '현금영수증 수정'].indexOf(o['유형']) >= 0) applied = '신청자 명단에서 같은 이름·번호를 찾지 못해 자동 반영은 못 했어요.';
  }
  return { ok: true, applied: applied };
}

// 문자 받을 사람: 기수·상태·이수정보 문제 여부까지
function peopleList_() {
  var bad = {};
  checkIssues_().issues.forEach(function (x) { bad[x.name + '|' + x.phone] = x.problem; });
  var fixed = {};
  rows_('이수정보').forEach(function (r) { fixed[clean_(r['성명']) + '|' + normPhone_(r['휴대폰'])] = true; });
  var att = {};
  termList_().forEach(function (t) { attendanceReport_(t).people.forEach(function (x) { att[x.name + '|' + x.phone] = x; }); });
  var refund = {};
  rows_('게시판').filter(function (r) { return r['게시판'] === '환불요청'; }).forEach(function (r) {
    refund[clean_(r['성명']).replace(/\s/g, '') + '|' + normPhone_(r['휴대폰'])] = r['처리상태'] || '접수';
  });
  return rows_('신청자').map(function (r) {
    var name = clean_(r['성명']).replace(/\s/g, ''), phone = normPhone_(r['연락처']);
    var key = name + '|' + phone, at = att[key] || {};
    return { name: name, phone: phone, term: r['기수'], state: r['상태'] || '신청', paid: !!clean_(r['입금일']), issue: bad[key] || '', done: clean_(r['이수(Y/N)']).toUpperCase() !== 'N',
      school: clean_(r['소속학교']), days: at.days || {}, judge: at.judge || '', total: at.total || 0, refund: refund[key] || '' };
  }).filter(function (x) { return x.name; });
}

// 위촉공문 자료: 강사일정 + 강사정보(성명으로 연결)
function instructorDoc_() {
  var info = {};
  adminTable_('강사정보').rows.forEach(function (r) { info[clean_(r['성명'])] = r; });
  var by = {};
  rows_('강사일정').filter(function (r) { return r['강사명'] && r['날짜']; }).forEach(function (r) {
    var k = clean_(r['강사명']);
    var d = toDate_(r['날짜']);
    (by[k] = by[k] || { items: [], hours: 0, 소속: r['소속'], 역할: r['역할'] });
    by[k].items.push(fmtDate_(d) + '(' + DOW[d.getDay()] + ') ' + fmtTime_(r['시작']) + '~' + fmtTime_(r['종료']) + (r['강의주제'] ? ' ' + r['강의주제'] : ''));
    by[k].hours += Number(r['시간(h)'] || 0);
  });
  var rows = [['연번', '성명', '소속', '직위', '역할', '전화', '이메일', '생년월일', '강의 일시(요일 자동)', '총 시간(h)']];
  Object.keys(by).forEach(function (k, i) {
    var x = info[k] || {};
    rows.push([i + 1, k, x['소속'] || by[k].소속 || '', x['직위'] || '', by[k].역할 || '', x['전화'] || '', x['이메일'] || '', x['생년월일'] || '', by[k].items.join(' / '), by[k].hours]);
  });
  return { rows: rows };
}

function menuRecalcDowSilent_() {
  [['연수일정', 2, 3], ['강사일정', 1, 2]].forEach(function (c) {
    var sh = sheet_(c[0]);
    var n = sh.getLastRow() - 1;
    if (n < 1) return;
    var dates = sh.getRange(2, c[1], n, 1).getValues();
    sh.getRange(2, c[2], n, 1).setValues(dates.map(function (d) { var x = toDate_(d[0]); return [x ? DOW[x.getDay()] : '']; }));
  });
}

// ───────────────────────── 공통: 기수, 동명이인 ─────────────────────────
function termList_() {
  return String(settings_()['기수목록'] || '1기,2기').split(',').map(function (t) { return t.trim(); }).filter(String);
}
function personKey_(name, phone) { return clean_(name).replace(/\s/g, '') + '|' + normPhone_(phone); }

// 이름이 같은데 휴대폰이 다른 사람 = 동명이인. 이름만으로는 절대 매칭하지 않는다.
function dupNames_() {
  var by = {};
  rows_('신청자').filter(function (r) { return r['상태'] !== '취소'; }).forEach(function (r) {
    var n = clean_(r['성명']).replace(/\s/g, ''), ph = normPhone_(r['연락처']);
    if (!n) return;
    by[n] = by[n] || {};
    by[n][ph] = { phone: ph, term: r['기수'], school: clean_(r['소속학교']) };
  });
  var out = {};
  Object.keys(by).forEach(function (n) { var list = Object.keys(by[n]).map(function (k) { return by[n][k]; }); if (list.length > 1) out[n] = list; });
  return out;
}

// ───────────────────────── 출석: 출석체크 → 강의실 입장 → 퇴실체크 ─────────────────────────
function hm_(v) { var m = /(\d{1,2}):(\d{2})/.exec(fmtTime_(v)); return m ? (+m[1]) * 60 + (+m[2]) : null; }
function hmStr_(min) { min = Math.max(0, Math.round(min)); return ('0' + Math.floor(min / 60)).slice(-2) + ':' + ('0' + (min % 60)).slice(-2); }
function nowKst_() {
  var d = new Date();
  var hm = Utilities.formatDate(d, 'Asia/Seoul', 'HH:mm');
  return { date: Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd'), hm: hm, min: hm_(hm) };
}

// 기수별 연수일: 같은 날 여러 줄이면 시작=가장 이른 시각, 종료=가장 늦은 시각, 시간=합계
function termDays_(term) {
  var by = {};
  rows_('연수일정').filter(function (r) { return clean_(r['기수']) === term && r['날짜']; }).forEach(function (r) {
    var date = fmtDate_(r['날짜']); if (!date) return;
    var st = hm_(r['시작']), en = hm_(r['종료']);
    var h = Number(r['시간(h)']) || (st !== null && en !== null ? (en - st) / 60 : 0);
    var d = by[date] || (by[date] = { date: date, dow: DOW[toDate_(date).getDay()], start: st, end: en, hours: 0 });
    if (st !== null && (d.start === null || st < d.start)) d.start = st;
    if (en !== null && (d.end === null || en > d.end)) d.end = en;
    d.hours += h;
  });
  return Object.keys(by).sort().map(function (k) { var d = by[k]; d.hours = Math.round(d.hours * 10) / 10; d.startHm = hmStr_(d.start || 0); d.endHm = hmStr_(d.end || 0); return d; });
}

// 400명이 몰려도 버티도록 명단·일정은 5분 캐시
function attendCtx_(fresh) {
  var cache = CacheService.getScriptCache();
  if (!fresh) { var c = cache.get('attendCtx'); if (c) return JSON.parse(c); }
  var s = settings_();
  var people = {};
  rows_('신청자').forEach(function (r) {
    if (r['상태'] === '취소') return;
    people[personKey_(r['성명'], r['연락처'])] = { term: clean_(r['기수']), state: r['상태'] || '신청' };
  });
  var days = {}, zoom = {};
  termList_().forEach(function (t) { days[t] = termDays_(t); zoom[t] = s['줌링크_' + t] || ''; });
  var ctx = { people: people, days: days, zoom: zoom, before: Number(s['입실가능(분)'] || 30), outBefore: Number(s['퇴실가능(분)'] || 20), test: yes_(s['출석테스트']) };
  try { cache.put('attendCtx', JSON.stringify(ctx), 300); } catch (e) {}
  return ctx;
}

function attend_(d) {
  var name = clean_(d.name).replace(/\s/g, ''), phone = normPhone_(d.phone), kind = d.kind === 'out' ? 'out' : 'in';
  if (!name || !phone) return { ok: false, error: '성명과 휴대폰 번호를 정확히 입력해 주세요.' };
  var key = name + '|' + phone;
  var ctx = attendCtx_();
  var me = ctx.people[key];
  if (!me) { ctx = attendCtx_(true); me = ctx.people[key]; }
  if (!me) return { ok: false, error: '신청자 명단에서 찾지 못했어요. 연수 신청할 때 쓴 휴대폰 번호인지 확인해 주세요.\n(같은 이름이 여러 분 계셔서 휴대폰 번호로 본인을 확인해요.)' };
  if (me.state === '대기') return { ok: false, error: '아직 대기 상태예요. 확정 문자를 받은 뒤에 출석할 수 있어요.' };
  var now = nowKst_();
  var days = ctx.days[me.term] || [];
  var day = days.filter(function (x) { return x.date === now.date; })[0];
  if (!day && ctx.test && days.length) day = { date: now.date, start: days[0].start, end: days[0].end, hours: days[0].hours, test: true };
  if (!day) {
    var next = days.filter(function (x) { return x.date > now.date; })[0];
    return { ok: false, error: '오늘은 ' + me.term + ' 연수일이 아니에요.' + (next ? '\n다음 연수일: ' + next.date + '(' + next.dow + ') ' + next.startHm : '') };
  }
  if (!day.test) {
    if (kind === 'in') {
      if (now.min < day.start - ctx.before) return { ok: false, error: '출석체크는 ' + hmStr_(day.start - ctx.before) + '부터 할 수 있어요.' };
      if (now.min > day.end) return { ok: false, error: '오늘 연수는 ' + hmStr_(day.end) + '에 끝났어요. 출결 문의는 Q&A 게시판에 남겨 주세요.' };
    } else {
      if (now.min < day.end - ctx.outBefore) return { ok: false, error: '퇴실체크는 연수가 끝나기 ' + ctx.outBefore + '분 전(' + hmStr_(day.end - ctx.outBefore) + ')부터 할 수 있어요. 끝날 때 다시 눌러 주세요.' };
      if (now.min > day.end + 120) return { ok: false, error: '퇴실체크 시간이 지났어요. Q&A 게시판에 남겨 주시면 확인해 드릴게요.' };
    }
  }
  sheet_('출석').appendRow([new Date(), me.term, "'" + now.date, kind === 'in' ? '입실' : '퇴실', name, "'" + phone, '', day.test ? '테스트' : '']);
  var out = { ok: true, kind: kind, time: now.hm, term: me.term, date: now.date, start: hmStr_(day.start), end: hmStr_(day.end), test: !!day.test };
  if (kind === 'in') { out.zoom = ctx.zoom[me.term] || ''; out.late = Math.max(0, now.min - day.start); }
  return out;
}

// 출결 집계: 사람 × 날짜. 이름+휴대폰으로만 묶는다(동명이인 안전).
function attendanceReport_(term) {
  var s = settings_();
  var need = Number(s['이수인정시간'] || 12), grace = Number(s['지각허용(분)'] || 10);
  var days = termDays_(term);
  var now = nowKst_();
  var dups = dupNames_();
  var rec = {};
  rows_('출석').forEach(function (r) {
    if (clean_(r['기수']) !== term || clean_(r['비고']) === '테스트') return;
    var k = personKey_(r['성명'], r['휴대폰']) + '|' + fmtDate_(r['날짜']);
    var x = rec[k] || (rec[k] = { in: null, out: null, adj: null, memo: '' });
    var t = r['기록시각'] instanceof Date ? hm_(Utilities.formatDate(r['기록시각'], 'Asia/Seoul', 'HH:mm')) : null;
    if (r['구분'] === '입실' && t !== null && (x.in === null || t < x.in)) x.in = t;
    if (r['구분'] === '퇴실' && t !== null && (x.out === null || t > x.out)) x.out = t;
    if (r['구분'] === '조정') { x.adj = clean_(r['인정시간']) === '' ? null : Number(r['인정시간']); x.memo = clean_(r['비고']); }
  });
  var counts = {};
  days.forEach(function (d) { counts[d.date] = { in: 0, out: 0, noIn: 0, noOut: 0 }; });
  var people = rows_('신청자').filter(function (r) { return clean_(r['기수']) === term && (r['상태'] || '신청') === '신청'; }).map(function (r) {
    var name = clean_(r['성명']).replace(/\s/g, ''), phone = normPhone_(r['연락처']);
    var total = 0, pending = 0, checks = 0, out = {};
    days.forEach(function (d) {
      var x = rec[name + '|' + phone + '|' + d.date] || {};
      var finished = d.date < now.date || (d.date === now.date && now.min > d.end + 120);
      var started = d.date < now.date || (d.date === now.date && now.min >= d.start - 30);
      var o = { in: x.in != null ? hmStr_(x.in) : '', out: x.out != null ? hmStr_(x.out) : '', hours: 0, status: '', memo: x.memo || '' };
      if (x.in != null) counts[d.date].in++; else if (started) counts[d.date].noIn++;
      if (x.out != null) counts[d.date].out++; else if (x.in != null && finished) counts[d.date].noOut++;
      if (x.adj != null) { o.hours = x.adj; o.status = '조정'; total += x.adj; }
      else if (!started) { o.status = '예정'; pending += d.hours; }
      else if (!finished) { o.status = x.in != null ? (x.out != null ? '퇴실' : '수강 중') : '미입실'; pending += d.hours; }
      else if (x.in != null && x.out != null) {
        var late = x.in - d.start, early = d.end - x.out, ded = 0, tag = [];
        if (late > grace) { ded += Math.ceil(late / 60); tag.push('지각 ' + late + '분'); }
        if (early > grace) { ded += Math.ceil(early / 60); tag.push('조퇴 ' + early + '분'); }
        o.hours = Math.max(0, d.hours - ded); o.status = tag.length ? tag.join(', ') : '정상'; total += o.hours;
      }
      else if (x.in != null) { o.status = '퇴실 미체크'; checks += d.hours; }
      else if (x.out != null) { o.status = '입실 미체크'; checks += d.hours; }
      else o.status = '결석';
      out[d.date] = o;
    });
    var judge = total >= need ? 'Y' : (total + pending + checks < need ? 'N' : (pending ? '진행 중' : '확인 필요'));
    return { name: name, phone: phone, school: clean_(r['소속학교']), dup: !!dups[name], days: out, total: total, judge: judge };
  });
  return { ok: true, term: term, need: need, grace: grace, today: now.date, days: days, counts: counts, people: people };
}

function attendanceOf_(name, phone) {
  var a = findApplicant_(name, phone);
  if (!a) return null;
  var rep = attendanceReport_(clean_(a['기수']));
  var me = rep.people.filter(function (x) { return x.name === name && x.phone === phone; })[0];
  if (!me) return null;
  return { term: rep.term, need: rep.need, total: me.total, judge: me.judge, days: rep.days.map(function (d) { var x = me.days[d.date]; return { date: d.date, dow: d.dow, hours: d.hours, in: x.in, out: x.out, got: x.hours, status: x.status }; }) };
}

function attendAdjust_(p) {
  var name = clean_(p.name).replace(/\s/g, ''), phone = normPhone_(p.phone);
  if (!name || !phone || !p.date) throw new Error('이름·휴대폰·날짜가 필요해요.');
  var h = clean_(p.hours);
  sheet_('출석').appendRow([new Date(), clean_(p.term), "'" + fmtDate_(p.date), '조정', name, "'" + phone, h === '' ? '' : Number(h), clean_(p.memo) || (h === '' ? '조정 해제' : '운영자 확인')]);
  return { ok: true };
}

// 이수 판정 반영: Y/N이 정해진 사람만 신청자 시트 이수(Y/N)에 기록 (진행 중·확인 필요는 그대로)
function attendApply_(term) {
  var rep = attendanceReport_(term);
  var judge = {};
  rep.people.forEach(function (x) { if (x.judge === 'Y' || x.judge === 'N') judge[x.name + '|' + x.phone] = x.judge; });
  var sh = sheet_('신청자');
  var data = sh.getDataRange().getValues();
  var h = data[0].map(String), ni = h.indexOf('성명'), pi = h.indexOf('연락처'), ti = h.indexOf('기수'), yi = h.indexOf('이수(Y/N)');
  var y = 0, n = 0;
  for (var i = 1; i < data.length; i++) {
    if (clean_(data[i][ti]) !== term) continue;
    var v = judge[personKey_(data[i][ni], data[i][pi])];
    if (!v) continue;
    sh.getRange(i + 1, yi + 1).setValue(v);
    if (v === 'Y') y++; else n++;
  }
  var left = rep.people.length - y - n;
  return { ok: true, y: y, n: n, left: left, msg: term + ' 이수 Y ' + y + '명, N ' + n + '명 반영' + (left ? ' (확인 필요·진행 중 ' + left + '명은 그대로)' : '') };
}

// ───────────────────────── 게시판: Q&A · 환불요청 ─────────────────────────
var BOARD_STATES = { 'Q&A': ['접수', '답변 완료'], '환불요청': ['접수', '검토 중', '연수원 전달', '환불 완료', '반려'] };
var BOARD_DONE = ['답변 완료', '환불 완료', '반려'];
var REFUND_REASONS = ['개인 사정(일정 충돌 등)', '중복 신청', '건강·가족 사유', '연수 내용이 기대와 다름', '기타'];

function maskName_(n) { n = clean_(n); if (n.length <= 1) return n; if (n.length === 2) return n[0] + '*'; return n[0] + new Array(n.length - 1).join('*') + n[n.length - 1]; }

function boardWrite_(d) {
  var board = d.board === '환불요청' ? '환불요청' : 'Q&A';
  var name = clean_(d.name).replace(/\s/g, ''), phone = normPhone_(d.phone);
  var title = clean_(d.title).slice(0, 80), content = clean_(d.content).slice(0, 2000), reason = clean_(d.reason);
  var errs = [];
  if (!name || name.length < 2) errs.push('성명을 입력해 주세요.');
  if (!phone) errs.push('휴대폰 번호를 010-0000-0000 형식으로 입력해 주세요.');
  if (board === 'Q&A' && !title) errs.push('제목을 입력해 주세요.');
  if (board === '환불요청') {
    if (REFUND_REASONS.indexOf(reason) < 0) errs.push('환불 사유를 골라 주세요.');
    if (content.length < 10) errs.push('환불 사유를 10자 이상 적어 주세요.');
    if (d.agree !== true) errs.push('처리 기간 안내를 확인했다고 체크해 주세요.');
    title = '환불 요청';
  } else if (content.length < 5) errs.push('내용을 5자 이상 적어 주세요.');
  if (errs.length) return { ok: false, error: errs.join('\n') };
  var a = findApplicant_(name, phone);
  var sh = sheet_('게시판');
  var same = rows_('게시판').filter(function (r) { return r['게시판'] === board; }).length;
  var no = (board === '환불요청' ? 'F' : 'Q') + ('000' + (same + 1)).slice(-4);
  sh.appendRow([new Date(), no, board, title, content, name, "'" + phone, a ? a['기수'] : clean_(d.term), board === 'Q&A' && d.public === true ? 'Y' : 'N', board === '환불요청' ? reason : '', '접수', '', '', a ? '' : '신청자 명단에서 찾지 못함']);
  return { ok: true, no: no, matched: !!a };
}

function boardList_(d) {
  var board = d.board === '환불요청' ? '환불요청' : 'Q&A';
  var items = rows_('게시판').filter(function (r) { return r['게시판'] === board; }).reverse().slice(0, 300).map(function (r) {
    var pub = board === 'Q&A' && r['공개'] === 'Y';
    return { no: r['글번호'], title: board === '환불요청' ? '환불 요청' : (pub ? r['제목'] : '비공개 문의'), pub: pub, author: maskName_(r['성명']), at: fmtDate_(r['작성시각']), state: r['처리상태'] || '접수', answered: !!clean_(r['답변']) };
  });
  return { ok: true, board: board, items: items };
}

function boardView_(d) {
  var no = clean_(d.no);
  var r = rows_('게시판').filter(function (x) { return clean_(x['글번호']) === no; })[0];
  if (!r) return { ok: false, error: '글을 찾지 못했어요.' };
  var pub = r['게시판'] === 'Q&A' && r['공개'] === 'Y';
  if (!pub) {
    var name = clean_(d.name).replace(/\s/g, ''), phone = normPhone_(d.phone);
    if (!name || !phone) return { ok: false, needAuth: true, error: '본인 글만 볼 수 있어요. 작성할 때 쓴 이름과 휴대폰 번호를 넣어 주세요.' };
    if (clean_(r['성명']).replace(/\s/g, '') !== name || normPhone_(r['휴대폰']) !== phone) return { ok: false, needAuth: true, error: '작성자 정보와 맞지 않아요. 작성할 때 쓴 이름과 휴대폰 번호를 확인해 주세요.' };
  }
  return { ok: true, no: r['글번호'], board: r['게시판'], title: r['제목'], content: r['내용'], reason: r['환불사유'], state: r['처리상태'] || '접수', answer: r['답변'], answeredAt: cellOut_(r['답변시각']), at: cellOut_(r['작성시각']), author: maskName_(r['성명']), pub: pub };
}

function boardPending_() {
  var o = { qna: 0, refund: 0 };
  rows_('게시판').forEach(function (r) {
    if (BOARD_DONE.indexOf(r['처리상태']) >= 0) return;
    if (r['게시판'] === '환불요청') o.refund++; else o.qna++;
  });
  return o;
}

function boardReply_(p) {
  var sh = sheet_('게시판');
  var h = SHEETS['게시판'];
  var row = Number(p.row);
  var cur = sh.getRange(row, 1, 1, h.length).getValues()[0];
  var o = {}; h.forEach(function (k, i) { o[k] = cur[i]; });
  var states = BOARD_STATES[o['게시판']] || BOARD_STATES['Q&A'];
  var state = states.indexOf(p.state) >= 0 ? p.state : (o['처리상태'] || '접수');
  var answer = p.answer === undefined ? o['답변'] : clean_(p.answer);
  sh.getRange(row, h.indexOf('처리상태') + 1).setValue(state);
  sh.getRange(row, h.indexOf('답변') + 1).setValue(answer);
  if (answer !== clean_(o['답변']) || state !== o['처리상태']) sh.getRange(row, h.indexOf('답변시각') + 1).setValue(new Date());
  if (p.memo !== undefined) sh.getRange(row, h.indexOf('운영메모') + 1).setValue(clean_(p.memo));
  return { ok: true, state: state };
}

// ───────────────────────── 2027 커리큘럼 넣기 (한 번만 실행) ─────────────────────────
// 1·2기 동일 15차시, 매일 13:00~18:00. 날짜는 설정의 연수기간_1기/2기를 따른다.
var CURRICULUM_2027 = [
  [0, '13:00', '15:00', 2, '연구하는 교사의 길', '박성춘 교수님', '주강사'],
  [0, '15:00', '18:00', 3, '디지털교육 연구대회의 실제', '이대형', '교사강사'],
  [1, '13:00', '15:00', 2, '수업혁신 사례 연구 (초등)', '미정', '교사강사'],
  [1, '15:00', '17:00', 2, '수업혁신 사례 연구 (중등)', '한세웅', '교사강사'],
  [1, '17:00', '18:00', 1, '연구 주제 선정 (실습)', '김햇살', '실습'],
  [2, '13:00', '15:00', 2, '인성교육 실천사례 연구', '방정은', '교사강사'],
  [2, '15:00', '17:00', 2, '영상·방송 연구대회의 실제', '미정', '교사강사'],
  [2, '17:00', '18:00', 1, '연구하는 교사되기 로드맵 (종합 질의응답)', '박성춘 교수님', '종합']
];
function seedCurriculum2027() {
  // 예전 기본값(2/1~3, 2/4~6)이 남아 있으면 초안 날짜로 바꿈
  var st = sheet_('설정'), sv = st.getDataRange().getValues();
  var fix = { '연수기간_1기': ['2027-02-01~2027-02-03', '2027-01-11~2027-01-13'], '연수기간_2기': ['2027-02-04~2027-02-06', '2027-02-01~2027-02-03'] };
  for (var i = 1; i < sv.length; i++) { var f = fix[String(sv[i][0]).trim()]; if (f && String(sv[i][1]).trim() === f[0]) st.getRange(i + 1, 2).setValue(f[1]); }
  var s = settings_();
  var sched = sheet_('연수일정'), tsched = sheet_('강사일정');
  if (sched.getLastRow() > 1) sched.getRange(2, 1, sched.getLastRow() - 1, sched.getLastColumn()).clearContent();
  if (tsched.getLastRow() > 1) tsched.getRange(2, 1, tsched.getLastRow() - 1, tsched.getLastColumn()).clearContent();
  var a = [], b = [];
  termList_().forEach(function (t) {
    var start = toDate_(String(s['연수기간_' + t] || '').split('~')[0]);
    if (!start) return;
    CURRICULUM_2027.forEach(function (c) {
      var d = new Date(start); d.setDate(d.getDate() + c[0]);
      var ds = Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd');
      a.push([t, ds, DOW[d.getDay()], "'" + c[1], "'" + c[2], c[3], c[4], c[5]]);
      b.push([ds, DOW[d.getDay()], "'" + c[1], "'" + c[2], c[3], t, c[5], '', c[6], c[4], '']);
    });
  });
  if (a.length) sched.getRange(2, 1, a.length, a[0].length).setValues(a);
  if (b.length) tsched.getRange(2, 1, b.length, b[0].length).setValues(b);
  try { CacheService.getScriptCache().remove('attendCtx'); } catch (e) {}
  Logger.log('연수일정 ' + a.length + '줄, 강사일정 ' + b.length + '줄');
}
