import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DISCLAIMER } from "./data.js";
import { scoreJuying } from "./score.js";
import {
  ASSESSMENT_ID,
  ASSESSMENT_NAME,
  CONSENT_VERSION,
  JUYING_READER_GAP,
  JUYING_SCREEN_TEXT,
  JUYING_VERSION,
  SCHEMA_VERSION,
  buildJuyingResult,
  juyingDimensions,
  juyingNickname,
  juyingOutcome,
  juyingScore,
  juyingViewModel,
} from "./cloud-payload.js";

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

test("称呼取前 12 个字，空称呼和坏答案不上传", () => {
  assert.equal(juyingNickname("  林深  "), "林深");
  assert.equal(juyingNickname(`${"林深".repeat(6)}\uE000\uE001`), "林深".repeat(6));
  assert.equal(juyingNickname("   "), "");
  assert.equal(buildJuyingResult(base({ nickname: "  ", answers: Array(20).fill(0) })), null);
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

test("20 项 0–5 的分数、分档和高低说明都来自 scoreJuying", () => {
  const cases = [
    Array(20).fill(0),
    Array(20).fill(2),
    Array(20).fill(3),
    Array(20).fill(4),
    Array(20).fill(5),
    Array.from({ length: 20 }, (_, index) => index % 6),
    [...Array(10).fill(5), ...Array(10).fill(1)],
    [...Array(10).fill(0), ...Array(10).fill(5)],
  ];
  for (const answers of cases) {
    const scored = scoreJuying(answers);
    const report = buildJuyingResult(base({
      nickname: `${"林深".repeat(6)}\uE000多余`,
      answers,
      phone: "13800000000",
      wechat: "secret-wechat",
      wechatQr: "secret-qr",
      parent: { name: "父亲真名" },
      father: "父亲真名",
      mother: "母亲真名",
      profile: { name: "张三", phone: "13800000000" },
    }));
    const packed = JSON.stringify(report);
    const score = juyingScore(scored);
    assert.equal(report.nickname, "林深".repeat(6));
    assert.equal(packed.includes("\uE000"), false);
    assert.equal(packed.includes("13800000000"), false);
    assert.equal(packed.includes("secret-wechat"), false);
    assert.equal(packed.includes("secret-qr"), false);
    assert.equal(packed.includes("父亲真名"), false);
    assert.equal(packed.includes("母亲真名"), false);
    assert.equal(packed.includes("张三"), false);
    for (const key of ["phone", "wechat", "wechatQr", "parent", "father", "mother", "profile"]) {
      assert.equal(keysOf(report).includes(key), false, key);
    }
    assert.equal(report.extensionData.answers.length, 20);
    assert.deepEqual(report.extensionData.answers, answers);
    assert.deepEqual(report.reportContent.viewModel.answers, answers);
    report.extensionData.answers.forEach((value) => {
      assert.equal(Number.isInteger(value), true);
      assert.equal(value >= 0 && value <= 5, true);
    });
    assert.deepEqual(report.extensionData.score, score);
    assert.equal(report.extensionData.score.total, scored.total);
    assert.equal(report.extensionData.score.mind, scored.mind);
    assert.equal(report.extensionData.score.act, scored.act);
    assert.equal(report.extensionData.score.band.id, scored.band.id);
    assert.equal(report.extensionData.score.band.name, scored.band.name);
    assert.equal(report.extensionData.score.average, scored.average);
    assert.equal(report.extensionData.score.side, scored.side);
    assert.deepEqual(report.reportContent.viewModel, juyingViewModel(scored, answers));
    assert.deepEqual(report.dimensions, juyingDimensions(scored));
    assert.deepEqual(report.result, juyingOutcome(scored));
    assert.equal(report.result.code, scored.band.id);
    assert.equal(report.result.label, scored.band.name);
    assert.equal(report.result.headline, `${scored.total} 分 · ${scored.band.name}`);
    assert.equal(report.result.summary.includes(scored.side), true);
    assert.equal(report.result.summary.includes(scored.average), true);
  }
});

test("协议标识、免责声明和来源固定，不另算总分", async () => {
  const source = await readFile(new URL("./cloud-payload.js", import.meta.url), "utf8");
  assert.equal(source.includes("scoreJuying"), true);
  assert.equal(source.includes(".reduce("), false);

  const answers = [...Array(10).fill(5), ...Array(10).fill(1)];
  const scored = scoreJuying(answers);
  const report = buildJuyingResult(base({ answers }));
  assert.equal(scored.total, 60);
  assert.equal(scored.mind, 50);
  assert.equal(scored.act, 10);
  assert.equal(scored.band.id, "infant");
  assert.equal(scored.band.name, "巨婴");
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
  assert.equal(report.source.site, "ASVA 常用心理测试");
  assert.equal(report.source.pageUrl, "https://xiangshu3721.github.io/juying/");
  assert.equal(report.source.localKey, "juying-session");
  assert.equal(report.extensionData.consent.agreed, true);
  assert.equal(report.extensionData.consent.version, CONSENT_VERSION);
  assert.equal(report.extensionData.consent.version, "consent-assessment-juying-1");
  assert.deepEqual(report.extensionData.consent.scopes, ["store", "share_link", "mentor_read"]);
  assert.equal(report.extensionData.quality.rushed, false);
  assert.equal(report.reportContent.viewModel.rushed, false);
  assert.equal(report.extensionData.compat.level, "partial");
  assert.deepEqual(report.extensionData.compat.gaps, [JUYING_READER_GAP]);
  assert.equal(JUYING_SCREEN_TEXT, `${DISCLAIMER}不是诊断。`);
  assert.equal(JUYING_SCREEN_TEXT.includes("不是诊断"), true);
  assert.equal(report.interpretation[1].text, JUYING_SCREEN_TEXT);
  assert.equal(report.interpretation[1].title, "不是诊断");
  assert.equal(report.recommendations[0].text, JUYING_SCREEN_TEXT);
  assert.equal(report.reportContent.sections.some((item) => item.x === JUYING_SCREEN_TEXT), true);
  assert.equal(report.reportContent.textFallback.includes(JUYING_SCREEN_TEXT), true);
  assert.equal(report.reportContent.textFallback.includes(scored.band.paragraphs[0]), true);
  assert.equal(report.reportContent.format, "view-model+sections");
  assert.equal(report.dimensions[0].score, 60);
  assert.equal(report.dimensions[1].score, 50);
  assert.equal(report.dimensions[2].score, 10);
  assert.deepEqual(report.dimensions.map((item) => item.id), ["total", "mind", "act"]);
  assert.equal(report.extensionData.score.band.id, "infant");
  assert.equal(report.extensionData.score.band.name, "巨婴");
  assert.equal(report.extensionData.score.side, scored.side);
  assert.equal(scored.side.includes("心理特征"), true);
  assert.equal(scored.side.includes("明显更高"), true);

  const edges = [
    [Array(20).fill(0), "mature", "心智成熟", "0.00"],
    [Array(20).fill(2), "mature", "心智成熟", "2.00"],
    [[...Array(19).fill(2), 3], "partial", "有部分巨婴特质", "2.05"],
    [Array(20).fill(4), "infant", "巨婴", "4.00"],
    [[...Array(19).fill(4), 5], "child", "儿童状态", "4.05"],
    [Array(20).fill(5), "child", "儿童状态", "5.00"],
  ];
  for (const [raw, id, name, average] of edges) {
    const edge = buildJuyingResult(base({ answers: raw }));
    const live = scoreJuying(raw);
    assert.equal(edge.extensionData.score.band.id, id);
    assert.equal(edge.extensionData.score.band.name, name);
    assert.equal(edge.extensionData.score.average, average);
    assert.equal(edge.extensionData.score.average, live.average);
    assert.equal(edge.extensionData.score.total, live.total);
    assert.equal(edge.result.code, id);
  }
});

test("结果页进入后自动挂上分享，昵称门槛和不是诊断都还在", async () => {
  const app = await readFile(new URL("./app.js", import.meta.url), "utf8");
  const page = await readFile(new URL("../index.html", import.meta.url), "utf8");
  const kit = await readFile(new URL("./cloud-kit.js", import.meta.url), "utf8");
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
  assert.equal(kit.includes("我同意"), false);
  assert.equal(kit.includes("保存并分享这一次"), false);
  assert.equal(kit.includes("二维码"), false);
  assert.equal(kit.includes("微信"), false);
  assert.equal(kit.includes("腾讯云"), false);
  assert.equal(app.includes("二维码"), false);
  assert.equal(app.includes("微信"), false);
});
