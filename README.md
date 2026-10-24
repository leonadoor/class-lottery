# 班级抽签

用于运动会及其他班级活动的抽签网页工具，以学号后三位标识不同同学。

## 当前进度

已接入名单输入、本机文件导入、活动名称、多项目配置、种子生成、按项目分配结果和 JSON 记录下载。每人最多参加一个项目。

在页面输入三位学号（换行、空格、逗号分隔，或 Markdown 无序列表），也可选择本地 `data/list.md` 导入。文件应只含学号列表，不支持姓名表格或完整学号。添加项目，填写各项目名称、人数上限和待补人数后点击「开始抽签」。已报名者应从候选名单中移除，待补人数应扣除已占名额；目前不管理已报名者名单。待补人数不能超过上限，总待补人数超过候选人数时整次抽签会拒绝，并提示缺额。留空种子会自动生成并回填，保留种子可重放，点击「生成新种子」可准备新一轮抽签。

页面不上传名单，也不自动保存到浏览器存储；刷新即清空。下载记录含候选名单，请妥善保管。私人名单文件保持 Git 忽略，不作为网页资源导入或打包。修改输入后旧结果会隐藏，需重新抽签。

采用 Mulberry32 带种子伪随机数生成器与 Fisher–Yates 洗牌，从候选名单中无重复地抽取指定人数。学号后三位按字符串处理，保留 `007` 等号码的前导零。

## 算法使用

页面使用多项目接口：先对全部候选人洗牌一次，再按项目顺序依次分配待补人数，剩余人员列为未分配。复现条件包含项目配置及顺序；下载记录保存全部配置、分配结果和未分配名单。多项目算法独立版本为 `mulberry32-fisher-yates-projects-v1`，原单次抽签接口继续保留。

```ts
import { drawProjects, generateSeed } from './src/lottery';

const result = drawProjects(['007', '042', '318'], [
  { name: '100 米', capacity: 2, count: 1 },
  { name: '跳远', capacity: 2, count: 1 },
], generateSeed());
const replay = drawProjects(result.candidates, result.projects, result.seed);
```

单次抽签接口：

```ts
import { drawLottery, generateSeed } from './src/lottery';

const seed = generateSeed();
const result = drawLottery(['007', '042', '318'], 2, seed);
// result 包含 algorithm、seed、count、candidates、winners。
const replay = drawLottery(result.candidates, result.count, result.seed);
```

名单不能为空，每项必须是三位 ASCII 数字字符串，重复学号会报错。抽取人数允许为 0，不能超过候选人数。种子为 0 到 4294967295 的整数，可自动生成或手动提供。

算法先按学号排序，再洗牌，输入顺序不会影响结果，也不会修改传入的名单。随机下标采用拒绝采样，避免直接取余引入额外偏差。相同算法版本、候选名单、人数和种子得到相同结果；复现时应核对算法版本。

Mulberry32 是非密码学伪随机算法。可复现不等于防操纵，应先确定名单和人数，再公开生成种子，避免反复挑选结果。模块不读取私人名单文件、不上传数据、不自动持久化结果；返回记录包含候选名单，应按私人数据保管。

## 本地开发

需要 Node.js 20.19+（20.x）或 22.12+，以及 npm。

```sh
npm ci
npm run dev
```

打开终端输出的本地地址。

## 检查和构建

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`build` 包含 TypeScript 检查，产物输出到 `dist/`。`preview` 用于本地预览构建结果。

## 项目结构

```text
index.html       中文页面入口
src/main.ts      应用脚本入口
src/lottery.ts   带种子的抽签算法
tests/          使用虚构学号的算法测试
src/style.css    基础样式
tsconfig.json    TypeScript 配置
```

目前无需后端服务或环境变量。不应将真实班级名单、抽签记录或其他个人数据提交到仓库。
