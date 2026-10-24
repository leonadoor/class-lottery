/** 更改随机序列、名单排序或洗牌规则时，必须更新此版本号。 */
export const LOTTERY_ALGORITHM = 'mulberry32-fisher-yates-v1' as const;

export interface LotteryResult {
  algorithm: typeof LOTTERY_ALGORITHM;
  seed: number;
  count: number;
  candidates: string[];
  winners: string[];
}

const UINT32_RANGE = 0x1_0000_0000;

export const PROJECT_ALGORITHM = 'mulberry32-fisher-yates-projects-v1' as const;

export interface LotteryProject {
  name: string;
  capacity: number;
  count: number;
}

export interface ProjectLotteryResult {
  algorithm: typeof PROJECT_ALGORITHM;
  seed: number;
  count: number;
  candidates: string[];
  projects: (LotteryProject & { winners: string[] })[];
  unassigned: string[];
}

/** 一次洗牌，按项目顺序分段分配。项目顺序也是复现条件之一。 */
export function drawProjects(
  candidates: readonly string[],
  projects: readonly LotteryProject[],
  seed: number,
): ProjectLotteryResult {
  if (!Array.isArray(projects) || projects.length === 0) {
    throw new Error('请至少添加一个项目。');
  }
  const names = new Set<string>();
  const normalized = Array.from(projects, (project) => {
    if (!project || typeof project.name !== 'string' || !project.name.trim()) {
      throw new Error('每个项目都需要填写名称。');
    }
    const name = project.name.trim();
    if (names.has(name)) throw new Error('项目名称不能重复。');
    names.add(name);
    if (!Number.isSafeInteger(project.capacity) || project.capacity < 1) {
      throw new Error('项目人数上限必须为正整数。');
    }
    if (!Number.isSafeInteger(project.count) || project.count < 0 || project.count > project.capacity) {
      throw new Error('项目待补人数必须是零到人数上限之间的整数。');
    }
    return { name, capacity: project.capacity, count: project.count };
  });
  // 沿用 v1 名单与种子校验，整份名单只洗牌一次。
  const draw = drawLottery(candidates, candidates?.length, seed);
  const total = normalized.reduce((sum, project) => sum + project.count, 0);
  if (!Number.isSafeInteger(total) || total > draw.candidates.length) {
    throw new Error(`项目共需 ${total} 人，候选名单仅 ${draw.candidates.length} 人，还缺 ${total - draw.candidates.length} 人。请调整待补人数或候选名单。`);
  }
  let offset = 0;
  const assignments = normalized.map((project) => {
    const winners = draw.winners.slice(offset, offset + project.count);
    offset += project.count;
    return { ...project, winners };
  });
  return {
    algorithm: PROJECT_ALGORITHM,
    seed,
    count: total,
    candidates: draw.candidates,
    projects: assignments,
    unassigned: draw.winners.slice(offset),
  };
}

/** 使用浏览器随机源产生种子；保留返回值即可重放抽签。 */
export function generateSeed(): number {
  return globalThis.crypto.getRandomValues(new Uint32Array(1))[0];
}

/** Mulberry32：返回无符号 32 位整数，不用于密码学用途。 */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  };
}

/** 拒绝不能均分的尾部区间，避免直接取余引入额外偏差。 */
function randomBelow(random: () => number, bound: number): number {
  const limit = UINT32_RANGE - (UINT32_RANGE % bound);
  let value: number;
  do {
    value = random();
  } while (value >= limit);
  return value % bound;
}

/**
 * 名单按三位学号排序后洗牌，因此输入顺序不影响结果。
 * 不修改调用方的名单；不读取文件、不保存或发送个人数据。
 */
export function drawLottery(
  candidates: readonly string[],
  count: number,
  seed: number,
): LotteryResult {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('候选名单不能为空。');
  }
  // Array.from 也会将稀疏数组的空位交给校验。
  const normalized = Array.from(candidates, (id) => {
    if (typeof id !== 'string' || id.length !== 3 || !/^[0-9]{3}$/.test(id)) {
      throw new Error('每个学号必须是恰好三位的阿拉伯数字字符串。');
    }
    return id;
  });
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('候选名单中存在重复学号。');
  }
  if (!Number.isInteger(count) || count < 0 || count > normalized.length) {
    throw new Error('抽取人数必须是零到候选人数之间的整数。');
  }
  if (!Number.isInteger(seed) || seed < 0 || seed >= UINT32_RANGE) {
    throw new Error('种子必须是 0 到 4294967295 之间的整数。');
  }

  normalized.sort();
  const shuffled = [...normalized];
  const random = createRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = randomBelow(random, index + 1);
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }

  return {
    algorithm: LOTTERY_ALGORITHM,
    seed,
    count,
    candidates: normalized,
    winners: shuffled.slice(0, count),
  };
}
