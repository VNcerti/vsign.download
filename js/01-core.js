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
   Supports: https://vsign.download/?udid=XXXX
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

function showError(message){

    const box=document.getElementById("errorBox");

    box.textContent=message||"Có lỗi xảy ra.";

    box.classList.add("show");
}

function hideError(){

    document
        .getElementById("errorBox")
        .classList.remove("show");
}
