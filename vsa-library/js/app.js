"use strict";

/* VSA Library — one app.js for UDID, signing, progress, result and library UI. */
const API_BASE = "https://api.vsign.download";
const SIGN_ENDPOINT = API_BASE + "/api/vsa-library/sign";
const BAN_ENDPOINT = API_BASE + "/api/check-ban";
const state = {
  signing:false, installUrl:"", expiresAt:0,
  countdownTimer:null, progressAnimation:null, requestId:0
};
const $ = id => document.getElementById(id);
const udidInput = $("udid");
const udidInputWrap = udidInput ? udidInput.closest(".input-wrap") : null;
const CIRCUMFERENCE = 2 * Math.PI * 60;
const ring = $("ringValue");
if (ring) {
  ring.style.strokeDasharray = CIRCUMFERENCE;
  ring.style.strokeDashoffset = CIRCUMFERENCE;
}

/* UDID */
function isValidUdid(value) {
  return /^[0-9A-F]{8}-[0-9A-F]{16}$/.test(value) || /^[0-9A-F]{40}$/.test(value);
}
function setUdidSuccessState(success) {
  if (!udidInput || !udidInputWrap) return;
  udidInput.classList.toggle("udid-success", !!success);
  udidInputWrap.classList.toggle("udid-success-wrap", !!success);
}
function clearError() {
  const box = $("errorBox");
  if (box) { box.classList.remove("show"); box.textContent = ""; }
}
function isNoOrderError(message) {
  const value = String(message || "");
  return /UDID\s+không\s+tồn\s+tại/i.test(value) || /không\s+tồn\s+tại\s+trên\s+hệ\s+thống/i.test(value);
}
function isBannedError(message) {
  return /bị\s+tạm\s+cấm|đã\s+bị\s+tạm\s+cấm|tạm\s+cấm\s+sử\s+dụng/i.test(String(message || ""));
}

/* Alerts */
function hideAlerts() {
  ["noOrderAlert","bannedAlert"].forEach(id => {
    const el = $(id);
    if (el) { el.classList.remove("show"); el.setAttribute("aria-hidden","true"); }
  });
  document.body.style.overflow = "";
}
function showAlert(id) {
  hideAlerts();
  const el = $(id);
  if (!el) return;
  el.classList.add("show");
  el.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function showBannedAlert(reason) {
  if ($("bannedReason")) $("bannedReason").textContent = reason || "Không có lý do";
  showAlert("bannedAlert");
}
function showError(message, reason) {
  const msg = message || "Có lỗi xảy ra. Vui lòng thử lại.";
  clearError();
  if (isNoOrderError(msg)) { showAlert("noOrderAlert"); return; }
  if (isBannedError(msg)) { showBannedAlert(reason || msg); return; }
  const box = $("errorBox");
  if (box) { box.textContent = msg; box.classList.add("show"); }
}
async function checkBan(udid) {
  try {
    const response = await fetch(BAN_ENDPOINT, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({udid})
    });
    if (!response.ok) return {banned:false};
    return await response.json();
  } catch (error) {
    console.warn("VSA Library ban check:", error);
    return {banned:false};
  }
}
if (udidInput) {
  udidInput.addEventListener("input", () => {
    udidInput.value = udidInput.value.toUpperCase().replace(/[^0-9A-F-]/g,"");
    setUdidSuccessState(isValidUdid(udidInput.value));
    clearError();
  });
  const fromUrl = (new URLSearchParams(location.search).get("udid") || "").trim().toUpperCase().replace(/[^0-9A-F-]/g,"");
  if (isValidUdid(fromUrl)) { udidInput.value = fromUrl; setUdidSuccessState(true); }
}
document.querySelectorAll("[data-close-alert]").forEach(button => button.addEventListener("click",hideAlerts));
["noOrderAlert","bannedAlert"].forEach(id => {
  const el = $(id);
  if (el) el.addEventListener("click",event => { if (event.target === el) hideAlerts(); });
});

/* Progress ring and six stages — same timing as the supplied ESign v2 app.js. */
function setProgress(value) {
  const safe = Math.max(0,Math.min(100,value));
  if ($("percent")) $("percent").textContent = Math.round(safe) + "%";
  if (ring) ring.style.strokeDashoffset = CIRCUMFERENCE - safe / 100 * CIRCUMFERENCE;
}
function setStep(index) {
  for (let i=0;i<=5;i++) {
    const el = $("step"+i);
    if (!el) continue;
    el.classList.remove("active","done");
    if (i<index) el.classList.add("done");
    if (i===index) el.classList.add("active");
  }
}
function updateSigningText(title,sub,step) {
  if ($("signTitle")) $("signTitle").textContent = title;
  if ($("signSub")) $("signSub").textContent = sub;
  setStep(step);
}
function stopProgressAnimation() {
  if (state.progressAnimation !== null) {
    cancelAnimationFrame(state.progressAnimation);
    state.progressAnimation = null;
  }
}
function animateProgress(from,to,duration,title,sub,step) {
  return new Promise(resolve => {
    const start = performance.now();
    updateSigningText(title,sub,step);
    function frame(now) {
      const raw = Math.min((now-start)/duration,1);
      const eased = 1-Math.pow(1-raw,3);
      setProgress(from+(to-from)*eased);
      if (raw<1) state.progressAnimation = requestAnimationFrame(frame);
      else { state.progressAnimation = null; resolve(); }
    }
    state.progressAnimation = requestAnimationFrame(frame);
  });
}
async function runVisualProgress() {
  setProgress(0);
  await animateProgress(0,7,650,"Kiểm tra UDID","Đang xác thực định dạng thiết bị...",0);
  await animateProgress(7,18,850,"Kiểm tra đơn hàng","Đang tìm đơn hàng theo UDID...",1);
  await animateProgress(18,37,1000,"Chuẩn bị chứng chỉ","Đang tải và xử lý chứng chỉ...",2);
  await animateProgress(37,68,1350,"Ký ứng dụng VSA Library","Đang ký IPA trên server...",3);
  await animateProgress(68,91,1550,"Verify & tạo OTA","Đang kiểm tra chữ ký và tạo link cài đặt...",4);
}
function showOverlay() {
  $("signOverlay").classList.add("show");
  $("signOverlay").setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
}
function hideOverlay() {
  $("signOverlay").classList.remove("show");
  $("signOverlay").setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}
function setBusy(busy) {
  state.signing = busy;
  if ($("signButton")) $("signButton").disabled = busy;
}
function getInstallUrl(data) {
  return data?.install_url || data?.ota_url || data?.manifest_url || data?.url ||
    data?.data?.install_url || data?.data?.ota_url || "";
}

/* Real API request; never fake a successful signing result. */
async function startSigning() {
  if (state.signing) return;
  const udid = (udidInput?.value || "").trim().toUpperCase();
  clearError();
  hideAlerts();
  if (!isValidUdid(udid)) {
    showError("UDID không đúng định dạng. Vui lòng kiểm tra lại UDID thiết bị.");
    udidInput?.focus();
    return;
  }

  setBusy(true);
  const requestId = ++state.requestId;
  try {
    const ban = await checkBan(udid);
    if (requestId !== state.requestId) return;
    if (ban?.banned) { showBannedAlert(ban.reason); return; }

    showOverlay();
    const visualProgress = runVisualProgress();
    let response;
    try {
      response = await fetch(SIGN_ENDPOINT, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({udid:udid,app:"vsa_library"})
      });
    } catch (error) {
      stopProgressAnimation(); hideOverlay();
      showError("Không thể kết nối tới server VSA Library. Vui lòng thử lại.");
      return;
    }

    let data = {};
    try { data = await response.json(); } catch (_) { data = {}; }

    if (data?.banned) {
      stopProgressAnimation(); hideOverlay();
      showBannedAlert(data.reason || data.message);
      return;
    }
    if (!response.ok || !data.success) {
      stopProgressAnimation(); hideOverlay();
      showError(data.message || data.error || "Server trả về dữ liệu không hợp lệ.",data.reason);
      return;
    }

    const installUrl = getInstallUrl(data);
    if (!installUrl) {
      stopProgressAnimation(); hideOverlay();
      showError("Server chưa trả về link cài đặt. Vui lòng thử lại hoặc liên hệ hỗ trợ.");
      return;
    }

    await visualProgress;
    await animateProgress(91,100,650,"Hoàn tất!","Ứng dụng VSA Library đã được ký và xác thực thành công.",5);
    state.installUrl = installUrl;
    state.expiresAt = Number(data.expires_at) || (Date.now()/1000 + Number(data.ttl_seconds || 900));

    window.setTimeout(() => {
      hideOverlay();
      showResult(udid);
    },220);
  } catch (error) {
    stopProgressAnimation(); hideOverlay();
    showError(error?.message || "Đã xảy ra lỗi trong quá trình ký.");
  } finally {
    setBusy(false);
  }
}

/* Result page: same final install screen and expiry countdown as ESign v2. */
function setLibraryShellVisible(visible) {
  [document.querySelector(".header"),document.querySelector("main"),document.querySelector(".site-footer"),
   ...document.querySelectorAll(".glow")].forEach(el => {
    if (el) el.style.display = visible ? "" : "none";
  });
}
function showResult(udid) {
  setLibraryShellVisible(false);
  $("resultView").classList.add("show");
  $("resultView").setAttribute("aria-hidden","false");
  $("resultUdid").textContent = udid;
  const install = $("installButton");
  install.classList.remove("expired");
  install.disabled = false;
  install.textContent = "Cài đặt ngay";
  install.onclick = () => {
    if (!state.installUrl || Date.now()/1000 >= state.expiresAt) { expireResult(); return; }
    location.href = state.installUrl;
  };
  startCountdown();
}
function startCountdown() {
  stopCountdown();
  updateCountdown();
  state.countdownTimer = window.setInterval(updateCountdown,250);
}
function stopCountdown() {
  if (state.countdownTimer !== null) { clearInterval(state.countdownTimer); state.countdownTimer = null; }
}
function updateCountdown() {
  const remaining = Math.max(0,state.expiresAt-Date.now()/1000);
  const total = Math.ceil(remaining);
  $("countdown").textContent = String(Math.floor(total/60)).padStart(2,"0") + ":" + String(total%60).padStart(2,"0");
  if (total <= 0) expireResult();
}
function expireResult() {
  stopCountdown();
  const install = $("installButton");
  install.disabled = true;
  install.classList.add("expired");
  install.textContent = "Đã hết hạn";
  $("countdown").textContent = "00:00";
}
function resetApp() {
  stopCountdown(); stopProgressAnimation();
  state.requestId++; state.signing = false; state.installUrl = ""; state.expiresAt = 0;
  $("resultView").classList.remove("show");
  $("resultView").setAttribute("aria-hidden","true");
  setLibraryShellVisible(true);
  if ($("signButton")) $("signButton").disabled = false;
  if ($("installButton")) { $("installButton").disabled = false; $("installButton").classList.remove("expired"); $("installButton").textContent = "Cài đặt ngay"; }
  if (udidInput) udidInput.value = "";
  setUdidSuccessState(false); clearError(); hideAlerts(); hideOverlay(); setProgress(0); setStep(0);
  window.scrollTo({top:0,behavior:"smooth"});
}

/* Library search, category filters, and card shortcuts. */
function setupFilters() {
  let filter = "all";
  const search = $("search");
  const cards = [...document.querySelectorAll(".app-card")];
  function apply() {
    let count = 0;
    cards.forEach(card => {
      const categoryMatch = filter === "all" || card.dataset.category === filter;
      const queryMatch = !search || !search.value || card.textContent.toLowerCase().includes(search.value.toLowerCase());
      card.hidden = !(categoryMatch && queryMatch);
      if (!card.hidden) count++;
    });
    if ($("empty")) $("empty").hidden = count > 0;
  }
  document.querySelectorAll(".category").forEach(button => button.addEventListener("click",() => {
    document.querySelectorAll(".category").forEach(item => item.classList.remove("selected"));
    button.classList.add("selected");
    filter = button.dataset.filter || "all";
    apply();
    $("apps")?.scrollIntoView({behavior:"smooth",block:"start"});
  }));
  search?.addEventListener("input",apply);
  document.querySelectorAll(".browse-signing").forEach(button => button.addEventListener("click",() => {
    $("signing")?.scrollIntoView({behavior:"smooth",block:"center"});
    udidInput?.focus({preventScroll:true});
  }));
}
function setupMobileMenu() {
  $("menuBtn")?.addEventListener("click",() => document.querySelector(".header nav")?.classList.toggle("mobile-open"));
  document.querySelectorAll(".header nav a").forEach(link => link.addEventListener("click",() => {
    document.querySelector(".header nav")?.classList.remove("mobile-open");
  }));
}
function init() {
  $("signButton")?.addEventListener("click",startSigning);
  $("resetButton")?.addEventListener("click",resetApp);
  setupFilters(); setupMobileMenu(); setProgress(0); setStep(0);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
else init();
window.startSigning = startSigning;
window.resetApp = resetApp;
