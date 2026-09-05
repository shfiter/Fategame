const https = require('https');
const querystring = require('querystring');
const sql = require('mssql');

const CURRENT_SEASON = 7; // 📌 目前系統的預設屆數

// 🔐 使用 WEB 專屬的 App 註冊身分連線設定 (Service Principal 密文驗證)
const dbConfig = {
    server: 'sethmajong.database.windows.net', // 你的 Azure SQL 伺服器名稱
    database: 'free-sql-db-2262728',          // 你的資料庫名稱
    authentication: {
        type: 'azure-active-directory-service-principal-secret',
        options: {
            clientId: process.env.WEB_CLIENT_ID,
            clientSecret: process.env.WEB_CLIENT_SECRET,
            tenantId: process.env.TENANT_ID
        }
    },
    options: {
        encrypt: true,                  // 雲端 SQL 強制加密
        trustServerCertificate: false   // 生產環境建議設為 false
    }
};

let pool = null;

async function getConnection() {
    if (pool) return pool;
    try {
        pool = await sql.connect(dbConfig);
        return pool;
    } catch (err) {
        console.error('資料庫連線失敗: ', err);
        throw err;
    }
}

module.exports = async function (context, req) {
    const code = req.body && req.body.code;
    const redirectUri = req.body && req.body.redirectUri;

    if (!code) {
        context.res = { status: 400, body: { error: "缺少授權碼 code" } };
        return;
    }

    const clientId = process.env.LINE_CHANNEL_ID;
    const clientSecret = process.env.LINE_CHANNEL_SECRET;

    try {
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

        // 3. 透過 WEB 專屬身分查詢 Azure SQL：檢查他在當前屆數是否已存在於正式名單 (Fate_SeasonParticipants)
        const db = await getConnection();
        const result = await db.request()
            .input('lineUID', sql.VarChar, lineUID)
            .input('season', sql.Int, CURRENT_SEASON)
            .query('SELECT Name, Player, Captain, IsAdmin FROM Fate_SeasonParticipants WHERE LineUID = @lineUID AND Season = @season');

        let dbName = lineName;
        let isApproved = false; // 預設為未入選正式名單
        let roles = {
            player: false,
            captain: false,
            isAdmin: false
        };

        if (result.recordset.length > 0) {
            // 🎉 已經是正式名單成員！
            isApproved = true;
            const user = result.recordset[0];
            dbName = user.Name; // 採用審核後的真實姓名
            roles.player = Boolean(user.Player);
            roles.captain = Boolean(user.Captain);
            roles.isAdmin = Boolean(user.IsAdmin);
        } else {
            // ❌ 尚未入選正式名單（新使用者或未審核通過）
        }

        // 4. 回傳給前端
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
        context.log.error('登入驗證與 DB 查詢失敗:', error.message);
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

// Helper 函式：GET 請求
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