import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawLottery, generateSeed, LOTTERY_ALGORITHM } from '../.test-build/lottery.js';

const roster = ['999', '007', '042', '000', '318'];

test('v1 固定种子的结果保持兼容', () => {
  assert.deepEqual(drawLottery(roster, 5, 12345).winners, ['042', '318', '007', '000', '999']);
});

test('相同输入可复现，输入顺序不影响结果，也不修改原名单', () => {
  const input = Object.freeze([...roster]);
  const result = drawLottery(input, 3, 12345);
  assert.deepEqual(result, drawLottery([...input].reverse(), 3, 12345));
  assert.deepEqual(input, roster);
  assert.equal(result.algorithm, LOTTERY_ALGORITHM);
  assert.deepEqual(result.candidates, ['000', '007', '042', '318', '999']);
  const saved = JSON.parse(JSON.stringify(result));
  assert.deepEqual(drawLottery(saved.candidates, saved.count, saved.seed), result);
});

test('不同种子可产生不同结果', () => {
  const outcomes = new Set(Array.from({ length: 20 }, (_, seed) =>
    JSON.stringify(drawLottery(roster, 3, seed).winners)));
  assert.ok(outcomes.size > 1);
});

test('抽签人数准确，全部来自候选名单且不重复，保留前导零', () => {
  const allIds = Array.from({ length: 1000 }, (_, id) => String(id).padStart(3, '0'));
  for (const seed of [0, 1, 12345, 4294967295]) {
    for (const count of [0, 1, 6, 999, 1000]) {
      const { winners } = drawLottery(allIds, count, seed);
      assert.equal(winners.length, count);
      assert.equal(new Set(winners).size, count);
      assert.ok(winners.every((id) => allIds.includes(id)));
    }
  }
  assert.deepEqual(drawLottery(['007'], 1, 0).winners, ['007']);
  assert.deepEqual(drawLottery(roster, roster.length, 0).winners.sort(), [...roster].sort());
});

test('拒绝空名单、重复学号和非三位数字字符串', () => {
  for (const invalid of [[], ['007', '007'], ['7'], ['0007'], [' 007'], ['007\n'], ['１２３'], ['abc'], [7], new Array(1), null]) {
    assert.throws(() => drawLottery(invalid, 0, 1));
  }
});

test('拒绝无效人数与种子', () => {
  for (const count of [-1, 6, 1.5, NaN, Infinity, '1']) {
    assert.throws(() => drawLottery(roster, count, 0));
  }
  for (const seed of [-1, 4294967296, 1.5, NaN, Infinity, '1']) {
    assert.throws(() => drawLottery(roster, 1, seed));
  }
});

test('自动生成的种子可用于抽签和重放', () => {
  const seed = generateSeed();
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 4294967295);
  assert.deepEqual(drawLottery(roster, 2, seed), drawLottery(roster, 2, seed));
});
