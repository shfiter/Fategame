const axios = require('axios'); // 如果沒有 axios，也可以用 Node.js 內建的 fetch

module.exports = async function (context, req) {
    const code = req.body && req.body.code;
    const redirectUri = req.body && req.body.redirectUri;

    if (!code) {
        context.res = {
            status: 400,
            body: { error: "缺少授權碼 code" }
        };
        return;
    }

    // 從 Azure 應用程式設定 (Environment Variables) 讀取你的 LINE 密鑰
    const clientId = process.env.LINE_CHANNEL_ID;
    const clientSecret = process.env.LINE_CHANNEL_SECRET;

    try {
        // 1. 用 code 跟 LINE 交換 Access Token
        const tokenParams = new URLSearchParams();
        tokenParams.append('grant_type', 'authorization_code');
        tokenParams.append('code', code);
        tokenParams.append('redirect_uri', redirectUri);
        tokenParams.append('client_id', clientId);
        tokenParams.append('client_secret', clientSecret);

        const tokenResponse = await axios.post('https://api.line.me/oauth2/v2.1/token', tokenParams);
        const accessToken = tokenResponse.data.access_token;

        // 2. 用 Access Token 跟 LINE 取得使用者個人資料 (名稱、UID)
        const profileResponse = await axios.get('https://api.line.me/v2/profile', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        const lineUser = profileResponse.data;

        // 3. 把真實資料回傳給前端
        context.res = {
            status: 200,
            body: {
                userId: lineUser.userId,
                name: lineUser.displayName
            }
        };

    } catch (error) {
        context.log.error('LINE 登入交換失敗:', error.response ? error.response.data : error.message);
        context.res = {
            status: 500,
            body: { error: "無法向 LINE 驗證身分" }
        };
    }
};