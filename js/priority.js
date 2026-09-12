export const PRIORITY_ORDER = { S: 0, A: 1, B: 2, C: 3 };

const lodgingTypes = ["民泊", "一棟貸し", "旅館", "ホテル", "ペンション", "ゲストハウス"];

export function evaluatePriority(facility) {
  const matched = [];
  let score = 0;
  if (facility.petFriendly === true) { score += 2; matched.push("ペット同伴可で床・建具の補修需要が見込める"); }
  if (facility.wholeRental === true) { score += 2; matched.push("一棟貸しで施設品質が選ばれる理由になりやすい"); }
  if (facility.woodFloor === true) { score += 2; matched.push("木質床の可能性がありサービスとの親和性が高い"); }
  if (facility.multiProperty === true) { score += 2; matched.push("複数施設への横展開が期待できる"); }
  if (lodgingTypes.includes(facility.type)) { score += 1; matched.push(`${facility.type}として補修による休館削減が提案できる`); }

  const contactable = Boolean(facility.email || facility.phone || facility.contactUrl);
  if (contactable) { score += 1; matched.push("連絡先を確認済み"); }
  const knownSignals = [facility.petFriendly, facility.wholeRental, facility.woodFloor, facility.multiProperty]
    .filter((value) => value !== null && value !== undefined).length;

  let priority = "C";
  if (score >= 7 && matched.length >= 4) priority = "S";
  else if (score >= 4) priority = "A";
  else if (score >= 2) priority = "B";
  else if (knownSignals < 2 || score < 2) priority = "C";

  const reason = matched.length
    ? matched.slice(0, 3).join("。") + "。"
    : "判断材料が不足しています。公式サイトなどで情報を追加してください。";
  return { priority, reason, score };
}
