const msalConfig = {
    auth: {
        clientId: "033429bb-8c25-4072-b914-6ee40aa8eace",
        authority: "https://login.microsoftonline.com/common",
        redirectUri: window.location.origin + "/"
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

const msalInstance = new window.msal.PublicClientApplication(msalConfig);

async function initMSAL() {
    await msalInstance.initialize();
    try {
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
            msalInstance.setActiveAccount(response.account);
        }
    } catch (err) {
        console.error("MSAL Redirect Error:", err);
    }
}

async function loginMicrosoft() {
    try {
        const response = await msalInstance.loginPopup({
            scopes: ["user.read", "https://outlook.office.com/SMTP.Send"],
            prompt: "select_account"
        });
        msalInstance.setActiveAccount(response.account);
        return response;
    } catch (error) {
        console.error("Login falhou", error);
        throw error;
    }
}

function getMicrosoftAccount() {
    return msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
}

async function getMicrosoftToken() {
    const account = getMicrosoftAccount();
    if (!account) throw new Error("Usuário não está logado na Microsoft");

    const response = await msalInstance.acquireTokenSilent({
        scopes: ["user.read", "https://outlook.office.com/SMTP.Send"],
        account: account
    });
    return response.accessToken;
}

window.MSAuth = {
    init: initMSAL,
    login: loginMicrosoft,
    getAccount: getMicrosoftAccount,
    getToken: getMicrosoftToken
};

document.addEventListener('DOMContentLoaded', initMSAL);
