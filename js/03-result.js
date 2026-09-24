/* ============================================================
   RESULT
============================================================ */

function showResult(udid){

    document.getElementById("homeView").style.display="none";

    const result=document.getElementById("resultView");

    result.classList.add("show");

    document.getElementById("resultUdid").textContent=udid;

    const install=document.getElementById("installButton");

    install.classList.remove("expired");
    install.disabled=false;
    install.textContent="Cài đặt ngay";

    install.onclick=function(){

        if(
            !state.installUrl ||
            Date.now()/1000>=state.expiresAt
        ){
            expireResult();
            return;
        }

        window.location.href=state.installUrl;
    };

    startCountdown();
}


/* ============================================================
   COUNTDOWN
============================================================ */

function startCountdown(){

    stopCountdown();

    updateCountdown();

    state.countdownTimer=setInterval(
        updateCountdown,
        250
    );
}


function stopCountdown(){

    if(state.countdownTimer){

        clearInterval(state.countdownTimer);

        state.countdownTimer=null;
    }
}


function updateCountdown(){

    const remaining=Math.max(
        0,
        state.expiresAt-Date.now()/1000
    );

    const totalSeconds=Math.ceil(remaining);

    const minutes=Math.floor(totalSeconds/60);
    const seconds=totalSeconds%60;

    document.getElementById("countdown").textContent=
        String(minutes).padStart(2,"0")
        +":"
        +String(seconds).padStart(2,"0");

    if(totalSeconds<=0){
        expireResult();
    }
}


function expireResult(){

    stopCountdown();

    const install=document.getElementById("installButton");

    install.disabled=true;
    install.classList.add("expired");
    install.textContent="Đã hết hạn";

    document.getElementById("countdown").textContent="00:00";
}


/* ============================================================
   RESET
============================================================ */

function resetApp(){

    stopCountdown();

    if(state.progressAnimation){
        cancelAnimationFrame(state.progressAnimation);
    }

    state.signing=false;
    state.installUrl="";
    state.expiresAt=0;

    document.getElementById("resultView")
        .classList.remove("show");

    document.getElementById("homeView")
        .style.display="";

    document.getElementById("signButton")
        .disabled=false;

    udidInput.value="";

    hideError();

    setProgress(0);
    setStep(0);
    switchTab("auto");

    window.scrollTo({
        top:0,
        behavior:"smooth"
    });
}


/* ============================================================
   INITIAL
============================================================ */

setProgress(0);
setStep(0);
