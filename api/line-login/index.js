const https = require('https');
const querystring = require('querystring');
const sql = require('mssql');

const CURRENT_SEASON = 7;

module.exports = async function (context, req) {
    try {
        const code = req.body && req.body.code;
        const redirectUri = req.body && req.body.redirectUri;

        if (!code) {
            context.res = { status: 400, body: { error: "缺少授權碼 code" } };
            return;
        }

        const clientId = process.env.LINE_CHANNEL_ID;
        const clientSecret = process.env.LINE_CHANNEL_SECRET;

        // 1. 向 LINE 交換 Token
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

        // 2. 取得 LINE 使用者個資
        const profileData = await getFromLine('api.line.me', '/v2/profile', tokenData.access_token);
        if (!profileData.userId) {
            throw new Error('無法取得 LINE 使用者個資');
        }

        const lineUID = profileData.userId;
        const lineName = profileData.displayName;

        // 3. 連線資料庫設定
        const dbConfig = {
            server: 'sethmajong.database.windows.net',
            database: 'free-sql-db-2262728',
            authentication: {
                type: 'azure-active-directory-service-principal-secret',
                options: {
                    clientId: process.env.WEB_CLIENT_ID,
                    clientSecret: process.env.WEB_CLIENT_SECRET,
                    tenantId: process.env.TENANT_ID
                }
            },
            options: {
                encrypt: true,
                trustServerCertificate: false
            }
        };

        let pool = await sql.connect(dbConfig);
        const result = await pool.request()
            .input('lineUID', sql.VarChar, lineUID)
            .input('season', sql.Int, CURRENT_SEASON)
            .query('SELECT Name, Player, Captain, IsAdmin FROM Fate_SeasonParticipants WHERE LineUID = @lineUID AND Season = @season');

        let dbName = lineName;
        let isApproved = false;
        let roles = { player: false, captain: false, isAdmin: false };

        if (result.recordset.length > 0) {
            isApproved = true;
            const user = result.recordset[0];
            dbName = user.Name;
            roles.player = Boolean(user.Player);
            roles.captain = Boolean(user.Captain);
            roles.isAdmin = Boolean(user.IsAdmin);
        }

        context.res = {
            status: 200,
            body: {
                userId: lineUID,
                name: dbName,
                isApproved: isApproved,
                roles: roles
            }
        };

    } catch (error) {
        context.res = {
            status: 500,
            headers: {
                'x-error-message': encodeURIComponent(error.message || 'Unknown error'),
                'x-error-stack': encodeURIComponent(error.stack || '')
            },
            body: {
                error: error.message,
                stack: error.stack
            }
        };
    }
};

// Helper 函式保持不變...
function postToLine(host, path, data) {
    return new Promise((resolve, reject) => {
        const postData = querystring.stringify(data);
        const options = {
            hostname: host, port: 443, path: path, method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } 
                catch (e) { reject(new Error('解析 LINE 回應失敗: ' + body)); }
            });
        });
        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
    });
}

function getFromLine(host, path, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: host, port: 443, path: path, method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); } 
                catch (e) { reject(new Error('解析 LINE Profile 失敗: ' + body)); }
            });
        });
        req.on('error', (e) => reject(e));
        req.end();
    });
}