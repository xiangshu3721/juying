import { BANDS, DEGREES, GROUPS } from "./data.js";

export function flatItems() {
  return GROUPS.flatMap((group) => group.items.map((item) => ({
    groupId: group.id,
    group: group.name,
    n: item.n,
    text: item.text,
  })));
}

function assertAnswers(answers) {
  if (!Array.isArray(answers) || answers.length !== 20) {
    throw new Error("需要 20 项的作答");
  }
  answers.forEach((value, index) => {
    if (!Number.isInteger(value) || value < 0 || value > 5) {
      throw new Error(`第 ${index + 1} 项的分数无效`);
    }
  });
}

export function sideNote(mind, act) {
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

export function scoreJuying(answers) {
  assertAnswers(answers);
  const mind = answers.slice(0, 10).reduce((total, value) => total + value, 0);
  const act = answers.slice(10).reduce((total, value) => total + value, 0);
  const total = mind + act;
  const band = BANDS.find((item) => total >= item.min && total <= item.max);
  if (!band) throw new Error("分数落在分档之外");
  const items = flatItems();
  const rows = items.map((item, index) => ({
    ...item,
    score: answers[index],
    label: DEGREES.find((degree) => degree.value === answers[index]).label,
  }));
  const marked = rows.filter((row) => row.score >= 4);
  const average = (Math.round((total / 20) * 100) / 100).toFixed(2);
  return { total, mind, act, band, rows, marked, average, side: sideNote(mind, act) };
}
