"use strict";
const API_BASE = "https://api.vsign.download";
const SIGN_ENDPOINT = API_BASE + "/api/esign-v2/sign"; // Giai đoạn 2 sẽ triển khai endpoint này.
const state = { signing:false, installUrl:"", expiresAt:0, timer:null };
const $ = id => document.getElementById(id);
const udidInput = $("udid");

function validUdid(v){return /^[0-9A-F]{8}-[0-9A-F]{16}$/.test(v)||/^[0-9A-F]{40}$/.test(v)}
function showError(msg){$("errorBox").textContent=msg;$("errorBox").classList.add("show")}
function clearError(){$("errorBox").classList.remove("show");$("errorBox").textContent=""}
function showAlert(id){$(id).classList.add("show");$(id).setAttribute("aria-hidden","false")}
function hideAlerts(){["noOrderAlert","bannedAlert"].forEach(id=>{$(id).classList.remove("show");$(id).setAttribute("aria-hidden","true")})}
document.querySelectorAll("[data-close-alert]").forEach(b=>b.addEventListener("click",hideAlerts));
udidInput.addEventListener("input",()=>{udidInput.value=udidInput.value.toUpperCase().replace(/[^0-9A-F-]/g,"");clearError()});
(function autofill(){const v=(new URLSearchParams(location.search).get("udid")||"").trim().toUpperCase().replace(/[^0-9A-F-]/g,"");if(validUdid(v))udidInput.value=v})();
async function checkBan(udid){
  try{const r=await fetch(API_BASE+"/api/check-ban",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({udid})});if(!r.ok)return {banned:false};return await r.json()}catch(_){return {banned:false}}
}
function setStage(index,title,sub,percent){
  $("signTitle").textContent=title;$("signSub").textContent=sub;$("progressBar").style.width=percent+"%";$("percent").textContent=percent+"%";
  for(let i=0;i<5;i++){$("step"+i).classList.toggle("active",i===index);$("step"+i).classList.toggle("done",i<index)}
}
function showOverlay(){$("signOverlay").classList.add("show");$("signOverlay").setAttribute("aria-hidden","false")}
function hideOverlay(){$("signOverlay").classList.remove("show");$("signOverlay").setAttribute("aria-hidden","true")}
async function startSigning(){
  if(state.signing)return;
  const udid=udidInput.value.trim().toUpperCase();clearError();hideAlerts();
  if(!validUdid(udid)){showError("UDID không đúng định dạng. Vui lòng kiểm tra lại.");udidInput.focus();return}
  const ban=await checkBan(udid);if(ban.banned){$("bannedReason").textContent=ban.reason||"Thiết bị không được phép sử dụng dịch vụ.";showAlert("bannedAlert");return}
  state.signing=true;$("signButton").disabled=true;showOverlay();
  setStage(0,"Kiểm tra UDID","Đang xác thực thiết bị...",8);
  const stages=[
    [1,"Kiểm tra đơn hàng","Đang kiểm tra thông tin đăng ký...",25],
    [2,"Chuẩn bị chứng chỉ","Đang chuẩn bị chứng chỉ ký...",45],
    [3,"Ký ứng dụng ESign v2","Đang ký IPA trên máy chủ...",72],
    [4,"Xác minh và tạo link","Đang xác minh chữ ký và tạo link OTA...",92]
  ];
  let i=0;const visual=setInterval(()=>{if(i<stages.length){setStage(...stages[i]);i++}},950);
  try{
    const response=await fetch(SIGN_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({udid})});
    let data={};try{data=await response.json()}catch(_){}
    clearInterval(visual);
    if(data.banned){hideOverlay();$("bannedReason").textContent=data.reason||"Thiết bị bị tạm khóa.";showAlert("bannedAlert");return}
    if(!response.ok||!data.success){hideOverlay();const msg=data.message||"Không thể ký ứng dụng ESign v2.";if(/UDID.*không tồn tại|không tồn tại trên hệ thống/i.test(msg))showAlert("noOrderAlert");else showError(msg);return}
    setStage(4,"Hoàn tất!","ESign v2 đã được ký và xác minh.",100);
    state.installUrl=data.install_url||"";state.expiresAt=Number(data.expires_at)||(Date.now()/1000+Number(data.ttl_seconds||900));
    if(!state.installUrl)throw new Error("Server chưa trả về link cài đặt.");
    setTimeout(()=>{hideOverlay();showResult(udid);state.signing=false;$("signButton").disabled=false},450);
  }catch(err){clearInterval(visual);hideOverlay();showError(err.message==="Failed to fetch"?"Chưa kết nối được máy chủ ESign v2. Vui lòng thử lại.":(err.message||"Đã xảy ra lỗi."))}
  finally{state.signing=false;$("signButton").disabled=false}
}
function showResult(udid){
  $("homeView").style.display="none";$("resultView").classList.add("show");$("resultUdid").textContent=udid;
  $("installButton").onclick=()=>{if(!state.installUrl||Date.now()/1000>=state.expiresAt){expire();return}location.href=state.installUrl};
  updateCountdown();state.timer=setInterval(updateCountdown,500);
}
function updateCountdown(){
  const n=Math.max(0,Math.ceil(state.expiresAt-Date.now()/1000));$("countdown").textContent=String(Math.floor(n/60)).padStart(2,"0")+":"+String(n%60).padStart(2,"0");if(!n)expire()
}
function expire(){clearInterval(state.timer);$("installButton").disabled=true;$("installButton").textContent="Đã hết hạn";$("countdown").textContent="00:00"}
function resetApp(){clearInterval(state.timer);state.installUrl="";state.expiresAt=0;$("resultView").classList.remove("show");$("homeView").style.display="";udidInput.value="";clearError();hideAlerts();$("installButton").disabled=false;$("installButton").textContent="Cài đặt ngay";window.scrollTo({top:0,behavior:"smooth"})}
$("signButton").addEventListener("click",startSigning);$("resetButton").addEventListener("click",resetApp);
