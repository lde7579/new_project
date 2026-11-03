# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

점심 메뉴 룰렛: 팀이 html 파일 하나를 돌려 쓰는 점심 메뉴 돌림판. **`index.html` 한 파일이 앱 전체**이고 `file://`로 직접 열어서 실행한다(서버 없음, npm 의존성 없음, Node 24 내장 기능만 사용). UI와 문서는 한국어로 작성한다.

## Commands

```bash
npm run check        # lint → build → test 한 번에 (커밋 전 훅과 동일)
npm run lint         # scripts/lint.mjs
npm run build        # dist/lunch-roulette.html 생성 (dist/는 gitignore)
npm test             # node --test "tests/**/*.test.mjs"
node --test --test-name-pattern="isLeftHalf" "tests/**/*.test.mjs"   # 테스트 하나만 실행
start index.html     # 브라우저로 열기 (Windows)
```

## Architecture

`index.html` 안에 서로 다른 역할의 `<script>` 블록이 3개 있다:

1. **`<script id="menuData" type="application/json">`**: 파일에 들어 있는 팀 메뉴판 (`[{name, cat}]`).
   - "HTML 저장" 기능(`exportHtml`)은 페이지를 처음 불러올 때 저장해 둔 원본 HTML(`PRISTINE`)에서 **이 태그의 정확한 문자열**을 정규식으로 찾아 내용을 바꾼다. 태그 속성이나 순서를 바꾸면 내보내기가 조용히 깨진다. 그래서 lint가 이 태그 문자열을 검사한다.
2. **`<script id="wheelLogic">`**: DOM을 쓰지 않는 순수 함수 `WheelLogic` (`indexAtPointer`, `targetRotation`, `isLeftHalf`, `normalizeMenus`).
   - 테스트는 `scripts/html.mjs`의 `loadWheelLogic()`이 이 블록만 꺼내 `node:vm`에서 실행해서 검사한다.
   - **새로 만드는 계산/검증 로직은 여기에 넣고 테스트를 추가한다.** UI 스크립트 안의 로직은 테스트할 수 없다.
3. **마지막 `<script>`**: UI, 상태, localStorage, 내보내기.

중요한 설계 결정:
- **돌림판 각도**: 칸 i는 각도 `rotation + i·arc`에서 시작하고, 포인터는 위쪽(-90°)에 있다. 당첨 칸을 먼저 뽑은 뒤 `targetRotation`으로 멈출 각도를 계산한다. 결과와 화살표가 일치하는 건 테스트가 무작위 1000회로 보장한다. 각도를 따로 계산하는 코드를 추가하지 않는다.
- **localStorage 우선순위**: 메뉴는 `{src, menus}` 형태로 저장한다(`lunch.v2.menus`). 저장된 `src`가 지금 파일의 menuData 원문과 **다르면 파일 데이터를 쓴다.** 동료가 새로 받은 html을 열었을 때 예전 브라우저 기록이 덮어쓰지 않게 하려는 것이다. "오늘 먹은 곳"(`lunch.v2.eaten`)은 날짜가 바뀌면 초기화된다.
- **file:// 제약**: 서로 다른 PC 사이에는 URL 공유가 안 된다. 그래서 공유는 "메뉴판이 들어 있는 html 파일 저장"과 "결과 텍스트 복사"로만 한다. ES module import, fetch, 서버가 필요한 API를 쓰지 않는다.
- 사용자가 입력한 식당 이름은 반드시 `textContent`로 DOM에 넣는다. 내보낼 JSON은 `<`를 `<`로 이스케이프한다.

## Tooling (`scripts/`, `.claude/`)

- `scripts/html.mjs`: lint, build, test가 함께 쓰는 index.html 파서. 카테고리 목록 `CATEGORIES`는 index.html의 `CATS`와 **같게 유지해야 한다**.
- `scripts/lint.mjs`: 인라인 JS 문법, `$('id')`가 존재하는 id를 가리키는지, 중복 id, `console.log`/`debugger`, menuData 유효성을 검사한다. id는 스크립트 본문을 뺀 마크업에서만 수집한다.
- `.claude/settings.json`의 PreToolUse 훅(`.claude/hooks/pre-commit.mjs`): Bash나 PowerShell로 `git commit`을 실행하면 `npm run check`의 세 단계를 돌리고, 실패하면 exit 2로 커밋을 막는다. 훅에 막혔으면 우회하지 말고 원인을 고친다.
- 코드 리뷰: `code-reviewer` 서브에이전트(읽기 전용)가 `lunch-code-review` 스킬(`.claude/skills/lunch-code-review/SKILL.md`)의 체크리스트를 쓴다.
