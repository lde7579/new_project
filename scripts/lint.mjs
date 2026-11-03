// 의존성 없는 린트: index.html의 구조와 스크립트를 정적 검사
import vm from 'node:vm';
import { readIndex, jsBlocks, menuDataText, CATEGORIES, MENU_DATA_OPEN } from './html.mjs';

const html = readIndex();
const errors = [];
const err = (line, msg) => errors.push(`index.html:${line}  ${msg}`);
const lineOf = (idx) => html.slice(0, idx).split('\n').length;

// 1) 인라인 JS 문법 검사
const blocks = jsBlocks(html);
for (const b of blocks) {
  try {
    new vm.Script(b.code, { filename: `index.html:${b.line}` });
  } catch (e) {
    err(b.line, `JS 문법 오류: ${e.message}`);
  }
}

// 2) 금지 패턴 (디버그 코드 남김)
blocks.forEach(b => {
  b.code.split('\n').forEach((l, i) => {
    if (/\bdebugger\b/.test(l)) err(b.line + i, 'debugger 문이 남아 있습니다');
    if (/console\.log\(/.test(l)) err(b.line + i, 'console.log가 남아 있습니다');
  });
});

// 3) $('id') / getElementById('id')가 실제 존재하는 id를 가리키는지
// id는 마크업에서만 수집 (스크립트 본문 안의 문자열은 제외)
const markup = html.replace(/(<script[^>]*>)[\s\S]*?(<\/script>)/g, '$1$2');
const idMatches = [...markup.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
const ids = new Set(idMatches);
for (const m of html.matchAll(/(?:\$|getElementById)\('([^']+)'\)/g)) {
  if (!ids.has(m[1])) err(lineOf(m.index), `존재하지 않는 id 참조: '${m[1]}'`);
}

// 4) 중복 id
const idCounts = {};
for (const id of idMatches) idCounts[id] = (idCounts[id] || 0) + 1;
Object.entries(idCounts).filter(([, c]) => c > 1).forEach(([id]) => err(1, `중복 id: '${id}'`));

// 5) 메뉴판 데이터 블록 (HTML 내보내기가 이 정확한 태그에 의존)
if (!html.includes(MENU_DATA_OPEN)) {
  err(1, `메뉴판 데이터 태그가 없습니다: ${MENU_DATA_OPEN}`);
} else {
  const text = menuDataText(html);
  let data;
  try { data = JSON.parse(text); } catch (e) { err(lineOf(html.indexOf(MENU_DATA_OPEN)), `menuData JSON 파싱 실패: ${e.message}`); }
  if (data !== undefined) {
    if (!Array.isArray(data)) err(1, 'menuData는 배열이어야 합니다');
    else {
      const seen = new Set();
      data.forEach((m, i) => {
        if (!m || typeof m.name !== 'string' || !m.name.trim()) err(1, `menuData[${i}]: name이 비어 있습니다`);
        else if (seen.has(m.name.trim())) err(1, `menuData[${i}]: 중복 식당 '${m.name}'`);
        else seen.add(m.name.trim());
        if (!CATEGORIES.includes(m?.cat)) err(1, `menuData[${i}]: 알 수 없는 카테고리 '${m?.cat}'`);
      });
    }
  }
}

// 6) 기본 메타 태그
if (!/<meta charset="UTF-8"/i.test(html)) err(1, '<meta charset="UTF-8">가 없습니다');
if (!/<html lang="/.test(html)) err(1, '<html lang>이 없습니다');

if (errors.length) {
  console.error(`✖ lint 실패 (${errors.length}건)\n` + errors.map(e => '  ' + e).join('\n'));
  process.exit(1);
}
console.log(`✔ lint 통과 (스크립트 ${blocks.length}개, id ${ids.size}개 검사)`);
