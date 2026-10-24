import './style.css';
import { drawLottery, drawProjects, generateSeed, type ProjectLotteryResult } from './lottery';
import { parseRoster } from './roster';

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id);
  if (!found) throw new Error(`页面缺少元素：${id}`);
  return found as T;
}

const form = element<HTMLFormElement>('lottery-form');
const activity = element<HTMLInputElement>('activity');
const roster = element<HTMLTextAreaElement>('roster');
const fileInput = element<HTMLInputElement>('roster-file');
const projects = element<HTMLDivElement>('projects');
const seed = element<HTMLInputElement>('seed');
const error = element<HTMLParagraphElement>('error');
const result = element<HTMLElement>('result');
let record: (ProjectLotteryResult & { activity: string; drawnAt: string }) | undefined;
let importVersion = 0;
let projectId = 0;

function addProject(name = ''): void {
  const id = ++projectId;
  const row = document.createElement('fieldset');
  row.className = 'project-row';
  const legend = document.createElement('legend');
  legend.textContent = '项目配置';
  row.append(legend);
  const fields = [
    { key: 'name', label: '项目名称', type: 'text', value: name },
    { key: 'capacity', label: '人数上限', type: 'number', value: '1' },
    { key: 'count', label: '待补人数', type: 'number', value: '1' },
  ];
  for (const field of fields) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.id = `project-${id}-${field.key}`;
    input.dataset.field = field.key;
    input.type = field.type;
    input.value = field.value;
    input.required = true;
    if (field.type === 'number') {
      input.min = field.key === 'capacity' ? '1' : '0';
      input.max = '1000';
      input.step = '1';
    } else {
      input.maxLength = 80;
      input.placeholder = '例如：100 米';
    }
    label.htmlFor = input.id;
    label.textContent = field.label;
    wrapper.append(label, input);
    row.append(wrapper);
  }
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'secondary';
  remove.textContent = '删除项目';
  remove.addEventListener('click', () => {
    row.remove();
    clearResult();
    element('add-project').focus();
  });
  row.append(remove);
  projects.append(row);
  clearResult();
  if (!name) row.querySelector('input')?.focus();
}

element('add-project').addEventListener('click', () => addProject());
addProject('100 米');

function clearResult(): void {
  record = undefined;
  result.hidden = true;
  error.hidden = true;
}

function showError(reason: unknown): void {
  error.textContent = reason instanceof Error ? reason.message : '操作失败，请重试。';
  error.hidden = false;
}

form.addEventListener('input', () => {
  importVersion += 1;
  clearResult();
});

element<HTMLButtonElement>('new-seed').addEventListener('click', () => {
  clearResult();
  try {
    seed.value = String(generateSeed());
  } catch {
    showError(new Error('无法生成随机种子，请手动填写。'));
  }
});

fileInput.addEventListener('change', async () => {
  const version = ++importVersion;
  clearResult();
  const file = fileInput.files?.[0];
  if (!file) return;
  try {
    if (file.size > 100_000) throw new Error('名单文件过大，请选择小于 100 KB 的文本文件。');
    const text = await file.text();
    if (version !== importVersion) return;
    const ids = parseRoster(text);
    drawLottery(ids, 0, 0); // 导入时即校验，避免静默丢弃不合规内容。
    roster.value = ids.join('\n');
  } catch (reason) {
    if (version === importVersion) showError(reason);
  } finally {
    if (version === importVersion) fileInput.value = '';
  }
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  importVersion += 1;
  clearResult();
  try {
    const name = activity.value.trim();
    if (!name) throw new Error('请填写活动名称。');
    const selectedSeed = seed.value === '' ? generateSeed() : seed.valueAsNumber;
    const configuration = Array.from(projects.querySelectorAll('fieldset')).map((row) => {
      const field = (key: string) => row.querySelector<HTMLInputElement>(`[data-field="${key}"]`)!;
      return { name: field('name').value, capacity: field('capacity').valueAsNumber, count: field('count').valueAsNumber };
    });
    const draw = drawProjects(parseRoster(roster.value), configuration, selectedSeed);
    record = { ...draw, activity: name, drawnAt: new Date().toISOString() };
    seed.value = String(selectedSeed);
    element('result-summary').textContent = `${name}：从 ${draw.candidates.length} 人中分配 ${draw.count} 人到 ${draw.projects.length} 个项目，每人最多一个项目。`;
    element('assignments').replaceChildren(...draw.projects.map((project) => {
      const section = document.createElement('section');
      const title = document.createElement('h3');
      title.textContent = `${project.name} · 本次 ${project.count} 人 / 上限 ${project.capacity} 人`;
      const list = document.createElement('ul');
      list.className = 'winners';
      for (const id of project.winners) {
        const item = document.createElement('li');
        item.textContent = id;
        list.append(item);
      }
      section.append(title, list);
      if (project.count === 0) {
        const empty = document.createElement('p');
        empty.textContent = '本项目无需补充人员。';
        section.append(empty);
      }
      return section;
    }));
    element('unassigned').textContent = draw.unassigned.join('、') || '所有候选人均已分配。';
    element('result-seed').textContent = `种子：${draw.seed} · 算法：${draw.algorithm}${draw.count === 0 ? ' · 本次未抽取任何人。' : ''}`;
    result.hidden = false;
  } catch (reason) {
    showError(reason);
  }
});

element<HTMLButtonElement>('download').addEventListener('click', () => {
  if (!record) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `lottery-${record.seed}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
