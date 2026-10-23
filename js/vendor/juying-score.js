/** 巨婴测评计分。20 项 0–5，与 juying `js/score.js`、`js/data.js` 的分档一致。
 * 前 10 项是心理特征 mind，后 10 项是行为特征 act，总分 total = mind + act，满分 100。
 * 这是讲座对照，不是诊断。
 */
export const ITEM_COUNT = 20;
export const JUYING_VERSION = "juying-h5-v1";
export const JUYING_CONSENT_VERSION = "consent-assessment-juying-1";
export const JUYING_ID = "juying";
export const JUYING_NAME = "巨婴测评";
export const JUYING_SCREEN = "这是讲座对照，不是诊断，也不是心理评估。";
export const JUYING_DISCLAIMER = "非严肃科学，仅供讲座听众理解学习。";
export const JUYING_READER_GAP = "阅读页若尚未重绘巨婴测评，总分、心理特征、行为特征和分档在 dimensions、result 与 textFallback。这不是诊断。";

export const DEGREES = [
  { value: 0, label: "一点也不像" },
  { value: 1, label: "不太像" },
  { value: 2, label: "有一点像" },
  { value: 3, label: "有些像" },
  { value: 4, label: "很像" },
  { value: 5, label: "与我一样" },
];

export const GROUPS = [
  {
    id: "mind",
    name: "心理特征",
    items: [
      { n: 1, text: "求认可，求关注。" },
      { n: 2, text: "情感依赖性，不能独立。" },
      { n: 3, text: "情感退行（孩子气）。情绪一来，退回小孩子的样子。" },
      { n: 4, text: "不承担责任（我都对，都是你的错）。" },
      { n: 5, text: "权威对抗，分隐形和显性两类。对抗父母，对抗老师，对抗领导。隐形是表面答应、心里不认；显性是当面顶。" },
      { n: 6, text: "容易放弃，自暴自弃。" },
      { n: 7, text: "任性。成年人的任性，以自己的感受为中心。" },
      { n: 8, text: "不能深刻地理解自己，理解他人，理解社会。没有深刻的情感体验。" },
      { n: 9, text: "边界不清，自我认知有缺陷。" },
      { n: 10, text: "情绪不稳定。易怒，包括路怒，以及在家庭、工作场合发作。" },
    ],
  },
  {
    id: "act",
    name: "行为特征",
    items: [
      { n: 1, text: "冲动、草率，不顾后果。" },
      { n: 2, text: "缺乏独立承担责任的能力，需要依靠，无法独立完成一件事。" },
      { n: 3, text: "不负责任，逃避责任，推卸责任。" },
      { n: 4, text: "做事虎头蛇尾，不坚持。三分钟热度，缺乏韧性。" },
      { n: 5, text: "做事凭感觉，耍小聪明。" },
      { n: 6, text: "交流有障碍，不懂倾听。" },
      { n: 7, text: "会宠不会爱。比如宠自己睡懒觉，并不一定懂怎样对自己好，只是惯着自己。" },
      { n: 8, text: "懒惰，不爱深刻思考。或者只爱思考，只想，不行动。" },
      { n: 9, text: "肤浅。只喜欢高光、美好的一面，不注重付出。比如爱吃饭，不爱刷碗。" },
      { n: 10, text: "好奇心重，但胆子小。爱惹麻烦，不能摆平麻烦。" },
    ],
  },
];

export const BANDS = [
  {
    id: "mature",
    min: 0,
    max: 40,
    name: "心智成熟",
    range: "40 分及以下",
    source: "原稿：40 分以下，心智成熟。",
    paragraphs: [
      "这一档表示，这 20 项里你觉得像自己的并不多。心智成熟不是没有情绪，也不是从不依靠别人。它是说：你大体能自己把一件事站住，也分得清哪件事是自己的、哪件事是别人的。",
      "0 到 40 分，平均每项不超过 2 分。2 分的意思是「有一点像」。40 分整，刚好是 20 项都打 2 分，仍算心智成熟。再多 1 分，到 41，就进入下一档。",
    ],
  },
  {
    id: "partial",
    min: 41,
    max: 59,
    name: "有部分巨婴特质",
    range: "41–59 分",
    source: "原稿：有部分巨婴特质，在工作或者情感中体现。",
    paragraphs: [
      "这一档的关键词是「部分」，而且原稿点明了场合：工作，或者情感。你不是整个人停在儿童的位置上。有几项特质比较明显，常常只在一个场合露出来，换一个场合又不怎么像。",
      "41 到 59 分，平均在每项 2 分多到将近 3 分之间。这一档既不要收成「我还好、可以不看」，也不要收成「我就是巨婴」。",
    ],
  },
  {
    id: "infant",
    min: 60,
    max: 80,
    name: "巨婴",
    range: "60–80 分",
    source: "原稿：巨婴。",
    paragraphs: [
      "这一档叫巨婴。这里的巨婴不是年纪小，也不是可爱。它是长在成人生活里的一套儿童位置：要被认可，要被照顾；出事了先觉得自己都对、是别人的错。",
      "60 到 80 分含 80 分。80 分整仍是这一档。81 分起才叫儿童状态。",
    ],
  },
  {
    id: "child",
    min: 81,
    max: 100,
    name: "儿童状态",
    range: "81 分及以上",
    source: "原稿：80 分以上，儿童状态。80 分整仍属上一档，从 81 分起算。",
    paragraphs: [
      "81 分及以上，叫儿童状态。平均每项超过 4 分。81 分是刚过线，100 分是 20 项全部打满。",
      "儿童状态不是医学上的发育诊断，也不是说智力、学历或办事能力等于儿童。它说的是位置：做决定、扛后果、理解别人，主要还停在「我现在什么感觉」上。",
    ],
  },
];

const DEGREE_LABEL = Object.fromEntries(DEGREES.map((item) => [item.value, item.label]));

export function juyingAnswersOk(list) {
  return Array.isArray(list)
    && list.length === ITEM_COUNT
    && list.every((value) => Number.isInteger(value) && value >= 0 && value <= 5);
}

export function juyingSide(mind, act) {
  const diff = mind - act;
  const gap = Math.abs(diff);
  if (gap < 4) {
    return "心理特征和行为特征差不多高。你怎么想、你怎么做，在这份答卷里分量接近。";
  }
  const higher = diff > 0 ? "心理特征" : "行为特征";
  const lower = diff > 0 ? "行为特征" : "心理特征";
  const tone = gap >= 8 ? "明显更高" : "略高一些";
  const tail = diff > 0
    ? "更多体现在感受、关系和对自己的看法上；做事那一组相对没有这么高。"
    : "更多体现在做事的方式上，比如冲动、虎头蛇尾、靠别人收尾；感受和关系那一组相对没有这么高。";
  return `${higher}比${lower}${tone}，差 ${gap} 分。${tail}`;
}

export function juyingBand(total) {
  return BANDS.find((item) => total >= item.min && total <= item.max) || null;
}

export function flatItems() {
  return GROUPS.flatMap((group) => group.items.map((item) => ({
    groupId: group.id,
    group: group.name,
    n: item.n,
    text: item.text,
  })));
}

export function scoreJuying(answers) {
  if (!juyingAnswersOk(answers)) throw new Error("作答需要 20 道 0–5 的整数题");
  const mind = answers.slice(0, 10).reduce((total, value) => total + value, 0);
  const act = answers.slice(10).reduce((total, value) => total + value, 0);
  const total = mind + act;
  const found = juyingBand(total);
  if (!found) throw new Error("分数落在分档之外");
  const band = {
    id: found.id,
    name: found.name,
    min: found.min,
    max: found.max,
    range: found.range,
    source: found.source,
  };
  const marked = flatItems()
    .map((item, index) => ({
      ...item,
      score: answers[index],
      label: DEGREE_LABEL[answers[index]],
    }))
    .filter((item) => item.score >= 4);
  const average = (Math.round((total / ITEM_COUNT) * 100) / 100).toFixed(2);
  return { total, mind, act, band, marked, average, side: juyingSide(mind, act) };
}

function storedScore(scored) {
  return {
    total: scored.total,
    mind: scored.mind,
    act: scored.act,
    band: { ...scored.band },
    average: scored.average,
    side: scored.side,
  };
}

export function juyingDimensions(scored) {
  return [
    {
      id: "total",
      name: "总分",
      kind: "score",
      score: scored.total,
      raw: scored.total,
      max: 100,
      level: scored.band.id,
      levelLabel: scored.band.name,
      narrative: scored.band.range,
      labels: [],
    },
    {
      id: "mind",
      name: "心理特征",
      kind: "score",
      score: scored.mind,
      raw: scored.mind,
      max: 50,
      level: null,
      levelLabel: null,
      narrative: "前 10 项相加，看感受、关系和自我认知。",
      labels: [],
    },
    {
      id: "act",
      name: "行为特征",
      kind: "score",
      score: scored.act,
      raw: scored.act,
      max: 50,
      level: null,
      levelLabel: null,
      narrative: "后 10 项相加，看做事、扛事，以及能不能把一件事做完。",
      labels: [],
    },
  ];
}

export function juyingOutcome(scored) {
  return {
    headline: `${scored.band.name} · ${scored.total} 分`,
    code: scored.band.id,
    label: scored.band.name,
    summary: `${scored.side}${JUYING_SCREEN}`,
    flags: [],
  };
}

export function juyingInterpretation(scored) {
  const found = BANDS.find((item) => item.id === scored.band.id);
  const blocks = [
    { id: "verdict", title: scored.band.name, text: juyingOutcome(scored).summary },
    { id: "screen", title: "不是诊断", text: JUYING_SCREEN },
    { id: "disclaimer", title: null, text: JUYING_DISCLAIMER },
    { id: "range", title: scored.band.range, text: scored.band.source },
  ];
  found.paragraphs.forEach((text, index) => {
    blocks.push({ id: `band-${index + 1}`, title: null, text });
  });
  if (scored.marked.length) {
    const lines = scored.marked.map((item) => `${item.group} ${item.n}. ${item.text}${item.label}（${item.score}）`).join("；");
    blocks.push({ id: "marked", title: "4 分和 5 分", text: lines });
  } else {
    blocks.push({ id: "marked", title: "4 分和 5 分", text: "这次没有 4 分或 5 分的项目。" });
  }
  return blocks;
}

export function juyingRecommendations() {
  return [
    { id: "screen", title: null, text: JUYING_SCREEN },
    { id: "disclaimer", title: null, text: JUYING_DISCLAIMER },
    { id: "reader", title: null, text: JUYING_READER_GAP },
  ];
}

export function juyingViewModel(scored, answers, rushed) {
  return {
    answers: answers.slice(),
    total: scored.total,
    mind: scored.mind,
    act: scored.act,
    band: { ...scored.band },
    average: scored.average,
    side: scored.side,
    marked: scored.marked.map((item) => ({ ...item })),
    rushed: Boolean(rushed),
  };
}

export function juyingSections(scored) {
  const outcome = juyingOutcome(scored);
  return [
    { t: "h", l: 2, x: outcome.headline },
    { t: "p", x: outcome.summary },
    { t: "p", x: JUYING_SCREEN },
    { t: "p", x: JUYING_DISCLAIMER },
    { t: "p", x: `心理特征 ${scored.mind} / 50。行为特征 ${scored.act} / 50。` },
  ];
}

export function juyingBodyParts(answers, rushed) {
  const scored = scoreJuying(answers);
  const sections = juyingSections(scored);
  return {
    dimensions: juyingDimensions(scored),
    result: juyingOutcome(scored),
    interpretation: juyingInterpretation(scored),
    recommendations: juyingRecommendations(),
    reportContent: {
      format: "view-model+sections",
      viewModel: juyingViewModel(scored, answers, rushed),
      sections,
      textFallback: sections.map((section) => section.x).join(""),
    },
    score: storedScore(scored),
  };
}
