#!/usr/bin/env node
// Claude Code PreToolUse 훅: Claude가 `git commit`을 실행하기 직전에 lint → build → test를 돌린다.
// 하나라도 실패하면 exit 2로 커밋을 막고, 실패 내용을 Claude에게 전달한다.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = process.env.CLAUDE_PROJECT_DIR
  || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

let input = {};
try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { process.exit(0); }

const command = input?.tool_input?.command;
if (typeof command !== 'string') process.exit(0);

// git commit / git -C dir commit / git -c k=v commit (git log ... commit 같은 오탐은 제외)
const GIT_COMMIT = /(^|[\s;&|(])git(\s+-{1,2}[\w-]+(?:[= ]\S+)?)*\s+commit\b/;
if (!GIT_COMMIT.test(command)) process.exit(0);

const steps = [
  ['lint', 'npm run lint --silent'],
  ['build', 'npm run build --silent'],
  ['test', 'npm test --silent'],
];

const tail = (s, n = 40) => s.trim().split('\n').slice(-n).join('\n');

for (const [name, cmd] of steps) {
  const r = spawnSync(cmd, { cwd: projectDir, shell: true, encoding: 'utf8', timeout: 100_000 });
  if (r.status !== 0) {
    const out = tail(`${r.stdout || ''}\n${r.stderr || ''}${r.error ? '\n' + r.error.message : ''}`);
    process.stderr.write(
      `pre-commit 훅: ${name} 단계가 실패해서 커밋을 막았습니다.\n` +
      `실패 원인을 고친 뒤 다시 커밋하세요. (직접 확인: npm run check)\n\n${out}\n`
    );
    process.exit(2);
  }
}

process.stdout.write(JSON.stringify({ systemMessage: '✔ pre-commit: lint · build · test 통과' }));
process.exit(0);
