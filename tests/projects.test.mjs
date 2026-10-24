import assert from 'node:assert/strict';
import { test } from 'node:test';
import { drawProjects, PROJECT_ALGORITHM } from '../.test-build/lottery.js';

const roster = ['999', '007', '042', '000', '318'];
const projects = [
  { name: '100 米', capacity: 3, count: 2 },
  { name: '跳远', capacity: 2, count: 1 },
];

test('按项目分配且不兼项，剩余人员与中签人员恰好组成原名单', () => {
  for (let seed = 0; seed < 50; seed++) {
    const result = drawProjects(roster, projects, seed);
    assert.equal(result.count, 3);
    assert.deepEqual(result.projects.map((p) => p.winners.length), [2, 1]);
    const assigned = result.projects.flatMap((p) => p.winners);
    assert.equal(new Set(assigned).size, 3);
    assert.deepEqual([...assigned, ...result.unassigned].sort(), [...roster].sort());
  }
});

test('固定版本分配结果稳定，JSON 记录可重放，不修改输入', () => {
  const frozen = Object.freeze(projects.map((p) => Object.freeze({ ...p })));
  const result = drawProjects(Object.freeze([...roster]), frozen, 12345);
  assert.equal(result.algorithm, PROJECT_ALGORITHM);
  assert.deepEqual(result.projects.map((p) => p.winners), [['042', '318'], ['007']]);
  assert.deepEqual(result.unassigned, ['000', '999']);
  const saved = JSON.parse(JSON.stringify(result));
  assert.deepEqual(drawProjects(saved.candidates.reverse(), saved.projects, saved.seed), result);
  assert.deepEqual(frozen, projects);
});

test('支持零待补人数和恰好分完全部候选人', () => {
  const zero = drawProjects(roster, [{ name: '接力', capacity: 4, count: 0 }], 0);
  assert.deepEqual(zero.projects[0].winners, []);
  assert.equal(zero.unassigned.length, 5);
  const full = drawProjects(roster, [{ name: '接力', capacity: 5, count: 5 }], 0);
  assert.deepEqual(full.unassigned, []);
});

test('拒绝空配置、重复名称、无效上限和超限待补人数', () => {
  const invalid = [[], [null], [{ name: ' ', capacity: 1, count: 1 }],
    [...projects, { ...projects[0], name: ' 100 米 ' }]];
  for (const capacity of [0, -1, 1.5, NaN, Infinity, '2']) {
    invalid.push([{ name: '项目', capacity, count: 0 }]);
  }
  for (const count of [-1, 3, 0.5, NaN, Infinity, '1']) {
    invalid.push([{ name: '项目', capacity: 2, count }]);
  }
  for (const config of invalid) assert.throws(() => drawProjects(roster, config, 0));
});

test('总缺额超过候选人数时整体拒绝，不进行部分分配', () => {
  assert.throws(() => drawProjects(roster, [
    { name: '100 米', capacity: 3, count: 3 },
    { name: '跳远', capacity: 3, count: 3 },
  ], 0), /还缺 1 人/);
});

test('项目分配沿用名单和种子校验', () => {
  assert.throws(() => drawProjects(['007', '007'], projects, 0));
  assert.throws(() => drawProjects(['07'], projects, 0));
  assert.throws(() => drawProjects(roster, projects, -1));
});
