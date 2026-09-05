const https = require('https');
const querystring = require('querystring');

module.exports = async function (context, req) {
    try {
        // 為了安全，先把 sql 寫在裡面動態引入，避免頂層載入失敗
        const sql = require('mssql');
        
        const code = req.body && req.body.code;
        const redirectUri = req.body && req.body.redirectUri;

        if (!code) {
            context.res = { status: 400, body: { error: "缺少授權碼 code" } };
            return;
        }

        // 測試回傳：如果能執行到這裡，代表至少進入 Function 了
        context.res = {
            status: 200,
            body: { message: "API 成功進入，準備開始驗證" }
        };

    } catch (error) {
        // 這裡會攔截到所有包括 require 失敗、語法錯誤或執行期錯誤
        context.res = {
            status: 500,
            headers: {
                'x-fatal-error': encodeURIComponent(error.message)
            },
            body: {
                fatalError: error.message,
                stack: error.stack
            }
        };
    }
};