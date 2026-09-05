module.exports = async function (context, req) {
    context.res = {
        status: 200,
        body: { message: "Hello from line-login" }
    };
};