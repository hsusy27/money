/* =========================================================
   費用管理系統 — 共用邏輯
   資料儲存：LocalStorage（存在你目前使用的瀏覽器/電腦裡）
   備份方式：右下角「匯出備份 JSON」／「匯入備份 JSON」
   ========================================================= */

const STORAGE_KEY = 'expenseManagerData_v1';

/* 主任月費用 —— 固定的卡片／會計代號順序（依你的指示排列） */
const DIRECTOR_CATEGORIES = [
  { key: 'hospital_expense', label: '醫院費用', code: null, note: '不編列會計代號，由醫院行政經費支應' },
  { key: 'passthrough',      label: '非主任開銷，另外申請給中心的費用', code: null, note: '主任代為申請／代領，非個人墊付' },
  { key: 'code_114221T7',    label: '計畫費用', code: '114*' },   

];

const FUND_SOURCES = [
  { key: 'hospital', label: '醫院' },
  { key: 'center',   label: '中心' },
  { key: 'school',   label: '學校' },
  { key: 'external', label: '外部' },
];

const MODULES = {
  director:  { label: '主任月費用', path: 'director.html' },
  hospital:  { label: '院內計畫',   path: 'hospital.html' },
  pettycash: { label: '中心零用金', path: 'pettycash.html' },
  teamdinner:{ label: '小組聚餐',   path: 'teamdinner.html' },
  project:   { label: '研究計畫經費', path: 'project.html' },
};

/* 研究計畫經費：每個「計畫/會計代號」帳戶下分三種費用類別（對照國科會核定清單格式）*/
const PROJECT_EXPENSE_TYPES = [
  { key: 'personnel', label: '七、研究人力費' },
  { key: 'misc',       label: '八、雜項費用' },
  { key: 'equipment',  label: '十、研究設備費' },
];
const PROJECT_STATUS = [
  { key: 'applying',   label: '申請中',   cls: 'tag-pass' },
  { key: 'processing', label: '核銷中',   cls: 'tag-processing' },
  { key: 'done',        label: '核銷完成', cls: 'tag-settled' },
];

/* ---------------- 資料存取 ---------------- */
function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY);
  let data = null;
  if(raw){
    try{ data = JSON.parse(raw); }catch(e){ console.warn('資料損毀，改用空白資料', e); }
  }
  if(!data) data = { modules: {} };
  data.modules = data.modules || {};
  data.modules.director   = data.modules.director   || { entries: [] };
  data.modules.hospital   = data.modules.hospital   || { entries: [] };
  data.modules.pettycash  = data.modules.pettycash  || { entries: [] };
  data.modules.teamdinner = data.modules.teamdinner || { entries: [] };
  data.modules.project    = data.modules.project    || { accounts: [] };
  return data;
}
function saveData(data){
  data.meta = data.meta || {};
  data.meta.updatedAt = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  if(typeof queueCloudPush === 'function') queueCloudPush();
}
function ensureSeeded(){
  const data = loadData();
  const total = Object.values(data.modules).reduce((s,m)=>s+(m.entries?.length||0),0);
  if(total === 0 && window.SEED_DATA){
    saveData(window.SEED_DATA);
  }
}

function uid(){ return 'e' + Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }

function addEntry(moduleKey, entry){
  const data = loadData();
  entry.id = uid();
  data.modules[moduleKey].entries.push(entry);
  saveData(data);
}
function updateEntry(moduleKey, id, patch){
  const data = loadData();
  const list = data.modules[moduleKey].entries;
  const idx = list.findIndex(e=>e.id===id);
  if(idx>-1) list[idx] = {...list[idx], ...patch};
  saveData(data);
}
function deleteEntry(moduleKey, id){
  const data = loadData();
  data.modules[moduleKey].entries = data.modules[moduleKey].entries.filter(e=>e.id!==id);
  saveData(data);
}
function getEntries(moduleKey){
  return loadData().modules[moduleKey]?.entries || [];
}

/* ---------------- 月份工具 ---------------- */
function allMonths(entries){
  const set = new Set(entries.map(e=>e.month));
  return Array.from(set).sort();
}
function monthLabel(m){
  if(!m) return '';
  const [y,mo] = m.split('-');
  return `${y}年${parseInt(mo,10)}月`;
}
function currentMonthStr(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function fmtMoney(n){
  n = Number(n)||0;
  return n===0 ? '—' : n.toLocaleString('zh-TW');
}

const PAYMENT_TYPES = [
  { key:'passthrough',  label:'代轉款項（主任沒有出錢，不需歸還）', tagCls:'tag-pass',       tagLabel:'代轉／無需歸還' },
  { key:'reimbursable', label:'主任先墊付（需要歸還）',             tagCls:'tag-owe',        tagLabel:'待歸還主任' },
  { key:'waived',       label:'主任支應但不需歸還（主任自行吸收）', tagCls:'tag-waived',     tagLabel:'主任自行吸收' },
];
function paymentTypeOf(e){
  if(e.paymentType) return e.paymentType;
  return e.directorAdvanced ? 'reimbursable' : 'passthrough'; // 舊資料相容
}

/* ---------------- 主任月費用：對帳計算 ---------------- */
// entry: {id, month, category, fundSource, item, subitem, expense, income, note,
//         paymentType('passthrough'|'reimbursable'|'waived'), settled(bool), settledMonth}

/* 這筆項目實際代表的金額：一般用「支出」欄；但代轉款項有些人習慣填在
   「收入」欄（例如記錄成「即將撥入中心的款項」），所以代轉款項會兩欄
   都看，取有填數字的那一欄，避免漏算。 */
function directorEntryAmount(e){
  const exp = Number(e.expense)||0;
  if(exp>0) return exp;
  const pt = paymentTypeOf(e);
  if(pt==='passthrough') return Number(e.income)||0;
  return 0;
}

function directorReconForMonth(month){
  const entries = getEntries('director');
  const rows = { owedNew:{}, passthrough:{}, waived:{}, settledThisMonth:{} };
  FUND_SOURCES.forEach(f=>{ rows.owedNew[f.key]=0; rows.passthrough[f.key]=0; rows.waived[f.key]=0; rows.settledThisMonth[f.key]=0; });

  entries.forEach(e=>{
    const amt = directorEntryAmount(e);
    const pt = paymentTypeOf(e);
    if(e.month === month){
      if(pt==='reimbursable'){
        if(!e.settled) rows.owedNew[e.fundSource] = (rows.owedNew[e.fundSource]||0) + amt;
      } else if(pt==='passthrough'){
        rows.passthrough[e.fundSource] = (rows.passthrough[e.fundSource]||0) + amt;
      } else if(pt==='waived'){
        rows.waived[e.fundSource] = (rows.waived[e.fundSource]||0) + amt;
      }
    }
    // 沖帳：不論哪個月產生，只要「這個月」被標記已入帳，就算這個月的入帳金額
    if(pt==='reimbursable' && e.settled && e.settledMonth === month){
      rows.settledThisMonth[e.fundSource] = (rows.settledThisMonth[e.fundSource]||0) + amt;
    }
  });
  return rows;
}

function directorOutstandingUpTo(month){
  // 累計至該月為止（含）尚未清償金額，依資金來源分組 + 明細
  const entries = getEntries('director').filter(e=> paymentTypeOf(e)==='reimbursable' && !e.settled && e.month <= month);
  const byFund = {}; FUND_SOURCES.forEach(f=>byFund[f.key]=0);
  entries.forEach(e=>{ byFund[e.fundSource] = (byFund[e.fundSource]||0) + directorEntryAmount(e); });
  const total = Object.values(byFund).reduce((a,b)=>a+b,0);
  return { total, byFund, entries };
}

function directorAllOutstanding(){
  const entries = getEntries('director').filter(e=> paymentTypeOf(e)==='reimbursable' && !e.settled)
    .sort((a,b)=> a.month.localeCompare(b.month));
  const total = entries.reduce((s,e)=> s + directorEntryAmount(e), 0);
  return { total, entries };
}

/* 代轉款項中「還沒交給中心」的部分（跟上面「還沒歸還主任」的邏輯對稱） */
function directorPendingToCenterAll(){
  const entries = getEntries('director').filter(e=> paymentTypeOf(e)==='passthrough' && !e.settled)
    .sort((a,b)=> a.month.localeCompare(b.month));
  const total = entries.reduce((s,e)=> s + directorEntryAmount(e), 0);
  return { total, entries };
}

/* 簡易模組（院內計畫／中心零用金／小組聚餐）月結 */
function simpleModuleMonthSummary(moduleKey, month){
  const entries = getEntries(moduleKey).filter(e=>e.month===month);
  const income = entries.reduce((s,e)=>s+(Number(e.income)||0),0);
  const expense = entries.reduce((s,e)=>s+(Number(e.expense)||0),0);
  return { income, expense, balance: income-expense, entries };
}
function simpleModuleRunningBalance(moduleKey, uptoMonth){
  const entries = getEntries(moduleKey).filter(e=> !uptoMonth || e.month<=uptoMonth);
  const income = entries.reduce((s,e)=>s+(Number(e.income)||0),0);
  const expense = entries.reduce((s,e)=>s+(Number(e.expense)||0),0);
  return income-expense;
}

/* ---------------- 研究計畫經費：帳戶 CRUD ---------------- */
function getProjectAccounts(){
  return loadData().modules.project.accounts || [];
}
function addProjectAccount(account){
  const data = loadData();
  account.id = uid();
  account.entries = account.entries || [];
  account.quotas = account.quotas || { personnel:0, misc:0, equipment:0 };
  data.modules.project.accounts.push(account);
  saveData(data);
  return account.id;
}
function updateProjectAccount(accountId, patch){
  const data = loadData();
  const a = data.modules.project.accounts.find(x=>x.id===accountId);
  if(a) Object.assign(a, patch);
  saveData(data);
}
function deleteProjectAccount(accountId){
  const data = loadData();
  data.modules.project.accounts = data.modules.project.accounts.filter(a=>a.id!==accountId);
  saveData(data);
}
function addProjectEntry(accountId, entry){
  const data = loadData();
  const a = data.modules.project.accounts.find(x=>x.id===accountId);
  if(!a) return;
  entry.id = uid();
  a.entries.push(entry);
  saveData(data);
}
function updateProjectEntry(accountId, entryId, patch){
  const data = loadData();
  const a = data.modules.project.accounts.find(x=>x.id===accountId);
  if(!a) return;
  const idx = a.entries.findIndex(e=>e.id===entryId);
  if(idx>-1) a.entries[idx] = {...a.entries[idx], ...patch};
  saveData(data);
}
function deleteProjectEntry(accountId, entryId){
  const data = loadData();
  const a = data.modules.project.accounts.find(x=>x.id===accountId);
  if(!a) return;
  a.entries = a.entries.filter(e=>e.id!==entryId);
  saveData(data);
}
function addProjectEntryLog(accountId, entryId, logItem){
  const data = loadData();
  const a = data.modules.project.accounts.find(x=>x.id===accountId);
  if(!a) return;
  const e = a.entries.find(x=>x.id===entryId);
  if(!e) return;
  e.log = e.log || [];
  e.log.push(logItem);
  e.log.sort((x,y)=> (x.date||'').localeCompare(y.date||''));
  saveData(data);
}
function projectAccountTotals(account){
  const totals = {};
  PROJECT_EXPENSE_TYPES.forEach(t=>{
    const es = (account.entries||[]).filter(e=>e.type===t.key);
    const applied = es.reduce((s,e)=>s+(Number(e.applied)||0),0);
    const actual  = es.reduce((s,e)=>s+(Number(e.actual)||0),0);
    const quota   = Number(account.quotas?.[t.key])||0;
    totals[t.key] = { applied, actual, quota, remaining: quota - actual, count: es.length };
  });
  totals.grand = {
    quota: PROJECT_EXPENSE_TYPES.reduce((s,t)=>s+totals[t.key].quota,0),
    actual: PROJECT_EXPENSE_TYPES.reduce((s,t)=>s+totals[t.key].actual,0),
    remaining: PROJECT_EXPENSE_TYPES.reduce((s,t)=>s+totals[t.key].remaining,0),
  };
  return totals;
}

/* ---------------- 匯出 / 匯入 ---------------- */
function exportBackup(){
  const data = loadData();
  const blob = new Blob([JSON.stringify(data,null,2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const d = new Date().toISOString().slice(0,10);
  a.href = url; a.download = `expense-backup-${d}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
function importBackup(file){
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed.modules) throw new Error('格式不正確');
      saveData(parsed);
      alert('匯入成功，頁面即將重新整理。');
      location.reload();
    }catch(e){
      alert('匯入失敗：檔案格式不正確。');
    }
  };
  reader.readAsText(file);
}

/* ---------------- 側邊導覽 render ---------------- */
function renderSidebar(activePage){
  const el = document.getElementById('sidebar');
  if(!el) return;
  el.innerHTML = `
    <div class="brand">
      <div class="mark"></div>
      <div class="name">費用管理</div>
      <div class="sub">Expense Ledger</div>
    </div>
    <div>
      <div class="nav-section-label">總覽</div>
      <div class="nav">
        <a href="index.html" class="${activePage==='index'?'active':''}"><span class="dot"></span>首頁總覽</a>
        <a href="ledger.html" class="${activePage==='ledger'?'active':''}"><span class="dot"></span>歷年對帳</a>
      </div>
      <div class="nav-section-label">經費子項目</div>
      <div class="nav">
        <a href="director.html" class="${activePage==='director'?'active':''}"><span class="dot"></span>主任月費用</a>
        <a href="hospital.html" class="${activePage==='hospital'?'active':''}"><span class="dot"></span>院內計畫</a>
        <a href="pettycash.html" class="${activePage==='pettycash'?'active':''}"><span class="dot"></span>中心零用金</a>
        <a href="teamdinner.html" class="${activePage==='teamdinner'?'active':''}"><span class="dot"></span>小組聚餐</a>
        <a href="project.html" class="${activePage==='project'?'active':''}"><span class="dot"></span>研究計畫經費</a>
      </div>
    </div>
    <div class="sidebar-footer">
      <div id="syncStatus" style="font-size:11px; color:var(--muted); padding:0 2px 2px;"></div>
      <button class="ghost-btn" id="btnSyncSettings">雲端同步設定</button>
      <div style="font-size:11px; color:var(--muted); line-height:1.5; padding:4px 2px 4px;">
        資料存在「這個瀏覽器＋這個網址」。請固定用同一個網址開啟，並定期匯出備份。
      </div>
      <button class="ghost-btn" id="btnExport">匯出備份 JSON</button>
      <button class="ghost-btn" id="btnImport">匯入備份 JSON</button>
      <input type="file" id="fileImport" accept="application/json" style="display:none">
    </div>
  `;
  document.getElementById('btnExport').onclick = exportBackup;
  document.getElementById('btnImport').onclick = ()=> document.getElementById('fileImport').click();
  document.getElementById('fileImport').onchange = (e)=>{ if(e.target.files[0]) importBackup(e.target.files[0]); };
  if(typeof wireSyncUI === 'function') wireSyncUI();
}

/* ---------------- PDF 匯出（自動產生，不需手動列印設定） ---------------- */
function downloadPdf(elementId, filename){
  const el = document.getElementById(elementId);
  if(!el){ alert('找不到要匯出的內容'); return; }
  const opt = {
    margin: [10,10,10,10],
    filename: filename || 'report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS:true, backgroundColor:'#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all','css','legacy'] }
  };
  el.classList.add('pdf-render');
  html2pdf().set(opt).from(el).save().then(()=> el.classList.remove('pdf-render'));
}

/* ---------------- 通用月份下拉 ---------------- */
function buildMonthOptions(selectEl, months, selected){
  const list = months.length ? months : [currentMonthStr()];
  selectEl.innerHTML = list.map(m=>`<option value="${m}" ${m===selected?'selected':''}>${monthLabel(m)}</option>`).join('');
}
function nextMonthStr(m){
  const [y,mo] = m.split('-').map(Number);
  const d = new Date(y, mo-1+1, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
