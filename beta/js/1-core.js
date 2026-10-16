"use strict";

const state = {
    signing:false,
    installUrl:"",
    expiresAt:0,
    countdownTimer:null,
    progressAnimation:null,
    udidRequestToken:"",
    udidPollTimer:null,
    udidRequestInProgress:false
};


/* ============================================================
   TAB
============================================================ */

function switchTab(tab){

    if(state.signing){
        return;
    }

    const tabs=document.getElementById("tabs");
    const autoTab=document.getElementById("autoTab");
    const manualTab=document.getElementById("manualTab");
    const autoPanel=document.getElementById("autoPanel");
    const manualPanel=document.getElementById("manualPanel");

    if(tab==="manual"){

        tabs.classList.add("manual");

        autoTab.classList.remove("active");
        manualTab.classList.add("active");

        autoPanel.classList.remove("active");
        manualPanel.classList.add("active");

    }else{

        tabs.classList.remove("manual");

        manualTab.classList.remove("active");
        autoTab.classList.add("active");

        manualPanel.classList.remove("active");
        autoPanel.classList.add("active");

    }
}


/* ============================================================
   INPUT
============================================================ */

const udidInput=document.getElementById("udid");
const udidInputWrap=udidInput ? udidInput.closest(".input-wrap") : null;

const signButton = document.getElementById("signButton");
const VSIGN_API_BASE = "https://api.vsign.download";

function updatePrimaryButton() {
    if (!signButton || !udidInput) return;
    const hasUdid = udidInput.value.trim().length > 0;
    signButton.textContent = hasUdid ? "Ký ứng dụng" : "Lấy UDID";
    signButton.setAttribute("aria-label", signButton.textContent);
}

async function handlePrimaryAction() {
    if (!udidInput) return;
    if (udidInput.value.trim()) {
        await startSigning();
    } else {
        await startUdidRetrieval();
    }
}

function stopUdidPolling() {
    if (state.udidPollTimer) {
        clearInterval(state.udidPollTimer);
        state.udidPollTimer = null;
    }
}

function applyRetrievedUdid(udid) {
    const normalized = String(udid || "").trim().toUpperCase();
    if (!isValidUdid(normalized) || !udidInput) return false;
    stopUdidPolling();
    state.udidRequestInProgress = false;
    state.udidRequestToken = "";
    try { sessionStorage.removeItem("vsign_udid_token"); } catch (_) {}
    udidInput.value = normalized;
    setUdidSuccessState(true);
    udidInput.dispatchEvent(new Event("input", { bubbles: true }));
    udidInput.dispatchEvent(new Event("change", { bubbles: true }));
    setUdidSuccessState(true);
    updatePrimaryButton();
    try {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete("udid");
        cleanUrl.searchParams.delete("udid_token");
        window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    } catch (_) {}
    const helper = document.querySelector("#autoPanel .helper");
    if (helper) helper.textContent = "Đã lấy UDID thành công. Bạn có thể bấm Ký ứng dụng.";
    return true;
}

async function pollUdidStatus(token) {
    if (!token) return;
    try {
        const response = await fetch(
            `${VSIGN_API_BASE}/api/udid/status/${encodeURIComponent(token)}`,
            { method: "GET", cache: "no-store" }
        );
        if (!response.ok) return;
        const data = await response.json();
        if (data && data.status === "complete" && data.udid) {
            applyRetrievedUdid(data.udid);
        } else if (data && data.status === "expired") {
            stopUdidPolling();
            state.udidRequestInProgress = false;
            state.udidRequestToken = "";
            try { sessionStorage.removeItem("vsign_udid_token"); } catch (_) {}
            updatePrimaryButton();
            showError("Phiên lấy UDID đã hết hạn. Vui lòng nhấn Lấy UDID để thử lại.");
        }
    } catch (error) {
        console.warn("UDID status polling:", error);
    }
}

async function startUdidRetrieval() {
    if (state.udidRequestInProgress) return;
    state.udidRequestInProgress = true;
    hideError();
    if (signButton) {
        signButton.disabled = true;
        signButton.classList.add("udid-loading");
        signButton.textContent = "Đang chuẩn bị...";
    }
    try {
        const response = await fetch(`${VSIGN_API_BASE}/api/udid/request`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ return_url: window.location.origin + window.location.pathname })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.token || !data.profile_url) {
            throw new Error(data.message || "Không thể tạo phiên lấy UDID. Vui lòng thử lại.");
        }
        state.udidRequestToken = data.token;
        try { sessionStorage.setItem("vsign_udid_token", data.token); } catch (_) {}
        stopUdidPolling();
        state.udidPollTimer = setInterval(() => pollUdidStatus(data.token), 2000);
        pollUdidStatus(data.token);
        window.location.href = data.profile_url;
    } catch (error) {
        state.udidRequestInProgress = false;
        showError(error.message || "Không thể bắt đầu lấy UDID. Vui lòng thử lại.");
    } finally {
        if (signButton) {
            signButton.disabled = false;
            signButton.classList.remove("udid-loading");
            updatePrimaryButton();
        }
    }
}

function resumeUdidRetrieval() {
    let token = new URLSearchParams(window.location.search).get("udid_token") || "";
    if (!token) {
        try { token = sessionStorage.getItem("vsign_udid_token") || ""; } catch (_) {}
    }
    if (!token) return;
    state.udidRequestToken = token;
    state.udidRequestInProgress = true;
    state.udidPollTimer = setInterval(() => pollUdidStatus(token), 2000);
    pollUdidStatus(token);
}


/* ============================================================
   UDID SUCCESS STATE
============================================================ */
function setUdidSuccessState(success){
    if(!udidInput) return;
    udidInput.classList.toggle("udid-success",!!success);
    if(udidInputWrap){
        udidInputWrap.classList.toggle("udid-success-wrap",!!success);
    }
}

/* ============================================================
   AUTO-FILL UDID FROM URL
============================================================ */
(function autoFillUdidFromUrl(){
    if(!udidInput) return;

    const params=new URLSearchParams(window.location.search);
    const urlUdid=(params.get("udid")||"")
        .trim()
        .toUpperCase()
        .replace(/[^0-9A-F-]/g,"");

    if(!urlUdid || !isValidUdid(urlUdid)) return;

    udidInput.value=urlUdid;
    setUdidSuccessState(true);

    udidInput.dispatchEvent(new Event("input",{bubbles:true}));
    udidInput.dispatchEvent(new Event("change",{bubbles:true}));

    setUdidSuccessState(true);
})();

udidInput.addEventListener("input",function(){

    this.value=this.value
        .toUpperCase()
        .replace(/[^0-9A-F-]/g,"");

    setUdidSuccessState(isValidUdid(this.value));
    updatePrimaryButton();
    hideError();
});


function isValidUdid(value){

    return (
        /^[0-9A-F]{8}-[0-9A-F]{16}$/.test(value)
        ||
        /^[0-9A-F]{40}$/.test(value)
    );
}


/* ============================================================
   ERROR
============================================================ */

function isNoOrderError(message){

    const text=String(message||"");

    return (
        /UDID\s+không\s+tồn\s+tại/i.test(text)
        ||
        /không\s+tồn\s+tại\s+trên\s+hệ\s+thống/i.test(text)
    );
}

function isBannedError(message){

    const text=String(message||"");

    return (
        /bị\s+tạm\s+cấm/i.test(text)
        ||
        /đã\s+bị\s+tạm\s+cấm/i.test(text)
        ||
        /tạm\s+cấm\s+sử\s+dụng/i.test(text)
    );
}

function showNoOrderAlert(){

    const alert=document.getElementById("noOrderAlert");
    if(!alert) return;

    alert.classList.add("show");
    alert.setAttribute("aria-hidden","false");

    document.body.style.overflow="hidden";
}

function hideNoOrderAlert(){

    const alert=document.getElementById("noOrderAlert");
    if(!alert) return;

    alert.classList.remove("show");
    alert.setAttribute("aria-hidden","true");

    document.body.style.overflow="";
}


/* ============================================================
   BANNED UDID ALERT
============================================================ */

function showBannedAlert(reason){

    const alert=document.getElementById("bannedAlert");
    const reasonEl=document.getElementById("bannedReason");

    if(!alert) return;

    if(reasonEl){
        // textContent → chống XSS, lý do ban chứa HTML cũng không chạy
        reasonEl.textContent=reason||"Không có lý do";
    }

    alert.classList.add("show");
    alert.setAttribute("aria-hidden","false");

    document.body.style.overflow="hidden";
}

function hideBannedAlert(){

    const alert=document.getElementById("bannedAlert");
    if(!alert) return;

    alert.classList.remove("show");
    alert.setAttribute("aria-hidden","true");

    document.body.style.overflow="";
}


/**
 * Gọi API kiểm tra ban.
 * Trả về: { banned: true, reason: "..." } hoặc { banned: false }
 */
async function checkBanned(udid){

    try{
        const res=await fetch(
            "https://api.vsign.download/api/check-ban",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({udid:udid})
            }
        );

        if(!res.ok){
            return {banned:false};
        }

        const data=await res.json();

        if(data && data.banned){
            return {
                banned:true,
                reason:data.reason||""
            };
        }

        return {banned:false};

    }catch(err){
        console.warn("checkBanned error:",err);
        return {banned:false};
    }
}


/* ============================================================
   SHOW ERROR
   ✅ FIX: Tự động phát hiện nội dung "bị cấm" → mở alert banned
============================================================ */

function showError(message, reason){

    const text=message||"Có lỗi xảy ra.";

    // Trường hợp 1: UDID không tồn tại → alert cũ
    if(isNoOrderError(text)){
        hideError();
        showNoOrderAlert();
        return;
    }

    // Trường hợp 2: UDID bị cấm → alert banned (form giống hệt)
    if(isBannedError(text)){
        hideError();
        showBannedAlert(reason||"");
        return;
    }

    // Trường hợp 3: lỗi thông thường → error box nhỏ
    const box=document.getElementById("errorBox");

    box.textContent=text;

    box.classList.add("show");
}

function hideError(){

    const box=document.getElementById("errorBox");

    if(box){
        box.classList.remove("show");
    }

    hideNoOrderAlert();
    hideBannedAlert();
}

updatePrimaryButton();
resumeUdidRetrieval();
