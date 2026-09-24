/* =========================================================
   雲端同步（選用）
   用 Firebase Firestore 當作「共用抽屜」，讓不同裝置的資料
   可以同步在一起。沒有設定的話，系統照舊只用本機瀏覽器儲存，
   不影響原本功能。
   ========================================================= */

const SYNC_CONFIG_KEY = 'expenseSyncConfig_v1';

function getSyncConfig(){
  const raw = localStorage.getItem(SYNC_CONFIG_KEY);
  if(!raw) return null;
  try{ return JSON.parse(raw); }catch(e){ return null; }
}
function saveSyncConfig(cfg){
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(cfg));
}
function clearSyncConfig(){
  localStorage.removeItem(SYNC_CONFIG_KEY);
}

let _fbDb = null;
function ensureFirebase(){
  const cfg = getSyncConfig();
  if(!cfg || !cfg.firebaseConfig || !cfg.roomCode) return null;
  if(_fbDb) return _fbDb;
  if(typeof firebase === 'undefined') return null; // SDK 還沒載入完成
  try{
    const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(cfg.firebaseConfig);
    _fbDb = firebase.firestore();
    return _fbDb;
  }catch(e){ console.warn('Firebase 初始化失敗', e); return null; }
}
function syncDocRef(){
  const cfg = getSyncConfig();
  const db = ensureFirebase();
  if(!db || !cfg) return null;
  return db.collection('syncRooms').doc(cfg.roomCode);
}

/* 從雲端拉資料。如果雲端比本機新，就覆蓋本機，回傳 true 表示有更新 */
async function cloudPull(){
  const ref = syncDocRef();
  if(!ref) return false;
  try{
    const snap = await ref.get();
    if(!snap.exists) return false;
    const remote = snap.data();
    if(!remote || !remote.payload) return false;
    const local = loadData();
    const remoteTime = remote.updatedAt || 0;
    const localTime = (local.meta && local.meta.updatedAt) || 0;
    if(remoteTime > localTime){
      localStorage.setItem(STORAGE_KEY, remote.payload);
      return true;
    }
    return false;
  }catch(e){ console.warn('雲端讀取失敗', e); return false; }
}

/* 把本機資料推上雲端 */
async function cloudPush(){
  const ref = syncDocRef();
  if(!ref) return false;
  try{
    const data = loadData();
    data.meta = data.meta || {};
    data.meta.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    await ref.set({ payload: JSON.stringify(data), updatedAt: data.meta.updatedAt }, { merge:false });
    return true;
  }catch(e){ console.warn('雲端寫入失敗', e); return false; }
}

let _pushTimer = null;
function queueCloudPush(){
  if(!getSyncConfig()) return;
  clearTimeout(_pushTimer);
  _pushTimer = setTimeout(()=>{ cloudPush(); }, 900);
}

/* 頁面載入時：先拉一次雲端資料；如果本機比較新（或雲端還沒有資料），就把本機推上去 */
async function initialSyncOnLoad(){
  const cfg = getSyncConfig();
  if(!cfg) return;
  const changed = await cloudPull();
  if(!changed){ await cloudPush(); }
}

/* 即時監聽：其他裝置更新雲端資料時，自動重新整理這個頁面 */
function watchCloudChanges(){
  const ref = syncDocRef();
  if(!ref) return;
  ref.onSnapshot(snap=>{
    if(!snap.exists) return;
    const remote = snap.data();
    if(!remote || !remote.updatedAt) return;
    const local = loadData();
    const localTime = (local.meta && local.meta.updatedAt) || 0;
    if(remote.updatedAt > localTime + 1500){
      localStorage.setItem(STORAGE_KEY, remote.payload);
      location.reload();
    }
  }, err=> console.warn('雲端監聽失敗', err));
}

async function testSyncConnection(){
  try{
    const ref = syncDocRef();
    if(!ref) return false;
    await ref.set({ ping: Date.now() }, { merge:true });
    return true;
  }catch(e){ console.warn('連線測試失敗', e); return false; }
}

/* ---------------- 設定介面（掛在側邊欄）---------------- */
function insertSyncModalIfMissing(){
  if(document.getElementById('syncModalOverlay')) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div class="modal-overlay" id="syncModalOverlay">
      <div class="modal">
        <div class="modal-head"><h3>雲端同步設定</h3><button class="modal-close" id="syncModalClose">✕</button></div>
        <div class="form-grid cols-2">
          <div class="form-field span-2">
            <label>Firebase 設定（在 Firebase 主控台建立網頁應用程式後，把它給你的 firebaseConfig 整段貼在這裡）</label>
            <textarea id="syncFirebaseConfig" style="min-height:120px;" placeholder='{ apiKey: "...", authDomain: "...", projectId: "...", storageBucket: "...", messagingSenderId: "...", appId: "..." }'></textarea>
          </div>
          <div class="form-field span-2">
            <label>同步房間代碼（多台裝置要輸入完全一樣的代碼，才會同步在一起；建議自己編一組不容易被猜到的英數字）</label>
            <input type="text" id="syncRoomCode" placeholder="例如：airic-office-2026x">
          </div>
          <div class="form-field span-2" id="syncStatusLine" style="font-size:12px; color:var(--ink-soft);"></div>
        </div>
        <div class="form-actions" style="justify-content:space-between;">
          <button class="btn btn-outline" id="syncBtnDisconnect">取消同步</button>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline" id="syncBtnCancel">關閉</button>
            <button class="btn btn-primary" id="syncBtnSave">儲存並連接</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(wrap.firstElementChild);

  document.getElementById('syncModalClose').onclick = closeSyncModal;
  document.getElementById('syncBtnCancel').onclick = closeSyncModal;
  document.getElementById('syncBtnDisconnect').onclick = ()=>{
    if(!confirm('確定要取消雲端同步嗎？這台裝置之後只會用本機儲存，其他裝置不受影響。')) return;
    clearSyncConfig();
    closeSyncModal();
    renderSyncStatus();
  };
  document.getElementById('syncBtnSave').onclick = async ()=>{
    let raw = document.getElementById('syncFirebaseConfig').value.trim();
    const roomCode = document.getElementById('syncRoomCode').value.trim();
    if(!raw || !roomCode){ alert('請貼上 Firebase 設定，並填寫同步房間代碼'); return; }
    // 容錯處理：允許貼上 "const firebaseConfig = {...};" 這種完整寫法，
    // 也允許只貼 "{...}" 本身、結尾多一個分號等常見複製差異
    raw = raw.replace(/^(export\s+default\s+|const\s+\w+\s*=\s*|var\s+\w+\s*=\s*|let\s+\w+\s*=\s*)/,'');
    raw = raw.replace(/;\s*$/,'');
    let cfgObj;
    try{ cfgObj = (new Function('return (' + raw + ')'))(); }catch(e){ alert('Firebase 設定格式看不懂，請確認是完整複製貼上（包含最外層的大括號）'); return; }
    if(!cfgObj || !cfgObj.projectId){ alert('這份設定看起來不完整（缺少 projectId），請重新從 Firebase 主控台複製'); return; }
    saveSyncConfig({ firebaseConfig: cfgObj, roomCode });
    _fbDb = null;
    document.getElementById('syncStatusLine').textContent = '連接中…';
    const ok = await testSyncConnection();
    if(!ok){
      document.getElementById('syncStatusLine').textContent = '連接失敗，請檢查設定內容，以及 Firestore 資料庫是否已建立、安全性規則是否允許讀寫。';
      return;
    }
    alert('雲端同步設定完成！頁面即將重新整理套用。');
    location.reload();
  };
}
function openSyncModal(){
  insertSyncModalIfMissing();
  const cfg = getSyncConfig();
  document.getElementById('syncFirebaseConfig').value = cfg ? JSON.stringify(cfg.firebaseConfig, null, 2) : '';
  document.getElementById('syncRoomCode').value = cfg ? cfg.roomCode : '';
  document.getElementById('syncStatusLine').textContent = cfg
    ? '目前已連接房間：' + cfg.roomCode
    : '目前尚未設定，資料只存在這台裝置。設定完成後，其他裝置只要輸入同一組 Firebase 設定＋同一個房間代碼，就會同步在一起。';
  document.getElementById('syncModalOverlay').classList.add('open');
}
function closeSyncModal(){
  const el = document.getElementById('syncModalOverlay');
  if(el) el.classList.remove('open');
}
function renderSyncStatus(){
  const el = document.getElementById('syncStatus');
  if(!el) return;
  const cfg = getSyncConfig();
  el.textContent = cfg ? ('☁ 雲端同步已開啟（房間：'+cfg.roomCode+'）') : '☁ 尚未設定雲端同步（僅本機儲存）';
}
function wireSyncUI(){
  const btn = document.getElementById('btnSyncSettings');
  if(btn) btn.onclick = openSyncModal;
  renderSyncStatus();
}
