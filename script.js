const CHANNEL_ID = '2011462481'; 
const REDIRECT_URI = window.location.origin + window.location.pathname;

window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');

    if (authCode) {
        switchView('view-loading');
        // 呼叫後端 API 來換取真實資料
        exchangeCodeForToken(authCode);
    } else {
        switchView('view-login');
    }
});

document.getElementById('line-login-btn').addEventListener('click', function() {
    const lineLoginURL = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${CHANNEL_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=random_string_xyz&scope=profile%20openid`;
    window.location.href = lineLoginURL;
});

function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

// 實際呼叫後端 API
async function exchangeCodeForToken(code) {
    try {
        // 呼叫我們在 Azure 上的後端 API 路由 (假設路徑叫 /api/line-login)
        const response = await fetch('/api/line-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code: code, redirectUri: REDIRECT_URI })
        });

        const data = await response.json();

        if (response.ok) {
            // 成功拿到 LINE 真正的名稱與 UID！
            document.getElementById('display-name').textContent = data.name;
            document.getElementById('display-uid').textContent = data.userId;
            switchView('view-profile');
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