const CHANNEL_ID = '1657218671'; // 你的 LINE Channel ID
const REDIRECT_URI = window.location.origin + window.location.pathname;

window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');

    if (authCode) {
        // 1. 如果網址帶有 code，代表剛從 LINE 授權回來
        switchView('view-loading');
        exchangeCodeForToken(authCode);
    } else {
        // 2. 檢查本機有沒有有效的登入 Session (維持一天)
        checkLocalSession();
    }
});

// 點擊登入導向 LINE
document.getElementById('line-login-btn').addEventListener('click', function() {
    const lineLoginURL = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${CHANNEL_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=random_string_xyz&scope=profile%20openid`;
    window.location.href = lineLoginURL;
});

// 點擊登出按鈕
document.getElementById('logout-btn').addEventListener('click', function() {
    localStorage.removeItem('line_user_session');
    // 清除網址上的 code 參數，回到純淨首頁
    window.location.href = REDIRECT_URI;
});

// 切換畫面輔助函式
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

// 檢查本機 Session 是否在 24 小時內
function checkLocalSession() {
    const savedSession = localStorage.getItem('line_user_session');
    
    if (savedSession) {
        try {
            const sessionData = JSON.parse(savedSession);
            const now = new Date().getTime();

            // 檢查是否過期 (24 小時)
            if (now < sessionData.expiry) {
                // 尚未過期，直接還原使用者狀態，免重複登入！
                renderDashboard(sessionData.name);
                return;
            }
        } catch (e) {
            console.error('解析 Session 失敗', e);
        }
    }
    
    // 如果沒有 Session 或已過期，顯示登入畫面
    switchView('view-login');
}

// 渲染主畫面與動態按鈕
function renderDashboard(name) {
    document.getElementById('display-name').textContent = name;
    
    // 這裡未來可以根據從資料庫查出來的身分（isCaptain）動態決定按鈕文字與行為
    const actionBtn = document.getElementById('primary-action-btn');
    actionBtn.textContent = "進入賽事報名表單";
    
    actionBtn.onclick = function() {
        alert("即將進入下一步的報名與抽籤功能！");
    };

    switchView('view-dashboard');
}

// 向後端交換 LINE 資料並寫入 24 小時 Session
async function exchangeCodeForToken(code) {
    try {
        const response = await fetch('/api/line-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code, redirectUri: REDIRECT_URI })
        });

        const data = await response.json();

        if (response.ok) {
            // 包裝使用者資料與 24 小時後過期的時間戳記
            const sessionData = {
                userId: data.userId,
                name: data.name,
                expiry: new Date().getTime() + (24 * 60 * 60 * 1000) // 24小時
            };

            // 存入 localStorage
            localStorage.setItem('line_user_session', JSON.stringify(sessionData));

            // 清理網址列的 code 參數，保持畫面乾淨
            window.history.replaceState({}, document.title, REDIRECT_URI);

            // 顯示主畫面
            renderDashboard(data.name);
        } else {
            alert('登入驗證失敗：' + (data.error || '未知錯誤'));
            switchView('view-login');
        }
    } catch (err) {
        console.error('API 呼叫失敗', err);
        alert('伺服器連線發生錯誤');
        switchView('view-login');
    }
}