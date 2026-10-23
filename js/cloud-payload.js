import { DISCLAIMER } from "./data.js";
import { scoreJuying } from "./score.js";

export const JUYING_VERSION = "juying-h5-v1";
export const CONSENT_VERSION = "consent-assessment-juying-1";
export const JUYING_SCREEN_TEXT = `${DISCLAIMER}不是诊断。`;
export const JUYING_READER_GAP = "阅读页若尚未重绘巨婴测评，分档说明在 interpretation、sections 与 textFallback。";
export const SCHEMA_VERSION = "1.0.0";
export const ASSESSMENT_ID = "juying";
export const ASSESSMENT_NAME = "巨婴测评";

function chars(value) {
  return Array.from(String(value || ""));
}

/** 云端昵称沿用结果页已确认的称呼，去掉首尾空白后最多 12 个字。 */
export function juyingNickname(value) {
  return chars(String(value || "").trim()).slice(0, 12).join("");
}

function answersOk(list) {
  return Array.isArray(list)
    && list.length === 20
    && list.every((value) => Number.isInteger(value) && value >= 0 && value <= 5);
}

/** 只留下服务端会核对的计算结果。数字和文字都来自 scoreJuying，这里不再加总。 */
export function juyingScore(scored) {
  return {
    total: scored.total,
    mind: scored.mind,
    act: scored.act,
    band: { id: scored.band.id, name: scored.band.name },
    average: scored.average,
    side: scored.side,
  };
}

export function juyingDimensions(scored) {
  return [
    { id: "total", name: "总分", kind: "score", score: scored.total, max: 100, labels: [] },
    { id: "mind", name: "心理特征", kind: "score", score: scored.mind, max: 50, labels: [] },
    { id: "act", name: "行为特征", kind: "score", score: scored.act, max: 50, labels: [] },
  ];
}

export function juyingViewModel(scored, answers) {
  return {
    answers: answers.slice(),
    ...juyingScore(scored),
    rushed: false,
  };
}

export function juyingOutcome(scored) {
  const score = juyingScore(scored);
  return {
    headline: `${score.total} 分 · ${score.band.name}`,
    code: score.band.id,
    label: score.band.name,
    summary: `20 项平均 ${score.average} 分。${score.side}`,
    flags: [score.band.id],
  };
}

/**
 * 把这一次巨婴测评收成统一结果协议。
 * 20 项答案必须是 0–5 的整数。总分、心理、行为、分档、平均分和高低说明只来自 scoreJuying。
 * 不收父母档案、电话、微信或其他资料。失败返回 null，不上传。
 */
export function buildJuyingResult(input) {
  const nickname = juyingNickname(input && input.nickname);
  const answers = input && input.answers;
  if (!nickname || !answersOk(answers)) return null;
  if (!input.reportId || !input.clientSubmissionId || !input.completedAt) return null;

  let scored;
  try {
    scored = scoreJuying(answers);
  } catch {
    return null;
  }

  const answerCopy = answers.slice();
  const score = juyingScore(scored);
  const outcome = juyingOutcome(scored);
  const bandText = scored.band.paragraphs.map((text, index) => ({
    id: `${scored.band.id}-${index + 1}`,
    title: index === 0 ? scored.band.name : null,
    text,
  }));
  const interpretation = [
    { id: "verdict", title: outcome.headline, text: outcome.summary },
    { id: "screen", title: "不是诊断", text: JUYING_SCREEN_TEXT },
    { id: "mind", title: "心理特征", text: `心理特征 ${score.mind} 分，满分 50。` },
    { id: "act", title: "行为特征", text: `行为特征 ${score.act} 分，满分 50。` },
    ...bandText,
  ];
  const recommendations = [
    { id: "screen", title: null, text: JUYING_SCREEN_TEXT },
  ];
  const sections = [
    { t: "h", l: 2, x: outcome.headline },
    { t: "p", x: outcome.summary },
    { t: "p", x: JUYING_SCREEN_TEXT },
    { t: "p", x: `心理特征 ${score.mind} 分，满分 50。行为特征 ${score.act} 分，满分 50。` },
    ...scored.band.paragraphs.map((text) => ({ t: "p", x: text })),
  ];
  const textFallback = sections.map((section) => section.x).join("");

  return {
    reportId: input.reportId,
    assessmentId: ASSESSMENT_ID,
    assessmentName: ASSESSMENT_NAME,
    assessmentVersion: JUYING_VERSION,
    nickname,
    completedAt: input.completedAt,
    dimensions: juyingDimensions(scored),
    result: outcome,
    interpretation,
    recommendations,
    reportContent: {
      format: "view-model+sections",
      viewModel: juyingViewModel(scored, answerCopy),
      sections,
      textFallback,
    },
    extensionData: {
      answers: answerCopy.slice(),
      score,
      quality: { rushed: false },
      consent: {
        agreed: true,
        version: CONSENT_VERSION,
        at: input.completedAt,
        scopes: ["store", "share_link", "mentor_read"],
      },
      compat: {
        level: "partial",
        gaps: [JUYING_READER_GAP],
      },
    },
    source: {
      site: "ASVA 常用心理测试",
      path: "index.html",
      repo: "juying",
      origin: "external-repo",
      pageUrl: "https://xiangshu3721.github.io/juying/",
      clientSubmissionId: input.clientSubmissionId,
      resultKitId: "juying",
      localKey: "juying-session",
    },
    schemaVersion: SCHEMA_VERSION,
  };
}
