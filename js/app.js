import { sampleFacilities } from "../data/samples.js";
import { evaluatePriority, PRIORITY_ORDER } from "./priority.js";

const STORAGE_KEY = "tohoku-stay-care-facilities-v1";
const prefectures = ["宮城県", "岩手県", "山形県", "福島県", "秋田県", "青森県"];
const types = ["民泊", "一棟貸し", "旅館", "ホテル", "ペンション", "ゲストハウス", "運営会社", "その他"];
const statuses = ["未連絡", "営業文作成済", "連絡済", "返信あり", "商談", "見積", "成約", "見送り"];
const signalLabels = { petFriendly: "ペット可", wholeRental: "一棟貸し", multiProperty: "複数施設運営", woodFloor: "木質床の可能性" };
let facilities = load();

const $ = (selector) => document.querySelector(selector);
const esc = (value = "") => String(value).replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
const optionList = (items, current = "") => items.map(x => `<option ${x === current ? "selected" : ""}>${x}</option>`).join("");

function load() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (Array.isArray(saved)) return saved; } catch { /* broken local data falls back safely */ }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sampleFacilities));
  return structuredClone(sampleFacilities);
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(facilities)); }
function toast(message) { const node = $("#toast"); node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); }
function hydrateOptions() {
  $("#prefFilter").insertAdjacentHTML("beforeend", optionList(prefectures));
  document.querySelector('[name="prefecture"]').innerHTML = `<option value="">選択してください</option>${optionList(prefectures)}`;
  document.querySelector('[name="type"]').innerHTML = optionList(types);
  $("#statusFilter").insertAdjacentHTML("beforeend", optionList(statuses));
  document.querySelector('[name="status"]').innerHTML = optionList(statuses);
  $("#signalFields").innerHTML = Object.entries(signalLabels).map(([key,label]) => `<label>${label}<select name="${key}"><option value="">不明</option><option value="true">はい</option><option value="false">いいえ</option></select></label>`).join("");
}
function filtered() {
  const q = $("#search").value.trim().toLowerCase();
  return facilities.map(f => ({...f, ...evaluatePriority(f)})).filter(f =>
    (!q || [f.name,f.company,f.city,f.notes].some(v => (v || "").toLowerCase().includes(q))) &&
    (!$("#prefFilter").value || f.prefecture === $("#prefFilter").value) &&
    (!$("#priorityFilter").value || f.priority === $("#priorityFilter").value) &&
    (!$("#statusFilter").value || f.status === $("#statusFilter").value)
  ).sort((a,b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.name.localeCompare(b.name,"ja"));
}
function render() {
  const items = filtered();
  const evaluated = facilities.map(f => ({...f,...evaluatePriority(f)}));
  const needsAction = facilities.filter(f => ["未連絡","営業文作成済","返信あり"].includes(f.status)).length;
  $("#stats").innerHTML = `<div class="stat"><span>登録施設</span><b>${facilities.length}</b><i>件</i></div><div class="stat"><span>S / A 優先</span><b>${evaluated.filter(f=>["S","A"].includes(f.priority)).length}</b><i>件</i></div><div class="stat"><span>返信・商談・見積</span><b>${facilities.filter(f=>["返信あり","商談","見積"].includes(f.status)).length}</b><i>件</i></div><div class="stat"><span>次のアクション</span><b>${needsAction}</b><i>件</i></div>`;
  $("#resultCount").textContent = `${items.length}件を表示（全${facilities.length}件）`;
  $("#empty").hidden = items.length > 0;
  $("#cards").innerHTML = items.map(f => {
    const tags = Object.entries(signalLabels).filter(([k]) => f[k] === true).map(([,v])=>`<span class="tag">${v}</span>`).join("");
    const contact = f.email || f.phone || f.contactUrl ? [f.phone,f.email].filter(Boolean).map(esc).join("<br>") || "フォームあり" : "連絡先未確認";
    return `<article class="card"><div class="priority p-${f.priority}" title="スコア ${f.score}">${f.priority}</div><div><div class="facility-name">${esc(f.name)}</div><div class="meta">${esc(f.company || "運営会社未確認")} ｜ ${esc(f.prefecture)} ${esc(f.city)}</div>${tags}</div><div class="reason">${esc(f.reason)}</div><div class="contact">${contact}</div><select class="status-select" data-status="${esc(f.id)}" aria-label="${esc(f.name)}の営業ステータス">${optionList(statuses,f.status)}</select><button class="edit-button" data-edit="${esc(f.id)}" aria-label="編集">⋯</button></article>`;
  }).join("");
  document.querySelectorAll("[data-status]").forEach(node => node.addEventListener("change", e => { const f=facilities.find(x=>x.id===e.target.dataset.status); f.status=e.target.value; f.updatedAt=new Date().toISOString().slice(0,10); save(); render(); toast("ステータスを更新しました"); }));
  document.querySelectorAll("[data-edit]").forEach(node => node.addEventListener("click", () => openForm(node.dataset.edit)));
  refreshTemplateOptions();
}
function openForm(id) {
  const form = $("#facilityForm"); form.reset();
  const facility = facilities.find(f => f.id === id);
  $("#formTitle").textContent = facility ? "施設情報を編集" : "施設を登録";
  $("#deleteButton").hidden = !facility;
  if (facility) Object.entries(facility).forEach(([key,value]) => { const field=form.elements[key]; if(field) field.value = typeof value === "boolean" ? String(value) : (value ?? ""); });
  $("#facilityDialog").showModal();
}
function refreshTemplateOptions() { const before=$("#templateFacility").value; $("#templateFacility").innerHTML=facilities.map(f=>`<option value="${esc(f.id)}">${esc(f.name)}</option>`).join(""); if(facilities.some(f=>f.id===before)) $("#templateFacility").value=before; generateMessage(); }
function generateMessage() {
  const f=facilities.find(x=>x.id===$("#templateFacility").value); if(!f){$("#messagePreview").value="";return;}
  const person=$("#contactPerson").value.trim()||"ご担当者"; const area=$("#repairArea").value;
  const hook=f.petFriendly?"ペット同伴で滞在できる魅力的な施設づくりを拝見し、":"貴施設のウェブサイトを拝見し、";
  $("#messagePreview").value=`${f.company || f.name}\n${person}様\n\n突然のご連絡失礼いたします。東北エリアで宿泊施設の現地補修・コーティングを行っております。\n\n${hook}${area}のキズや劣化について「交換・リフォームする前に、補修という選択肢」をご提案したく、ご連絡いたしました。\n\n客室や共用部を部分補修することで、修繕コストを抑えながら、工期と稼働停止を短くできる可能性があります。現地の状態を確認したうえで、運営スケジュールに配慮した方法をご案内します。\n\n気になる箇所がございましたら、まずは写真でのご相談だけでも承ります。ご興味がありましたら、ご都合のよい方法をお知らせいただけますと幸いです。\n\nどうぞよろしくお願いいたします。`;
}
function csvExport() {
  const headers={name:"施設名",company:"運営会社名",prefecture:"都道府県",city:"市区町村",type:"施設種別",officialUrl:"公式URL",phone:"電話番号",email:"メール",contactUrl:"問い合わせフォームURL",petFriendly:"ペット可",wholeRental:"一棟貸し",multiProperty:"複数施設運営",woodFloor:"木質床の可能性",sourceUrl:"情報取得元URL",notes:"メモ",priority:"優先度",reason:"判定理由",status:"営業ステータス"};
  const quote=v=>`"${String(v??"").replaceAll('"','""')}"`; const rows=facilities.map(f=>({...f,...evaluatePriority(f)})).map(f=>Object.keys(headers).map(k=>quote(typeof f[k]==="boolean"?(f[k]?"はい":"いいえ"):f[k])).join(","));
  const blob=new Blob(["\uFEFF"+Object.values(headers).map(quote).join(",")+"\r\n"+rows.join("\r\n")],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`営業候補施設_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(a.href); toast("CSVを出力しました");
}

hydrateOptions(); render();
$("#addButton").addEventListener("click",()=>openForm());
document.querySelectorAll(".close").forEach(x=>x.addEventListener("click",()=>$("#facilityDialog").close()));
$("#facilityForm").addEventListener("submit",e=>{e.preventDefault(); const fd=new FormData(e.target); const data=Object.fromEntries(fd); for(const key of Object.keys(signalLabels)) data[key]=data[key]===""?null:data[key]==="true"; data.id=data.id||crypto.randomUUID(); data.updatedAt=new Date().toISOString().slice(0,10); const i=facilities.findIndex(f=>f.id===data.id); if(i>=0) facilities[i]=data; else facilities.push(data); save(); e.target.closest("dialog").close(); render(); toast(i>=0?"施設情報を更新しました":"施設を登録しました");});
$("#deleteButton").addEventListener("click",()=>{const id=$("#facilityForm").elements.id.value;if(confirm("この施設を削除しますか？")){facilities=facilities.filter(f=>f.id!==id);save();$("#facilityDialog").close();render();toast("施設を削除しました");}});
["#search","#prefFilter","#priorityFilter","#statusFilter"].forEach(s=>$(s).addEventListener("input",render));
$("#clearFilters").addEventListener("click",()=>{["#search","#prefFilter","#priorityFilter","#statusFilter"].forEach(s=>$(s).value="");render();});
$("#exportCsv").addEventListener("click",csvExport);
$("#openTemplate").addEventListener("click",()=>{$("#templateDialog").showModal();generateMessage();}); $(".template-close").addEventListener("click",()=>$("#templateDialog").close());
["#templateFacility","#contactPerson","#repairArea"].forEach(s=>$(s).addEventListener("input",generateMessage));
$("#copyMessage").addEventListener("click",async()=>{await navigator.clipboard.writeText($("#messagePreview").value);$("#copyStatus").textContent="コピーしました。送信前に内容をご確認ください。";});
