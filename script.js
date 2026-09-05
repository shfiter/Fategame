// 請務必換成你的真實 LINE Channel ID
const CHANNEL_ID = '2011462481'; 
const REDIRECT_URI = window.location.origin + window.location.pathname;

window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const authCode = urlParams.get('code');

    if (authCode) {
        // 抓到授權碼，進入載入畫面
        switchView('view-loading');
        fetchLineProfile(authCode);
    } else {
        // 預設顯示登入畫面
        switchView('view-login');
    }
});

// 點擊登入導向 LINE
document.getElementById('line-login-btn').addEventListener('click', function() {
    const lineLoginURL = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${CHANNEL_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=random_string_xyz&scope=profile%20openid`;
    window.location.href = lineLoginURL;
});

// 切換畫面輔助函式
function switchView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
}

// 模擬向後端交換 LINE 資料（現階段先用假資料讓畫面順利展示）
function fetchLineProfile(code) {
    // 註：用 code 去跟 LINE 換 Token 需要透過後端 API（避免 Secret 外洩）
    // 這邊我們前端先做一個模擬展示，確認畫面跟流程順暢
    setTimeout(() => {
        const mockLineUser = {
            name: "邱柏翔 (測試帳號)",
            userId: "U1234567890abcdef..." // 這邊未來會是真實的 Line UID
        };

        // 顯示在畫面上
        document.getElementById('display-name').textContent = mockLineUser.name;
        document.getElementById('display-uid').textContent = mockLineUser.userId;

        // 切換到個人資訊畫面
        switchView('view-profile');
    }, 1000);
}