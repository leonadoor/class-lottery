import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseRoster } from '../.test-build/roster.js';
import { drawLottery } from '../.test-build/lottery.js';

test('文本和 Markdown 列表保留前导零，支持常见分隔符和 BOM', () => {
  assert.deepEqual(parseRoster('\uFEFF007,042，318\r\n999、000；111;222'), ['007', '042', '318', '999', '000', '111', '222']);
  assert.deepEqual(parseRoster('- 007\r\n* 042\n+ 318\n'), ['007', '042', '318']);
});

test('不悄悄提取长学号、重复项或带姓名内容中的数字', () => {
  for (const input of ['2026007', '007 同学', '007,007', '# 名单\n007', '']) {
    assert.throws(() => drawLottery(parseRoster(input), 1, 0));
  }
});
