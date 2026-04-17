// ============================================================
// firebase-loader.js
// Firebase認証 + Storage からOBJをロードして handleFiles() へ渡す
//
// index.html の </body> 直前に以下を追加するだけ:
//   <script type="module" src="firebase-loader.js"></script>
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getStorage, ref, getDownloadURL, listAll }
    from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js';

// ============================================================
// Firebase 設定
// ============================================================
const firebaseConfig = {
    apiKey:            "AIzaSyBc4WQFp6pOKffDYk53zuflyWe38DSBGUg",
    authDomain:        "liversurgerysimweb.firebaseapp.com",
    projectId:         "liversurgerysimweb",
    storageBucket:     "liversurgerysimweb.firebasestorage.app",
    messagingSenderId: "918868470439",
    appId:             "1:918868470439:web:625f7164ef4a1ab65ac982"
};

const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const storage = getStorage(app);

// ============================================================
// ログイン画面を body に挿入
// ============================================================
document.body.insertAdjacentHTML('beforeend', `
<div id="fb-login-overlay" style="
    position:fixed; inset:0; z-index:9999;
    background:rgba(10,12,20,0.97);
    display:flex; align-items:center; justify-content:center;
    font-family:Arial,Helvetica,sans-serif;">
  <div style="background:#151c2c; border:1px solid #2a3a55; border-radius:14px;
              padding:36px 40px; min-width:320px; max-width:380px; width:90%;">
    <div style="text-align:center; margin-bottom:28px;">
      <div style="font-size:22px; font-weight:bold; color:#00d4ff; letter-spacing:0.04em;">
        LiverSurgery Sim
      </div>
      <div style="font-size:12px; color:#556; margin-top:6px;">ログインして続行</div>
    </div>
    <div style="margin-bottom:14px;">
      <label style="display:block; font-size:12px; color:#888; margin-bottom:5px;">メールアドレス</label>
      <input id="fb-email" type="email" autocomplete="email"
        style="width:100%; padding:10px 12px; background:#0d1220; border:1px solid #2a3a55;
               border-radius:7px; color:#fff; font-size:14px; box-sizing:border-box;"
        placeholder="doctor@hospital.com">
    </div>
    <div style="margin-bottom:22px;">
      <label style="display:block; font-size:12px; color:#888; margin-bottom:5px;">パスワード</label>
      <input id="fb-password" type="password" autocomplete="current-password"
        style="width:100%; padding:10px 12px; background:#0d1220; border:1px solid #2a3a55;
               border-radius:7px; color:#fff; font-size:14px; box-sizing:border-box;"
        placeholder="••••••••">
    </div>
    <button id="fb-login-btn"
      style="width:100%; padding:12px; background:#0a4a7a; border:1px solid #00d4ff55;
             border-radius:8px; color:#00d4ff; font-size:15px; font-weight:bold;
             cursor:pointer;">
      ログイン
    </button>
    <div id="fb-login-error"
      style="margin-top:12px; font-size:12px; color:#ff6b6b; text-align:center; min-height:18px;">
    </div>
  </div>
</div>`);

// ============================================================
// ログイン処理
// ============================================================
function doLogin() {
    const email    = document.getElementById('fb-email').value.trim();
    const password = document.getElementById('fb-password').value;
    const errEl    = document.getElementById('fb-login-error');
    const btn      = document.getElementById('fb-login-btn');
    if (!email || !password) { errEl.textContent = 'メールとパスワードを入力してください'; return; }
    btn.textContent = 'ログイン中...';
    btn.disabled = true;
    errEl.textContent = '';
    signInWithEmailAndPassword(auth, email, password).catch(err => {
        btn.textContent = 'ログイン';
        btn.disabled = false;
        const msgs = {
            'auth/invalid-credential':  'メールアドレスまたはパスワードが違います',
            'auth/user-not-found':      'ユーザーが見つかりません',
            'auth/wrong-password':      'パスワードが違います',
            'auth/invalid-email':       'メールアドレスの形式が正しくありません',
            'auth/too-many-requests':   'しばらく待ってから再試行してください',
        };
        errEl.textContent = msgs[err.code] || 'ログイン失敗: ' + err.code;
    });
}
document.getElementById('fb-login-btn').addEventListener('click', doLogin);
document.getElementById('fb-password').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });

// ============================================================
// 認証状態の監視
// ============================================================
onAuthStateChanged(auth, user => {
    const overlay = document.getElementById('fb-login-overlay');
    if (user) {
        if (overlay) overlay.remove();
        console.log('[Firebase] ログイン:', user.email);
        // ログアウトボタンを右上に表示
        if (!document.getElementById('fb-logout-btn')) {
            const btn = document.createElement('button');
            btn.id = 'fb-logout-btn';
            btn.textContent = user.email + '  ログアウト';
            btn.style.cssText = 'position:fixed;top:8px;right:8px;z-index:1000;' +
                'padding:5px 12px;background:rgba(10,20,40,0.85);border:1px solid #2a3a55;' +
                'border-radius:6px;color:#556;font-size:11px;cursor:pointer;';
            btn.addEventListener('click', () => signOut(auth));
            document.body.appendChild(btn);
        }
    } else {
        if (overlay) overlay.style.display = 'flex';
        const btn = document.getElementById('fb-logout-btn');
        if (btn) btn.remove();
    }
});

// ============================================================
// Firebase Storage からOBJを一括ロード
// ============================================================
async function loadOBJsFromFirebase(folderPath = 'models') {
    const statusEl = document.getElementById('fb-load-status');
    function setStatus(msg, color) {
        if (statusEl) { statusEl.style.color = color || '#888'; statusEl.textContent = msg; }
    }
    try {
        setStatus('Storage から取得中...');
        const result   = await listAll(ref(storage, folderPath));
        const objItems = result.items.filter(item => item.name.match(/\.obj$/i));
        if (objItems.length === 0) throw new Error('OBJファイルが見つかりません: ' + folderPath);

        setStatus(objItems.length + '個のOBJをダウンロード中...');
        const files = await Promise.all(objItems.map(async item => {
            const url  = await getDownloadURL(item);
            const resp = await fetch(url);
            if (!resp.ok) throw new Error('fetch失敗: ' + item.name);
            const blob = await resp.blob();
            return new File([blob], item.name, { type: 'text/plain' });
        }));

        setStatus('OK: ' + files.map(f => f.name).join(', '), '#7dff7d');

        // 既存パイプラインへ（ドロップと同じ処理）
        handleFiles(files);

        // 2秒後にボタンに戻す（ロード済み表示付き）
        setTimeout(() => {
            collapseFirebasePanel();
            const toggle = document.getElementById('firebase-toggle-btn');
            if (toggle) {
                toggle.textContent = 'Firebase \u2713';
                toggle.style.color = '#7dff7d';
            }
        }, 2000);

    } catch (e) {
        setStatus(e.message, '#ff6b6b');
        console.error('[Firebase Load]', e);
    }
}

// ============================================================
// Firebase ロードUI を folder-drop-area の隣に挿入（トグル式）
// ============================================================
function injectFirebaseUI() {
    const dropArea = document.getElementById('folder-drop-area');
    if (!dropArea || document.getElementById('firebase-load-area')) return;

    // 小さいトグルボタン
    const toggle = document.createElement('div');
    toggle.className = 'overlay';
    toggle.id = 'firebase-toggle-btn';
    toggle.style.cssText = 'bottom:12px;left:250px;display:block;' +
        'border:1px solid #1a4a7a;border-radius:8px;' +
        'padding:8px 14px;cursor:pointer;font-size:12px;color:#00d4ff;' +
        'font-weight:bold;user-select:none;transition:all 0.15s;';
    toggle.textContent = 'Firebase';
    toggle.addEventListener('click', () => window.expandFirebasePanel());
    dropArea.insertAdjacentElement('afterend', toggle);

    // 展開パネル（初期非表示）
    const ui = document.createElement('div');
    ui.className = 'overlay';
    ui.id = 'firebase-load-area';
    ui.style.cssText = 'bottom:12px;left:250px;display:none;' +
        'border:2px dashed #1a4a7a;border-radius:10px;' +
        'padding:12px 16px;font-size:13px;color:#aaa;min-width:220px;';
    toggle.insertAdjacentElement('afterend', ui);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectFirebaseUI);
} else {
    injectFirebaseUI();
}

window.loadOBJsFromFirebase = loadOBJsFromFirebase;

window.expandFirebasePanel = function() {
    const area = document.getElementById('firebase-load-area');
    const toggle = document.getElementById('firebase-toggle-btn');
    if (!area) return;
    // トグルボタンを隠してパネルを表示
    if (toggle) toggle.style.display = 'none';
    area.style.display = 'block';
    area.style.minWidth = '220px';
    area.style.padding = '12px 16px';
    area.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <span style="color:#00d4ff;font-weight:bold;font-size:12px;">Firebase から読み込む</span>
            <span onclick="collapseFirebasePanel()" style="color:#666;cursor:pointer;font-size:16px;padding:0 4px;">&times;</span>
        </div>
        <select id="fb-folder-select"
            style="width:100%;padding:6px 8px;background:#0d1220;border:1px solid #2a3a55;
                   border-radius:5px;color:#ccc;font-size:12px;margin-bottom:8px;">
            <option value="models">models（デフォルト）</option>
        </select>
        <button onclick="loadOBJsFromFirebase(document.getElementById('fb-folder-select').value)"
            style="width:100%;padding:7px;background:#0a3a5a;color:#00d4ff;
                   border:1px solid #00d4ff44;border-radius:5px;
                   cursor:pointer;font-size:12px;font-weight:bold;">
            &#9654; Firebase Load
        </button>
        <div id="fb-load-status"
            style="font-size:11px;color:#888;margin-top:5px;min-height:16px;"></div>`;
};

window.collapseFirebasePanel = function() {
    const area = document.getElementById('firebase-load-area');
    const toggle = document.getElementById('firebase-toggle-btn');
    if (area) area.style.display = 'none';
    if (toggle) toggle.style.display = 'block';
};
