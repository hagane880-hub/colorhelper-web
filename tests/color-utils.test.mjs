import test from "node:test";
import assert from "node:assert/strict";
import { colorValue, compareColors, hsbText, normalizeHex, parseHex, signedText } from "../color-utils.mjs";

test("HEXを正規化して解析する", () => {
  assert.deepEqual(parseHex(" 3366ff "), colorValue(51, 102, 255));
  assert.equal(normalizeHex("#ABCDEF"), "#ABCDEF");
});

test("不正なHEXを拒否する", () => {
  assert.equal(parseHex(""), null);
  assert.equal(parseHex("#12345"), null);
  assert.equal(parseHex("#GGGGGG"), null);
});

test("iOS版と同じHSB表記を返す", () => {
  assert.equal(hsbText(parseHex("#3366FF")), "225°, 80%, 100%");
});

test("RGB差分、距離、一致度カテゴリを算出する", () => {
  const comparison = compareColors(colorValue(100, 100, 100), colorValue(120, 90, 100));
  assert.equal(comparison.redDelta, 20);
  assert.equal(comparison.greenDelta, -10);
  assert.equal(comparison.blueDelta, 0);
  assert.equal(comparison.match, "近い");
  assert.equal(signedText(comparison.redDelta), "+20");
  assert.equal(signedText(comparison.greenDelta), "-10");
});

test("同一色はとても近く、一致率100%になる", () => {
  const color = colorValue(10, 20, 30);
  const comparison = compareColors(color, color);
  assert.equal(comparison.distance, 0);
  assert.equal(comparison.similarity, 100);
  assert.equal(comparison.match, "とても近い");
});
