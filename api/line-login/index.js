const https = require('https');
const querystring = require('querystring');

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

    const clientId = process.env.LINE_CHANNEL_ID;
    const clientSecret = process.env.LINE_CHANNEL_SECRET;

    try {
        // 1. 交換 Token
        const tokenData = await postToLine('api.line.me', '/oauth2/v2.1/token', {
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: redirectUri,
            client_id: clientId,
            client_secret: clientSecret
        });

        if (!tokenData.access_token) {
            throw new Error(tokenData.error_description || '無法取得 Access Token');
        }

        const accessToken = tokenData.access_token;

        // 2. 取得使用者 Profile
        const profileData = await getFromLine('api.line.me', '/v2/profile', accessToken);

        if (!profileData.userId) {
            throw new Error('無法取得 LINE 使用者個資');
        }

        // 3. 成功回傳
        context.res = {
            status: 200,
            body: {
                userId: profileData.userId,
                name: profileData.displayName
            }
        };

    } catch (error) {
        context.log.error('LINE 登入交換失敗:', error.message);
        context.res = {
            status: 500,
            body: { error: "伺服器內部錯誤: " + error.message }
        };
    }
};

// Helper 函式：POST 請求
function postToLine(host, path, data) {
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify(data);
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('解析 LINE 回應失敗: ' + body));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

// Helper 函式：GET 請求
function getFromLine(host, path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                } catch (e) {
                    reject(new Error('解析 LINE Profile 失敗: ' + body));
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}