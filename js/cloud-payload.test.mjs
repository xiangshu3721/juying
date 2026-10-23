import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { scoreJuying } from "./score.js";
import {
  ASSESSMENT_ID,
  ASSESSMENT_NAME,
  CONSENT_VERSION,
  JUYING_DISCLAIMER,
  JUYING_READER_GAP,
  JUYING_SCREEN,
  JUYING_SCREEN_TEXT,
  JUYING_VERSION,
  SCHEMA_VERSION,
  buildJuyingResult,
  juyingBodyParts,
  juyingNickname,
} from "./cloud-payload.js";

const VENDOR_SCORE_SHA = "fdd4cd021749cc9ef46cec2bb7559e183efad1342c032aaecb8cfa95bc57f023";

function base(extra) {
  return {
    nickname: "林深",
    reportId: "rpt_abcdefghijk",
    clientSubmissionId: "sub_abcdefghijklmnop",
    completedAt: "2026-10-23T20:00:00+08:00",
    ...extra,
  };
}

function keysOf(value, found = []) {
  if (!value || typeof value !== "object") return found;
  const keys = Array.isArray(value) ? [] : Object.keys(value);
  for (const key of keys) {
    found.push(key);
    keysOf(value[key], found);
  }
  if (Array.isArray(value)) value.forEach((item) => keysOf(item, found));
  return found;
}

test("称呼取前 12 个字，手机号和坏答案不上传", () => {
  assert.equal(juyingNickname("  林深  "), "林深");
  assert.equal(juyingNickname(`${"林深".repeat(6)}\uE000\uE001`), "林深".repeat(6));
  assert.equal(juyingNickname("   "), "");
  assert.equal(buildJuyingResult(base({ nickname: "  ", answers: Array(20).fill(0) })), null);
  assert.equal(buildJuyingResult(base({ nickname: "13800000000", answers: Array(20).fill(0) })), null);
  assert.equal(buildJuyingResult(base({ nickname: "13800000000x", answers: Array(20).fill(0) })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(19).fill(3) })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(21).fill(3) })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(20).fill(3), reportId: "" })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(20).fill(3), clientSubmissionId: "" })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(20).fill(3), completedAt: "" })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(20).fill(-1) })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(20).fill(6) })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(20).fill(1.5) })), null);
  assert.equal(buildJuyingResult(base({ answers: Array(20).fill("3") })), null);
  const withNull = Array(20).fill(2);
  withNull[7] = null;
  assert.equal(buildJuyingResult(base({ answers: withNull })), null);
});

test("上传体与 juyingBodyParts 深相等，分数里没有页面长文和逐项 rows", () => {
  const cases = [
    { answers: Array(20).fill(0), rushed: false },
    { answers: Array(20).fill(2), rushed: false },
    { answers: Array(20).fill(2), rushed: true },
    { answers: Array(20).fill(3), rushed: false },
    { answers: Array(20).fill(4), rushed: false },
    { answers: Array(20).fill(5), rushed: true },
    { answers: Array.from({ length: 20 }, (_, index) => index % 6), rushed: false },
    { answers: [...Array(10).fill(5), ...Array(10).fill(1)], rushed: false },
    { answers: [...Array(10).fill(0), ...Array(10).fill(5)], rushed: true },
    { answers: [...Array(19).fill(2), 3], rushed: false },
    { answers: [...Array(19).fill(4), 5], rushed: false },
  ];
  for (const { answers, rushed } of cases) {
    const report = buildJuyingResult(base({
      nickname: `${"林深".repeat(6)}\uE000多余`,
      answers,
      rushed,
      phone: "13800000000",
      wechat: "secret-wechat",
      wechatQr: "secret-qr",
      parent: { name: "父亲真名" },
      father: "父亲真名",
      mother: "母亲真名",
      profile: { name: "张三", phone: "13800000000" },
    }));
    const parts = juyingBodyParts(answers, rushed);
    const packed = JSON.stringify(report);
    assert.equal(report.nickname, "林深".repeat(6));
    assert.equal(packed.includes("\uE000"), false);
    assert.equal(packed.includes("13800000000"), false);
    assert.equal(packed.includes("secret-wechat"), false);
    assert.equal(packed.includes("secret-qr"), false);
    assert.equal(packed.includes("父亲真名"), false);
    assert.equal(packed.includes("母亲真名"), false);
    assert.equal(packed.includes("张三"), false);
    for (const key of ["phone", "wechat", "wechatQr", "parent", "father", "mother", "profile", "paragraphs", "rows"]) {
      assert.equal(keysOf(report).includes(key), false, key);
    }
    assert.deepEqual(report.dimensions, parts.dimensions);
    assert.deepEqual(report.result, parts.result);
    assert.deepEqual(report.interpretation, parts.interpretation);
    assert.deepEqual(report.recommendations, parts.recommendations);
    assert.deepEqual(report.reportContent, parts.reportContent);
    assert.deepEqual(report.extensionData.score, parts.score);
    assert.deepEqual(report.extensionData.answers, answers);
    assert.deepEqual(report.reportContent.viewModel.answers, answers);
    assert.equal(report.extensionData.answers.length, 20);
    report.extensionData.answers.forEach((value) => {
      assert.equal(Number.isInteger(value), true);
      assert.equal(value >= 0 && value <= 5, true);
    });
    assert.deepEqual(Object.keys(report.extensionData.score), ["total", "mind", "act", "band", "average", "side"]);
    assert.deepEqual(Object.keys(report.extensionData.score.band), ["id", "name", "min", "max", "range", "source"]);
    assert.deepEqual(report.reportContent.viewModel.marked, parts.reportContent.viewModel.marked);
    assert.equal(report.reportContent.viewModel.rushed, rushed);
    assert.deepEqual(report.extensionData.quality, { rushed });
    assert.equal(report.result.code, report.extensionData.score.band.id);
    assert.deepEqual(report.result.flags, []);
    assert.equal(report.result.headline, `${parts.score.band.name} · ${parts.score.total} 分`);
    assert.equal(report.result.label, parts.score.band.name);
    assert.deepEqual(report.dimensions.map((item) => item.id), ["total", "mind", "act"]);

    const live = scoreJuying(answers);
    assert.equal(report.extensionData.score.total, live.total);
    assert.equal(report.extensionData.score.mind, live.mind);
    assert.equal(report.extensionData.score.act, live.act);
    assert.equal(report.extensionData.score.average, live.average);
    assert.equal(report.extensionData.score.side, live.side);
    assert.equal(report.extensionData.score.band.id, live.band.id);
    assert.equal(report.extensionData.score.band.name, live.band.name);
    assert.deepEqual(
      report.reportContent.viewModel.marked,
      live.marked.map((item) => ({
        groupId: item.groupId,
        group: item.group,
        n: item.n,
        text: item.text,
        score: item.score,
        label: item.label,
      })),
    );
    assert.equal(packed.includes(live.band.paragraphs[2] || "工作里，你通常能把一件事从开头做到收尾。"), false);
  }
});

test("40 分是心智成熟，文案和协议标识跟厂商校验器逐字相同", async () => {
  const vendor = await readFile(new URL("./vendor/juying-score.js", import.meta.url));
  assert.equal(createHash("sha256").update(vendor).digest("hex"), VENDOR_SCORE_SHA);
  const source = await readFile(new URL("./cloud-payload.js", import.meta.url), "utf8");
  assert.equal(source.includes("juyingBodyParts"), true);
  assert.equal(source.includes('from "./score.js"'), false);
  assert.equal(source.includes('from "./data.js"'), false);

  assert.equal(JUYING_SCREEN, "这是讲座对照，不是诊断，也不是心理评估。");
  assert.equal(JUYING_SCREEN_TEXT, JUYING_SCREEN);
  assert.equal(JUYING_DISCLAIMER, "非严肃科学，仅供讲座听众理解学习。");
  assert.equal(JUYING_READER_GAP, "阅读页若尚未重绘巨婴测评，总分、心理特征、行为特征和分档在 dimensions、result 与 textFallback。这不是诊断。");

  const answers = Array(20).fill(2);
  const report = buildJuyingResult(base({ answers }));
  const parts = juyingBodyParts(answers, false);
  assert.equal(parts.score.total, 40);
  assert.equal(parts.score.mind, 20);
  assert.equal(parts.score.act, 20);
  assert.equal(parts.score.average, "2.00");
  assert.equal(parts.score.band.id, "mature");
  assert.equal(parts.score.band.name, "心智成熟");
  assert.equal(parts.score.band.min, 0);
  assert.equal(parts.score.band.max, 40);
  assert.equal(parts.score.band.range, "40 分及以下");
  assert.equal(report.result.headline, "心智成熟 · 40 分");
  assert.equal(report.result.code, "mature");
  assert.deepEqual(report.result.flags, []);
  assert.equal(report.result.summary, `${parts.score.side}${JUYING_SCREEN}`);
  assert.deepEqual(report.reportContent.viewModel.marked, []);
  assert.equal(report.reportContent.viewModel.rushed, false);
  assert.equal(report.interpretation.some((item) => item.text === JUYING_SCREEN), true);
  assert.equal(report.interpretation.some((item) => item.text === JUYING_DISCLAIMER), true);
  assert.equal(report.recommendations.some((item) => item.text === JUYING_SCREEN), true);
  assert.equal(report.recommendations.some((item) => item.text === JUYING_DISCLAIMER), true);
  assert.equal(report.recommendations.some((item) => item.text === JUYING_READER_GAP), true);
  assert.deepEqual(report.recommendations, parts.recommendations);
  assert.equal(report.reportContent.textFallback.includes(JUYING_SCREEN), true);
  assert.equal(report.reportContent.textFallback.includes(JUYING_DISCLAIMER), true);
  assert.equal(report.interpretation.some((item) => item.text === "这次没有 4 分或 5 分的项目。"), true);

  const markedAnswers = Array(20).fill(0);
  markedAnswers[0] = 5;
  markedAnswers[10] = 4;
  const marked = buildJuyingResult(base({ answers: markedAnswers, rushed: true }));
  assert.deepEqual(marked.reportContent.viewModel.marked, [
    {
      groupId: "mind",
      group: "心理特征",
      n: 1,
      text: "求认可，求关注。",
      score: 5,
      label: "与我一样",
    },
    {
      groupId: "act",
      group: "行为特征",
      n: 1,
      text: "冲动、草率，不顾后果。",
      score: 4,
      label: "很像",
    },
  ]);
  assert.equal(marked.reportContent.viewModel.rushed, true);
  assert.equal(
    marked.interpretation.some((item) => item.text === "心理特征 1. 求认可，求关注。与我一样（5）；行为特征 1. 冲动、草率，不顾后果。很像（4）"),
    true,
  );

  assert.equal(report.assessmentId, "juying");
  assert.equal(report.assessmentId, ASSESSMENT_ID);
  assert.equal(report.assessmentName, "巨婴测评");
  assert.equal(report.assessmentName, ASSESSMENT_NAME);
  assert.equal(report.assessmentVersion, "juying-h5-v1");
  assert.equal(report.assessmentVersion, JUYING_VERSION);
  assert.equal(report.schemaVersion, "1.0.0");
  assert.equal(report.schemaVersion, SCHEMA_VERSION);
  assert.equal(report.source.resultKitId, "juying");
  assert.equal(report.source.repo, "juying");
  assert.equal(report.source.path, "index.html");
  assert.equal(report.source.origin, "external-repo");
  assert.equal(report.source.site, "巨婴测评");
  assert.equal(report.source.pageUrl, "https://xiangshu3721.github.io/juying/");
  assert.equal(report.source.localKey, "juying-session");
  assert.equal(report.extensionData.consent.agreed, true);
  assert.equal(report.extensionData.consent.version, CONSENT_VERSION);
  assert.equal(report.extensionData.consent.version, "consent-assessment-juying-1");
  assert.deepEqual(report.extensionData.consent.scopes, ["store", "share_link", "mentor_read"]);
  assert.equal(report.extensionData.compat.level, "partial");
  assert.deepEqual(report.extensionData.compat.gaps, [JUYING_READER_GAP]);
  assert.deepEqual(Object.keys(report).sort(), [
    "assessmentId", "assessmentName", "assessmentVersion", "completedAt", "dimensions",
    "extensionData", "interpretation", "nickname", "recommendations", "reportContent",
    "reportId", "result", "schemaVersion", "source",
  ].sort());
  assert.deepEqual(Object.keys(report.extensionData).sort(), ["answers", "compat", "consent", "quality", "score"]);

  const edges = [
    [Array(20).fill(0), "mature", "心智成熟", "0.00", "心智成熟 · 0 分"],
    [Array(20).fill(2), "mature", "心智成熟", "2.00", "心智成熟 · 40 分"],
    [[...Array(19).fill(2), 3], "partial", "有部分巨婴特质", "2.05", "有部分巨婴特质 · 41 分"],
    [Array(20).fill(3), "infant", "巨婴", "3.00", "巨婴 · 60 分"],
    [Array(20).fill(4), "infant", "巨婴", "4.00", "巨婴 · 80 分"],
    [[...Array(19).fill(4), 5], "child", "儿童状态", "4.05", "儿童状态 · 81 分"],
    [Array(20).fill(5), "child", "儿童状态", "5.00", "儿童状态 · 100 分"],
  ];
  for (const [raw, id, name, average, headline] of edges) {
    const edge = buildJuyingResult(base({ answers: raw }));
    const live = scoreJuying(raw);
    assert.equal(edge.extensionData.score.band.id, id);
    assert.equal(edge.extensionData.score.band.name, name);
    assert.equal(edge.extensionData.score.average, average);
    assert.equal(edge.extensionData.score.average, live.average);
    assert.equal(edge.extensionData.score.total, live.total);
    assert.equal(edge.result.code, id);
    assert.equal(edge.result.headline, headline);
    assert.deepEqual(edge.result.flags, []);
  }
});

test("结果页进入后自动挂上分享，昵称门槛和不是诊断都还在", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const kit = await readFile(new URL("./cloud-kit.js", import.meta.url), "utf8");
  const localScore = await readFile(new URL("./score.js", import.meta.url), "utf8");
  assert.equal(app.includes('from "./score.js"'), true);
  assert.equal(app.includes("scoreJuying"), true);
  assert.equal(localScore.includes("export function scoreJuying"), true);
  assert.equal(app.includes("mountJuyingCloud"), true);
  assert.equal(app.includes("data-cloud-slot"), true);
  assert.equal(app.includes("mountReportCloud"), true);
  assert.equal(app.includes('state.step === "report"'), true);
  assert.equal(app.includes("ensureNick"), true);
  assert.equal(app.includes("RK.guard"), true);
  assert.equal(app.includes("nickReset"), true);
  assert.equal(app.includes("不会上传"), false);
  assert.equal(app.includes("${esc(DISCLAIMER)}"), true);
  assert.equal(app.includes("不是诊断"), true);
  assert.equal(page.includes("巨婴测评"), true);
  assert.equal(page.includes("不会上传"), false);
  assert.equal(kit.includes("分享结果"), true);
  assert.equal(kit.includes("buildJuyingResult"), true);
  assert.equal(kit.includes("我同意"), false);
  assert.equal(kit.includes("保存并分享这一次"), false);
  assert.equal(kit.includes("二维码"), false);
  assert.equal(kit.includes("微信"), false);
  assert.equal(kit.includes("腾讯云"), false);
  assert.equal(app.includes("二维码"), false);
  assert.equal(app.includes("微信"), false);
});
