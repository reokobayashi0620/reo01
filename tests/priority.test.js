import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePriority } from "../js/priority.js";

test("複数の強い条件が揃う施設をS判定する", () => {
  const result = evaluatePriority({ type:"一棟貸し", petFriendly:true, wholeRental:true, woodFloor:true, multiProperty:false, email:"a@example.com" });
  assert.equal(result.priority, "S");
  assert.match(result.reason, /ペット同伴可/);
});
test("複数施設を運営する宿泊施設をA判定する", () => {
  assert.equal(evaluatePriority({ type:"ホテル", multiProperty:true, petFriendly:false, wholeRental:false, woodFloor:false, phone:"000" }).priority, "A");
});
test("一般的な宿泊施設をB判定する", () => {
  assert.equal(evaluatePriority({ type:"旅館", petFriendly:false, wholeRental:false, woodFloor:false, multiProperty:false, email:"a@example.com" }).priority, "B");
});
test("情報不足をC判定して案内する", () => {
  const result=evaluatePriority({ type:"その他" }); assert.equal(result.priority,"C"); assert.match(result.reason,/情報/);
});
