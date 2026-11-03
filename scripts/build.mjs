// 빌드: 팀에 배포할 단일 HTML 파일을 dist/에 생성
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { ROOT, readIndex, menuDataText, loadWheelLogic } from './html.mjs';

const html = readIndex();

// 빌드 산출물이 실제로 동작 가능한지 최소 확인
const data = JSON.parse(menuDataText(html));
loadWheelLogic(html);

const outDir = path.join(ROOT, 'dist');
const outFile = path.join(outDir, 'lunch-roulette.html');
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, html, 'utf8');

const kb = (statSync(outFile).size / 1024).toFixed(1);
console.log(`✔ build 완료 → dist/lunch-roulette.html (${kb} KB, 식당 ${data.length}곳)`);
