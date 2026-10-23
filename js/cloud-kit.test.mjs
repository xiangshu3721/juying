import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, mock, test } from "node:test";
import { createCloudStore } from "./cloud-client.js";
import { mountJuyingCloud } from "./cloud-kit.js";

mock.timers.enable({ apis: ["setTimeout"] });
globalThis.clearTimeout = () => {};

function memoryStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); },
  };
}

function defineGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

function installDom() {
  const listeners = new Map();
  const slot = {
    dataset: {},
    isConnected: true,
    innerHTML: "",
    addEventListener(type, fn) { listeners.set(type, fn); },
    click(name) {
      listeners.get("click")({
        stopPropagation() {},
        target: {
          closest(sel) {
            if (sel !== "[data-cloud]") return null;
            return { getAttribute: () => name };
          },
        },
      });
    },
  };
  defineGlobal("document", {
    head: { appendChild() {} },
    body: { appendChild() {}, removeChild() {} },
    createElement() {
      return { id: "", textContent: "", value: "", style: {}, setAttribute() {}, select() {}, remove() {} };
    },
    execCommand() { return false; },
  });
  defineGlobal("localStorage", memoryStorage());
  defineGlobal("location", {
    hostname: "xiangshu3721.github.io",
    origin: "https://xiangshu3721.github.io",
    search: "",
  });
  return slot;
}

function sample(shift = 0) {
  const answers = Array.from({ length: 20 }, (_, index) => (index + shift) % 6);
  return {
    nickname: "  林深  ",
    answers,
    completedAtMs: Date.parse("2026-10-23T12:00:00Z"),
  };
}

async function flush() {
  for (let i = 0; i < 20; i += 1) await Promise.resolve();
}

describe("巨婴测评结果页分享", { concurrency: false }, () => {
  test("进入结果页自动提交，分享只复制短链", async () => {
    const source = await readFile(new URL("./cloud-kit.js", import.meta.url), "utf8");
    assert.equal(source.includes("分享结果"), true);
    assert.equal(source.includes("我同意"), false);
    assert.equal(source.includes("保存并分享这一次"), false);
    assert.equal(source.includes("二维码"), false);
    assert.equal(source.includes("微信"), false);
    assert.equal(source.includes("腾讯云"), false);

    const slot = installDom();
    const calls = [];
    let copied = "";
    defineGlobal("navigator", {
      clipboard: { writeText: async (text) => { copied = text; } },
    });
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push({ url, body });
      if (String(url).endsWith("/v1/results")) {
        return {
          status: 200,
          json: async () => ({
            reportId: body.result.reportId,
            index: "off",
            byteSize: 4,
          }),
        };
      }
      return { status: 404, json: async () => ({}) };
    };

    const input = sample(0);
    mountJuyingCloud(slot, input);
    assert.match(slot.innerHTML, /分享结果/);
    assert.equal(slot.innerHTML.includes("我同意"), false);
    await flush();
    assert.equal(calls.length, 1);
    assert.match(calls[0].url, /\/assessment-report-dev\/v1\/results$/);
    assert.equal(calls[0].body.result.assessmentId, "juying");
    assert.equal(calls[0].body.result.assessmentName, "巨婴测评");
    assert.equal(calls[0].body.result.assessmentVersion, "juying-h5-v1");
    assert.equal(calls[0].body.result.source.resultKitId, "juying");
    assert.equal(calls[0].body.result.nickname, "林深");
    assert.equal(calls[0].body.result.extensionData.answers.length, 20);
    assert.deepEqual(calls[0].body.result.extensionData.score.band.id, calls[0].body.result.result.code);
    assert.equal(calls[0].body.result.reportContent.viewModel.answers.length, 20);
    assert.equal(JSON.stringify(calls[0].body).includes("不是诊断"), true);
    mountJuyingCloud(slot, input);
    await flush();
    assert.equal(calls.length, 1);

    slot.click("share");
    await flush();
    assert.match(copied, /^https:\/\/xiangshu3721\.github\.io\/mindtest-web\/r\/#[A-Za-z0-9_-]{11}\.[A-Za-z0-9_-]{16}$/);
    assert.equal(copied.includes("rpt_"), false);
    assert.equal(copied.length, 75);
    assert.match(slot.innerHTML, /链接已复制/);
    const saved = createCloudStore(globalThis.localStorage).links();
    assert.equal(Object.values(saved)[0].reportUrl, copied);
  });

  test("提交失败后可以重试，不出现同意勾选", async () => {
    const slot = installDom();
    let failed = true;
    const ids = [];
    defineGlobal("navigator", { clipboard: { writeText: async () => {} } });
    globalThis.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      ids.push(body.result.reportId);
      if (failed) throw new Error("offline");
      return {
        status: 200,
        json: async () => ({ reportId: body.result.reportId, index: "off", byteSize: 4 }),
      };
    };
    mountJuyingCloud(slot, sample(1));
    await flush();
    assert.match(slot.innerHTML, /重试/);
    assert.match(slot.innerHTML, /这次没生成链接/);
    assert.equal(slot.innerHTML.includes("我同意"), false);
    failed = false;
    slot.click("retry");
    await flush();
    assert.equal(ids.length, 2);
    assert.equal(ids[0], ids[1]);
    assert.equal(slot.innerHTML.includes("重试"), false);
    slot.click("share");
    await flush();
    assert.match(slot.innerHTML, /链接已复制/);
  });

  test("链接还在生成时，点分享会提示稍后再试", async () => {
    const slot = installDom();
    let release;
    defineGlobal("navigator", { clipboard: { writeText: async () => {} } });
    globalThis.fetch = () => new Promise((resolve) => { release = resolve; });
    mountJuyingCloud(slot, sample(2));
    assert.match(slot.innerHTML, /aria-busy="true"/);
    assert.match(slot.innerHTML, /链接生成中/);
    slot.click("share");
    assert.match(slot.innerHTML, /链接生成中，稍后再试/);
    release({ status: 200, json: async () => ({ reportId: "rpt_abcdefghijk", index: "off", byteSize: 1 }) });
    await flush();
  });

  test("称呼为空时不请求，本地仍可看到分享失败说明", async () => {
    const slot = installDom();
    let called = 0;
    globalThis.fetch = async () => { called += 1; return { status: 500, json: async () => ({}) }; };
    mountJuyingCloud(slot, { nickname: "  ", answers: Array(20).fill(3) });
    await flush();
    assert.equal(called, 0);
    assert.match(slot.innerHTML, /先写一个称呼，才能分享/);
    assert.match(slot.innerHTML, /分享结果/);
  });
});
