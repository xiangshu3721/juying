/** 巨婴测评上传体。与 mindtest-web `juying-payload.mjs` 的 buildJuyingResult 一致。
 * 计分、分档短文、解释和建议来自同目录的 vendor/juying-score.js（juyingBodyParts）。
 * 结果页仍用 js/score.js 的 scoreJuying：那里有逐项 rows 和页面上的长文，不放进上传体。
 */
import {
  JUYING_CONSENT_VERSION,
  JUYING_DISCLAIMER,
  JUYING_ID,
  JUYING_NAME,
  JUYING_READER_GAP,
  JUYING_SCREEN,
  JUYING_VERSION,
  juyingAnswersOk,
  juyingBodyParts,
  juyingDimensions,
  juyingOutcome,
  juyingViewModel,
} from "./vendor/juying-score.js";

export {
  JUYING_CONSENT_VERSION,
  JUYING_DISCLAIMER,
  JUYING_ID,
  JUYING_NAME,
  JUYING_READER_GAP,
  JUYING_SCREEN,
  JUYING_VERSION,
  juyingAnswersOk,
  juyingBodyParts,
  juyingDimensions,
  juyingOutcome,
  juyingViewModel,
};

export const ASSESSMENT_NAME = JUYING_NAME;
export const ASSESSMENT_ID = JUYING_ID;
export const CONSENT_VERSION = JUYING_CONSENT_VERSION;
export const JUYING_SCREEN_TEXT = JUYING_SCREEN;
export const SCHEMA_VERSION = "1.0.0";

function chars(value) {
  return Array.from(String(value || ""));
}

export function juyingNickname(value) {
  return chars(String(value || "").trim()).slice(0, 12).join("");
}

function phoneNickname(value) {
  return /(?:^|[^\d])1[3-9]\d{9}(?:$|[^\d])/.test(value);
}

export function buildJuyingResult(input) {
  const nickname = juyingNickname(input && input.nickname);
  const answers = input && input.answers;
  if (!nickname || phoneNickname(nickname) || !juyingAnswersOk(answers)) return null;
  if (!input.reportId || !input.clientSubmissionId || !input.completedAt) return null;

  let parts;
  try {
    parts = juyingBodyParts(answers, Boolean(input.rushed));
  } catch {
    return null;
  }

  return {
    reportId: input.reportId,
    assessmentId: JUYING_ID,
    assessmentName: ASSESSMENT_NAME,
    assessmentVersion: JUYING_VERSION,
    nickname,
    completedAt: input.completedAt,
    dimensions: parts.dimensions,
    result: parts.result,
    interpretation: parts.interpretation,
    recommendations: parts.recommendations,
    reportContent: parts.reportContent,
    extensionData: {
      answers: answers.slice(),
      score: parts.score,
      quality: { rushed: Boolean(input.rushed) },
      consent: {
        agreed: true,
        version: JUYING_CONSENT_VERSION,
        at: input.completedAt,
        scopes: ["store", "share_link", "mentor_read"],
      },
      compat: {
        level: "partial",
        gaps: [JUYING_READER_GAP],
      },
    },
    source: {
      site: JUYING_NAME,
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
