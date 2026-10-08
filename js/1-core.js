"use strict";

const state = {
    signing:false,
    installUrl:"",
    expiresAt:0,
    countdownTimer:null,
    progressAnimation:null
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
