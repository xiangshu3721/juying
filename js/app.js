import { BANDS, DEGREES, DISCLAIMER, GROUPS, REFERENCE_INTRO } from "./data.js";
import { scoreJuying } from "./score.js";

const app = document.querySelector("#app");
const STORAGE = "juying-session";
const RK = window.ResultKit;

const state = {
  step: "cover",
  answers: Array(20).fill(null),
  warned: false,
};

function load() {
  try {
    const raw = sessionStorage.getItem(STORAGE);
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.answers) || saved.answers.length !== 20) return;
    state.answers = saved.answers.map((value) => (
      Number.isInteger(value) && value >= 0 && value <= 5 ? value : null
    ));
    state.step = saved.step === "report" && complete() ? "report" : (saved.step === "form" ? "form" : "cover");
    if (saved.step === "report" && !complete()) state.step = "form";
  } catch {
    sessionStorage.removeItem(STORAGE);
  }
}

function save() {
  try {
    sessionStorage.setItem(STORAGE, JSON.stringify({
      step: state.step,
      answers: state.answers,
    }));
  } catch {
    /* 这台设备若禁用了会话存储，当次作答仍然有效。 */
  }
}

function complete() {
  return state.answers.every((value) => value != null);
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));
}

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function summarize() {
  const result = scoreJuying(state.answers);
  const tone = result.band.id === "mature" ? "ok" : result.band.id === "partial" ? "mid" : "high";
  return {
    headline: `${result.total} 分 · ${result.band.name}`,
    sub: `20 项平均 ${result.average} 分。${result.side} ${DISCLAIMER}`,
    metrics: [
      { label: "总分", value: `${result.total} / 100`, frac: result.total / 100, tone },
      { label: "心理特征", value: `${result.mind} / 50`, frac: result.mind / 50, tone },
      { label: "行为特征", value: `${result.act} / 50`, frac: result.act / 50, tone },
    ],
    notes: result.marked.slice(0, 5).map((row) => `${row.group} ${row.n}：${row.text}（${row.score} · ${row.label}）`),
  };
}

function recordResult() {
  if (RK && complete()) RK.save(summarize(), { key: state.answers.join(",") });
}

function restart() {
  if (RK) RK.nickReset();
  state.answers = Array(20).fill(null);
  state.step = "form";
  state.warned = false;
  save();
  render();
  scrollTop();
}

function tallyText() {
  const done = state.answers.filter((value) => value != null).length;
  const sum = state.answers.reduce((total, value) => total + (value ?? 0), 0);
  if (!done) return "20 项都还没打";
  if (done < 20) return `已打 ${done} / 20。已打的加起来是 ${sum} 分`;
  return `20 项都打完了，合计 ${sum} 分`;
}

function shell(inner) {
  return `<main class="frame"><article class="sheet">${inner}</article></main>`;
}

function renderCover() {
  return shell(`
    <h1>巨婴测评</h1>
    <p class="lead">共 20 项。每一项按 0 到 5 打分，再把全部分数相加。0 分是一点也不像，5 分是与我一样，中间按程度打。</p>
    <p class="lead quiet">前 10 项看心理特征，后 10 项看行为特征。打完以后，结果页再按总分说明落在哪一档。</p>
    <p class="meta">20 项 · 每项 0 到 5 分 · 满分 100</p>
    <div class="actions">
      <button class="primary" type="button" data-action="start">开始打分</button>
      ${RK ? RK.historyButton({ className: "ghost" }) : ""}
      <a class="ghost" href="https://xiangshu3721.github.io/mindtest-web/">回到目录</a>
    </div>
    <p class="fine">${esc(DISCLAIMER)} 作答留在这台设备上，不会上传。结果用来对照讲座，不是诊断。</p>
  `);
}

function scaleButtons(answer, label) {
  return DEGREES.map((degree) => `
    <button type="button" data-score="${degree.value}" aria-checked="${answer === degree.value}" aria-label="${degree.value} 分，${esc(degree.label)}。${esc(label)}">
      ${degree.value}
    </button>
  `).join("");
}

function renderForm() {
  const legend = DEGREES.map((degree) => `<span><b>${degree.value}</b> ${esc(degree.label)}</span>`).join("");
  const groups = GROUPS.map((group, groupIndex) => {
    const items = group.items.map((item, itemIndex) => {
      const index = groupIndex * 10 + itemIndex;
      const answer = state.answers[index];
      const picked = answer == null ? "选 0 到 5" : DEGREES.find((degree) => degree.value === answer).label;
      return `
        <li class="item" id="item-${index}" data-item="${index}">
          <p><span>${item.n}</span>${esc(item.text)}</p>
          <div class="scale" role="radiogroup" aria-label="${esc(group.name)}第 ${item.n} 项">${scaleButtons(answer, item.text)}</div>
          <p class="picked${answer == null ? " empty" : ""}" data-picked>${esc(picked)}</p>
        </li>
      `;
    }).join("");
    return `
      <section class="group">
        <h2>${esc(group.name)}</h2>
        <p class="about">${esc(group.about)} 这一组满分 50。</p>
        <ol>${items}</ol>
      </section>
    `;
  }).join("");
  return shell(`
    <header class="bar">
      <h1>巨婴测评</h1>
      <p data-tally>${esc(tallyText())}</p>
    </header>
    <div class="legend">${legend}</div>
    ${groups}
    <p class="hint" data-hint role="alert"></p>
    <div class="actions">
      <button class="primary" type="button" data-action="submit">查看结果</button>
      <a class="ghost" href="https://xiangshu3721.github.io/mindtest-web/">回到目录</a>
    </div>
  `);
}

function renderReport() {
  const result = scoreJuying(state.answers);
  const reduce = reduceMotion();
  const cuts = BANDS.map((band) => `
    <div class="${band.id === result.band.id ? "on" : ""}">
      <dt>${esc(band.range)}</dt>
      <dd>${esc(band.name)}${band.id === result.band.id ? " · 你在这里" : ""}</dd>
    </div>
  `).join("");
  const jumps = BANDS.map((band) => `
    <a href="#band-${band.id}" class="${band.id === result.band.id ? "on" : ""}">${esc(band.name)}</a>
  `).join("");
  const bands = BANDS.map((band) => {
    const yours = band.id === result.band.id;
    const paragraphs = band.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
    return `
      <section class="band${yours ? " on" : ""}" id="band-${band.id}">
        ${yours ? `<p class="you">你在这一档 · 总分 ${result.total}</p>` : ""}
        <h3>${esc(band.name)}</h3>
        <p class="range">${esc(band.range)} · ${esc(band.source)}</p>
        ${paragraphs}
      </section>
    `;
  }).join("");
  const intro = REFERENCE_INTRO.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("");
  const marked = result.marked.length
    ? `<p>4 分是很像，5 分是与我一样。读分档时对着这几条看，它们比总分更具体。</p>
      <ul class="high">${result.marked.map((row) => `
        <li>
          <b>${esc(row.group)} ${row.n}</b>
          <span>${esc(row.text)}</span>
          <em>${row.score} · ${esc(row.label)}</em>
        </li>
      `).join("")}</ul>`
    : `<p>没有单项达到 4 分。分数是很多「不太像」「有一点像」「有些像」加出来的，不是集中在某几项上。分档仍然按总分，不按某一项。</p>`;
  const ledger = GROUPS.map((group) => {
    const rows = result.rows.filter((row) => row.groupId === group.id);
    const sum = group.id === "mind" ? result.mind : result.act;
    return `
      <section class="ledger-group">
        <h3>${esc(group.name)} <span>${sum} / 50</span></h3>
        <ol>${rows.map((row) => `
          <li class="${row.score >= 4 ? "hot" : ""}">
            <b>${row.n}</b>
            <span>${esc(row.text)}</span>
            <em>${row.score} · ${esc(row.label)}</em>
          </li>
        `).join("")}</ol>
      </section>
    `;
  }).join("");

  return shell(`
    <p class="backline"><a href="https://xiangshu3721.github.io/mindtest-web/">目录</a></p>
    <h1>${result.total} 分 · ${esc(result.band.name)}</h1>
    <p class="lead">20 项平均 ${result.average} 分。0 是一点也不像，2 是有一点像，3 是有些像，4 是很像，5 是与我一样。</p>
    <div class="ruler" role="img" aria-label="总分 ${result.total}，位于${esc(result.band.range)}的${esc(result.band.name)}">
      <div class="track">
        ${BANDS.map((band, index) => `<span class="zone ${band.id === result.band.id ? "on" : ""}" style="flex:${[40, 19, 21, 20][index]}"></span>`).join("")}
        <i class="needle" style="--p:${reduce ? result.total : 0}"></i>
      </div>
      <div class="ticks" aria-hidden="true">
        <span style="left:0">0</span>
        <span style="left:40%">40</span>
        <span style="left:59%">59</span>
        <span style="left:80%">80</span>
        <span class="end">100</span>
      </div>
    </div>
    <p class="fine">${esc(DISCLAIMER)}</p>
    <h2>你的答卷怎么分布</h2>
    <p>心理特征 ${result.mind} 分，满分 50。行为特征 ${result.act} 分，满分 50。${esc(result.side)}</p>
    <h2>打到 4 分和 5 分的项</h2>
    ${marked}
    <h2 id="ref">分值参考</h2>
    ${intro}
    <dl class="cuts">${cuts}</dl>
    <p class="jumps">写开在下面：${jumps}</p>
    ${bands}
    <h2>逐项分数</h2>
    <p class="about">0 到 5 都列在这里。4 分和 5 分用深色标出。</p>
    ${ledger}
    ${RK ? RK.bar(summarize(), { restart: false }) : ""}
    <div class="actions">
      <button class="ghost" type="button" data-action="reset">重新测试</button>
      <a class="ghost" href="https://xiangshu3721.github.io/mindtest-web/">回到目录</a>
    </div>
    <p class="fine">作答留在这台设备上。分数只和这 20 项有关，不和其他测评相加。</p>
  `);
}

function render() {
  // 昵称门槛：打分页（含刷新恢复、重新测试）没确认过昵称就先补录；点「返回」回封面
  if (RK) RK.guard(state.step === "form", () => { state.step = "cover"; save(); render(); });
  const view = { cover: renderCover, form: renderForm, report: renderReport }[state.step];
  app.innerHTML = view();
  if (state.step === "report") moveNeedle();
  const focus = app.querySelector("h1");
  if (focus && state.step !== "form") focus.setAttribute("tabindex", "-1");
}

function moveNeedle() {
  if (reduceMotion()) return;
  const needle = app.querySelector(".needle");
  if (!needle || !complete()) return;
  const total = state.answers.reduce((sum, value) => sum + value, 0);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => needle.style.setProperty("--p", String(total)));
  });
}

function paintAnswer(index, value) {
  state.answers[index] = value;
  save();
  const item = app.querySelector(`[data-item="${index}"]`);
  if (!item) return;
  item.classList.remove("missing");
  item.querySelectorAll("[data-score]").forEach((button) => {
    button.setAttribute("aria-checked", Number(button.dataset.score) === value ? "true" : "false");
  });
  const picked = item.querySelector("[data-picked]");
  const label = DEGREES.find((degree) => degree.value === value).label;
  picked.textContent = label;
  picked.classList.remove("warn", "empty");
  const tally = app.querySelector("[data-tally]");
  if (tally) tally.textContent = tallyText();
  if (!state.warned) return;
  const missing = state.answers.filter((answer) => answer == null).length;
  const hint = app.querySelector("[data-hint]");
  if (!hint) return;
  hint.textContent = missing
    ? `还有 ${missing} 项没打分。0 分也要选，不选和打 0 分不是一回事。`
    : "20 项都有分数了，可以查看结果。";
}

function warnMissing() {
  state.warned = true;
  const missing = [];
  state.answers.forEach((value, index) => {
    const item = app.querySelector(`[data-item="${index}"]`);
    if (!item) return;
    if (value == null) {
      missing.push(item);
      item.classList.add("missing");
      const picked = item.querySelector("[data-picked]");
      picked.textContent = "这项还没打分";
      picked.classList.add("warn");
    }
  });
  const hint = app.querySelector("[data-hint]");
  hint.textContent = `还有 ${missing.length} 项没打分。0 分也要选，不选和打 0 分不是一回事。`;
  const behavior = reduceMotion() ? "auto" : "smooth";
  missing[0].scrollIntoView({ behavior, block: "center" });
  const firstButton = missing[0].querySelector("[data-score]");
  if (firstButton) firstButton.focus();
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: "auto" });
}

function onClick(event) {
  const scoreButton = event.target.closest("[data-score]");
  if (scoreButton && state.step === "form") {
    const item = scoreButton.closest("[data-item]");
    paintAnswer(Number(item.dataset.item), Number(scoreButton.dataset.score));
    return;
  }
  const action = event.target.closest("[data-action]");
  if (!action) return;
  if (action.dataset.action === "start") {
    const begin = () => {
      state.step = "form";
      state.warned = false;
      save();
      render();
      scrollTop();
    };
    if (RK) RK.ensureNick(begin);
    else begin();
  }
  if (action.dataset.action === "submit") {
    if (!complete()) {
      warnMissing();
      return;
    }
    state.step = "report";
    state.warned = false;
    recordResult();
    save();
    render();
    scrollTop();
  }
  if (action.dataset.action === "reset") restart();
}

function onKey(event) {
  const button = event.target.closest("[data-score]");
  if (!button) return;
  const forward = event.key === "ArrowRight" || event.key === "ArrowDown";
  const back = event.key === "ArrowLeft" || event.key === "ArrowUp";
  if (!forward && !back) return;
  event.preventDefault();
  const buttons = [...button.parentElement.querySelectorAll("[data-score]")];
  const index = buttons.indexOf(button);
  const next = buttons[index + (forward ? 1 : -1)];
  if (!next) return;
  next.click();
  next.focus();
}

if (RK) RK.configure({ id: "juying", title: "巨婴测评", start: ["[data-action=start]"], onRestart: restart, capture: () => RK.capture(app.querySelector(".sheet") || app, { skip: ".actions" }) });
load();
app.addEventListener("click", onClick);
app.addEventListener("keydown", onKey);
render();
