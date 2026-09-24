/* ============================================================
   PROGRESS
============================================================ */

const CIRCUMFERENCE=2*Math.PI*60;
const ring=document.getElementById("ringValue");

ring.style.strokeDasharray=CIRCUMFERENCE;
ring.style.strokeDashoffset=CIRCUMFERENCE;


function setProgress(value){

    const safe=Math.max(0,Math.min(100,value));

    document.getElementById("percent").textContent=
        Math.round(safe)+"%";

    ring.style.strokeDashoffset=
        CIRCUMFERENCE-(safe/100)*CIRCUMFERENCE;
}


function setStep(index){

    for(let i=0;i<=5;i++){

        const element=document.getElementById("step"+i);

        if(!element){
            continue;
        }

        element.classList.remove("active","done");

        if(i<index){
            element.classList.add("done");
        }

        if(i===index){
            element.classList.add("active");
        }
    }
}


function updateSigningText(title,sub,step){

    document.getElementById("signTitle").textContent=title;
    document.getElementById("signSub").textContent=sub;

    setStep(step);
}


function animateProgress(from,to,duration,title,sub,step){

    return new Promise(resolve=>{

        const start=performance.now();

        updateSigningText(
            title,
            sub,
            step
        );

        function frame(now){

            const elapsed=now-start;
            const raw=Math.min(elapsed/duration,1);

            const eased=
                1-Math.pow(1-raw,3);

            const value=
                from+((to-from)*eased);

            setProgress(value);

            if(raw<1){

                state.progressAnimation=
                    requestAnimationFrame(frame);

            }else{

                resolve();
            }
        }

        state.progressAnimation=
            requestAnimationFrame(frame);
    });
}


async function runVisualProgress(){

    setProgress(0);

    await animateProgress(
        0,
        7,
        650,
        "Kiểm tra UDID",
        "Đang xác thực định dạng thiết bị...",
        0
    );

    await animateProgress(
        7,
        18,
        850,
        "Kiểm tra đơn hàng",
        "Đang tìm đơn hàng theo UDID...",
        1
    );

    await animateProgress(
        18,
        37,
        1000,
        "Chuẩn bị chứng chỉ",
        "Đang tải và xử lý chứng chỉ...",
        2
    );

    await animateProgress(
        37,
        68,
        1350,
        "Ký ứng dụng",
        "Đang ký IPA trên server...",
        3
    );

    await animateProgress(
        68,
        91,
        1550,
        "Verify & tạo OTA",
        "Đang kiểm tra chữ ký và tạo link cài đặt...",
        4
    );
}


/* ============================================================
   OVERLAY
============================================================ */

function showOverlay(){

    const overlay=document.getElementById("signOverlay");

    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden","false");

    document.body.style.overflow="hidden";
}


function hideOverlay(){

    const overlay=document.getElementById("signOverlay");

    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden","true");

    document.body.style.overflow="";
}


/* ============================================================
   SIGN
============================================================ */

async function startSigning(){

    if(state.signing){
        return;
    }

    const udid=udidInput.value
        .trim()
        .toUpperCase();

    hideError();

    if(!isValidUdid(udid)){

        showError(
            "UDID không đúng định dạng. Vui lòng kiểm tra lại UDID thiết bị."
        );

        udidInput.focus();

        return;
    }

    state.signing=true;

    const button=document.getElementById("signButton");

    button.disabled=true;

    showOverlay();

    const visual=runVisualProgress();

    let response;

    try{

        response=await fetch(
            "https://api.vsign.download/api/sign",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                },
                body:JSON.stringify({
                    udid:udid
                })
            }
        );

    }catch(error){

        state.signing=false;
        button.disabled=false;

        if(state.progressAnimation){
            cancelAnimationFrame(state.progressAnimation);
        }

        hideOverlay();

        showError(
            "Không thể kết nối tới server. Vui lòng thử lại."
        );

        return;
    }


    let data={};

    try{
        data=await response.json();
    }catch(error){
        data={};
    }


    if(!response.ok || !data.success){

        state.signing=false;
        button.disabled=false;

        if(state.progressAnimation){
            cancelAnimationFrame(state.progressAnimation);
        }

        hideOverlay();

        showError(
            data.message ||
            "Server trả về dữ liệu không hợp lệ."
        );

        return;
    }


    await visual;

    await animateProgress(
        91,
        100,
        650,
        "Hoàn tất!",
        "Ứng dụng đã được ký và xác thực thành công.",
        5
    );


    state.installUrl=data.install_url||"";

    state.expiresAt=
        Number(data.expires_at)
        ||
        (
            Date.now()/1000+
            Number(data.ttl_seconds||900)
        );


    setTimeout(()=>{

        hideOverlay();

        showResult(udid);

        state.signing=false;

    },220);
}
