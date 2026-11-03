// index.html에서 스크립트/데이터 블록을 꺼내는 공용 헬퍼 (lint, build, test에서 사용)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const INDEX = path.join(ROOT, 'index.html');
export const CATEGORIES = ['한식', '중식', '일식', '양식', '분식', '기타'];
export const MENU_DATA_OPEN = '<script id="menuData" type="application/json">';

export const readIndex = () => readFileSync(INDEX, 'utf8');

/** 모든 <script> 블록: { attrs, code, line } */
export function scriptBlocks(html) {
  const out = [];
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const line = html.slice(0, m.index).split('\n').length;
    out.push({ attrs: m[1].trim(), code: m[2], line });
  }
  return out;
}

export const jsBlocks = (html) =>
  scriptBlocks(html).filter(b => !/type="application\/json"/.test(b.attrs));

export function menuDataText(html) {
  const b = scriptBlocks(html).find(b => b.attrs.includes('id="menuData"'));
  return b ? b.code.trim() : null;
}

/** <script id="wheelLogic"> 블록을 격리된 VM에서 실행해 WheelLogic 객체를 돌려줌 */
export function loadWheelLogic(html = readIndex()) {
  const b = scriptBlocks(html).find(b => b.attrs.includes('id="wheelLogic"'));
  if (!b) throw new Error('index.html에 <script id="wheelLogic"> 블록이 없습니다');
  return vm.runInNewContext(`${b.code}\n;WheelLogic`, {}, { filename: 'wheelLogic.js' });
}
