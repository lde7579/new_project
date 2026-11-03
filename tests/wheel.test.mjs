import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadWheelLogic, readIndex, menuDataText, CATEGORIES } from '../scripts/html.mjs';

const W = loadWheelLogic();
const TAU = Math.PI * 2;

test('targetRotation으로 멈추면 포인터가 정확히 당첨 칸을 가리킨다 (무작위 1000회)', () => {
  for (let i = 0; i < 1000; i++) {
    const n = 2 + Math.floor(Math.random() * 30);
    const winner = Math.floor(Math.random() * n);
    const rotation = (Math.random() - 0.5) * 1000;     // 이전에 많이 돌았던 상태 포함
    const jitter = (Math.random() - 0.5) * 0.8;
    const extra = 5 + Math.floor(Math.random() * 3);
    const target = W.targetRotation(rotation, n, winner, jitter, extra);
    assert.equal(W.indexAtPointer(target, n), winner,
      `n=${n} winner=${winner} rotation=${rotation} jitter=${jitter}`);
  }
});

test('targetRotation은 항상 앞으로(시계방향) extraSpins 바퀴 이상, 한 바퀴 미만 더 돈다', () => {
  for (let i = 0; i < 200; i++) {
    const rotation = Math.random() * 100;
    const extra = 5;
    const t = W.targetRotation(rotation, 7, i % 7, 0, extra);
    assert.ok(t - rotation >= TAU * extra, '최소 회전량 부족');
    assert.ok(t - rotation < TAU * (extra + 1), '최대 회전량 초과');
  }
});

test('indexAtPointer: 회전 0일 때 맨 위는 마지막 1/4 지점의 칸', () => {
  // 칸 0은 0rad(오른쪽)부터 시작 → 위쪽(-90° = 270°)은 n=4일 때 칸 3
  assert.equal(W.indexAtPointer(0, 4), 3);
  assert.equal(W.indexAtPointer(Math.PI / 2, 4), 2);
});

test('isLeftHalf: 왼쪽 절반만 true', () => {
  assert.equal(W.isLeftHalf(0), false);              // 오른쪽
  assert.equal(W.isLeftHalf(Math.PI), true);         // 왼쪽
  assert.equal(W.isLeftHalf(-Math.PI), true);        // 음수 각도
  assert.equal(W.isLeftHalf(Math.PI * 0.4), false);  // 아래 오른쪽
  assert.equal(W.isLeftHalf(Math.PI * 0.6), true);   // 아래 왼쪽
  assert.equal(W.isLeftHalf(TAU * 10 + Math.PI), true);
});

test('normalizeMenus: 공백 제거, 빈 이름/중복 제거, 모르는 카테고리는 기타', () => {
  const out = W.normalizeMenus([
    { name: '  국밥집 ', cat: '한식' },
    { name: '국밥집', cat: '중식' },
    { name: '', cat: '한식' },
    { name: '   ', cat: '한식' },
    null,
    { name: 123, cat: '한식' },
    { name: '수상한 가게', cat: '외계식' },
  ], CATEGORIES);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), [
    { name: '국밥집', cat: '한식' },
    { name: '수상한 가게', cat: '기타' },
  ]);
});

test('normalizeMenus: 배열이 아니면 빈 배열', () => {
  assert.equal(W.normalizeMenus(null, CATEGORIES).length, 0);
  assert.equal(W.normalizeMenus({}, CATEGORIES).length, 0);
});

test('파일에 들어 있는 메뉴판은 정규화해도 그대로 유지된다', () => {
  const data = JSON.parse(menuDataText(readIndex()));
  assert.ok(data.length > 0, '메뉴판이 비어 있음');
  assert.equal(W.normalizeMenus(data, CATEGORIES).length, data.length);
});
