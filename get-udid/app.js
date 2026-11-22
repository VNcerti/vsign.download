/**
 * VSign — GET UDID Static Frontend Controller
 * Độc lập 100% — Tương thích tuyệt đối khi chạy trên GitHub Pages hoặc Backend VSign.
 */

(function () {
    "use strict";

    // ----------------------------------------------------
    // CẤU HÌNH API BACKEND
    // ----------------------------------------------------
    // Khi bạn upload lên GitHub Pages (domain vsign.download hoặc *.github.io),
    // API backend xử lý logic Python tại máy chủ: https://api.vsign.download
    const API_BASE = (
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"
    )
        ? window.location.origin
        : "https://api.vsign.download";

    // ----------------------------------------------------
    // TOAST NOTIFICATION
    // ----------------------------------------------------
    let toastTimeout = null;

    function showToast(message) {
        let toast = document.getElementById("toastNotice");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toastNotice";
            toast.className = "toast-notice";
            toast.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span id="toastMessage"></span>
            `;
            document.body.appendChild(toast);
        }

        const msgSpan = toast.querySelector("#toastMessage");
        if (msgSpan) {
            msgSpan.textContent = message;
        }

        toast.classList.add("show");

        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        toastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 2200);
    }

    // ----------------------------------------------------
    // SAO CHÉP VÀO CLIPBOARD + HAPTIC FEEDBACK
    // ----------------------------------------------------
    async function copyToClipboard(text, labelName, element) {
        if (!text) return;

        let success = false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                success = true;
            } else {
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.opacity = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                success = document.execCommand("copy");
                document.body.removeChild(textArea);
            }
        } catch (e) {
            console.error("Copy failed", e);
        }

        if (success) {
            if (navigator.vibrate) {
                navigator.vibrate(30);
            }

            const displayName = labelName || "nội dung";
            showToast(`Đã sao chép ${displayName} vào bộ nhớ tạm!`);

            if (element) {
                element.classList.add("copied");
                const badge = element.querySelector(".copy-badge");
                const oldHtml = badge ? badge.innerHTML : "";
                if (badge) {
                    badge.innerHTML = `
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Đã sao chép
                    `;
                }
                setTimeout(() => {
                    element.classList.remove("copied");
                    if (badge) {
                        badge.innerHTML = oldHtml;
                    }
                }, 1800);
            }
        }
    }

    // ----------------------------------------------------
    // KHỞI TẠO TRANG INDEX.HTML (TẢI CẤU HÌNH & POLLING)
    // ----------------------------------------------------
    function initIndexPage() {
        const enrollBtn = document.getElementById("enrollBtn");
        if (!enrollBtn) return;

        // Kiểm tra In-App Browser (Zalo, Facebook, TikTok...)
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        const isInApp = /FBAN|FBAV|Instagram|TikTok|Line|Zalo|MicroMessenger/i.test(ua);
        const inAppBanner = document.getElementById("inAppBanner");
        if (isInApp && inAppBanner) {
            inAppBanner.style.display = "block";
        }

        // Tạo mã QR Code cho máy tính
        const qrContainer = document.getElementById("desktopQrContainer");
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        if (!isIos && qrContainer) {
            const currentUrl = window.location.href;
            const qrImg = document.createElement("img");
            qrImg.alt = "Quét mã QR để mở trên iPhone";
            qrImg.width = 160;
            qrImg.height = 160;
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(currentUrl)}`;
            qrContainer.appendChild(qrImg);
            const desktopBanner = document.getElementById("desktopBanner");
            if (desktopBanner) {
                desktopBanner.style.display = "block";
            }
        }

        // Bấm nút "LẤY UDID NGAY"
        let pollInterval = null;
        enrollBtn.addEventListener("click", async function (e) {
            e.preventDefault();

            // 1. Tạo session ID ngẫu nhiên
            const sessionId = "s_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 9);

            // 2. Xác định URL trang đích result.html (tương thích cả GitHub Pages và local)
            const returnUrl = new URL("result.html", window.location.href).href;

            // 3. Gọi backend tải file .mobileconfig
            const enrollUrl = `${API_BASE}/get-udid/enroll?return_url=${encodeURIComponent(returnUrl)}&id=${encodeURIComponent(sessionId)}`;
            window.location.href = enrollUrl;

            // 4. Hiển thị overlay chờ cài đặt
            const overlay = document.getElementById("pollingOverlay");
            if (overlay) {
                overlay.classList.add("active");
            }

            // 5. Bắt đầu polling lắng nghe kết quả
            if (pollInterval) clearInterval(pollInterval);
            let attempts = 0;
            const maxAttempts = 150; // Tối đa 5 phút

            pollInterval = setInterval(async () => {
                attempts++;
                if (attempts > maxAttempts) {
                    clearInterval(pollInterval);
                    return;
                }

                try {
                    const checkRes = await fetch(`${API_BASE}/get-udid/api/status?id=${encodeURIComponent(sessionId)}`);
                    const checkData = await checkRes.json();
                    if (checkData && checkData.completed && checkData.data) {
                        clearInterval(pollInterval);
                        const dev = checkData.data;
                        const targetUrl = new URL("result.html", window.location.href);
                        targetUrl.searchParams.set("udid", dev.udid || "");
                        targetUrl.searchParams.set("product", dev.product_name || "");
                        targetUrl.searchParams.set("model", dev.product || "");
                        targetUrl.searchParams.set("version", dev.version_formatted || "");
                        targetUrl.searchParams.set("serial", dev.serial || "");
                        targetUrl.searchParams.set("imei", dev.imei || "");
                        window.location.href = targetUrl.href;
                    }
                } catch (err) {
                    // Tiếp tục poll
                }
            }, 2000);
        });

        // Nút hủy chờ trên overlay
        const cancelPollBtn = document.getElementById("cancelPollBtn");
        if (cancelPollBtn) {
            cancelPollBtn.addEventListener("click", function () {
                if (pollInterval) clearInterval(pollInterval);
                const overlay = document.getElementById("pollingOverlay");
                if (overlay) {
                    overlay.classList.remove("active");
                }
            });
        }
    }

    // ----------------------------------------------------
    // KHỞI TẠO TRANG RESULT.HTML (ĐỌC THÔNG SỐ TỪ QUERY PARAMS)
    // ----------------------------------------------------
    function initResultPage() {
        const resultRoot = document.getElementById("resultContainer");
        if (!resultRoot) return;

        // Đọc thông tin từ URL query parameters
        const params = new URLSearchParams(window.location.search);
        let udid = (params.get("udid") || "").trim().toUpperCase();
        let product = (params.get("product") || "").trim();
        let model = (params.get("model") || "").trim();
        let version = (params.get("version") || "").trim();
        let serial = (params.get("serial") || "").trim();
        let imei = (params.get("imei") || "").trim();

        // Lưu thông tin vào localStorage để không bị mất khi F5
        if (udid) {
            try {
                localStorage.setItem("vsign_device_info", JSON.stringify({
                    udid, product, model, version, serial, imei, savedAt: Date.now()
                }));
            } catch (e) {}
        } else {
            // Thử phục hồi từ localStorage nếu người dùng refresh hoặc mở trực tiếp
            try {
                const saved = JSON.parse(localStorage.getItem("vsign_device_info") || "{}");
                if (saved && saved.udid) {
                    udid = saved.udid;
                    product = saved.product || "";
                    model = saved.model || "";
                    version = saved.version || "";
                    serial = saved.serial || "";
                    imei = saved.imei || "";
                }
            } catch (e) {}
        }

        // Nếu không có UDID, hiển thị thông báo chưa có dữ liệu
        const noDataNotice = document.getElementById("noDataNotice");
        const dataContent = document.getElementById("dataContent");

        if (!udid) {
            if (noDataNotice) noDataNotice.style.display = "block";
            if (dataContent) dataContent.style.display = "none";
            return;
        }

        if (noDataNotice) noDataNotice.style.display = "none";
        if (dataContent) dataContent.style.display = "block";

        // Điền UDID
        const valUdid = document.getElementById("valUdid");
        const cardUdid = document.getElementById("cardUdid");
        if (valUdid) valUdid.textContent = udid;
        if (cardUdid) cardUdid.setAttribute("data-copy", udid);

        // Điền Tên Sản phẩm / Phiên bản
        const valProduct = document.getElementById("valProduct");
        const cardProduct = document.getElementById("cardProduct");
        const valSubProduct = document.getElementById("valSubProduct");
        const displayName = product || (model ? `iPhone (${model})` : "iPhone");
        if (valProduct) valProduct.textContent = displayName;
        if (cardProduct) cardProduct.setAttribute("data-copy", displayName);

        let subParts = [];
        if (model) subParts.push(`Mã model: <strong>${model}</strong>`);
        if (version) subParts.push(`Hệ điều hành: <strong>${version}</strong>`);
        if (valSubProduct) valSubProduct.innerHTML = subParts.join(" · ") || "Thiết bị Apple";

        // Điền Số Seri (nếu có)
        const cardSerial = document.getElementById("cardSerial");
        const valSerial = document.getElementById("valSerial");
        if (serial) {
            if (cardSerial) cardSerial.style.display = "block";
            if (cardSerial) cardSerial.setAttribute("data-copy", serial);
            if (valSerial) valSerial.textContent = serial;
        } else if (cardSerial) {
            cardSerial.style.display = "none";
        }

        // Điền IMEI (nếu có)
        const cardImei = document.getElementById("cardImei");
        const valImei = document.getElementById("valImei");
        if (imei) {
            if (cardImei) cardImei.style.display = "block";
            if (cardImei) cardImei.setAttribute("data-copy", imei);
            if (valImei) valImei.textContent = imei;
        } else if (cardImei) {
            cardImei.style.display = "none";
        }

        // Nút Sao chép UDID
        const copyUdidBtn = document.getElementById("copyUdidBtn");
        if (copyUdidBtn) {
            copyUdidBtn.setAttribute("data-udid", udid);
            copyUdidBtn.addEventListener("click", function () {
                copyToClipboard(udid, "UDID", this);
            });
        }

        // Nút "Ký ứng dụng ngay với VSign" -> tự động trỏ về trang ký kèm UDID
        const signNowBtn = document.getElementById("signNowBtn");
        if (signNowBtn) {
            signNowBtn.href = `https://vsign.download/?udid=${encodeURIComponent(udid)}`;
        }

        // Nút Chia sẻ
        const shareBtn = document.getElementById("shareBtn");
        if (shareBtn) {
            shareBtn.addEventListener("click", async function () {
                const shareText = `Thiết bị: ${displayName}\nUDID: ${udid}\nLấy UDID tại: ${window.location.origin}${window.location.pathname.replace("result.html", "index.html")}`;
                if (navigator.share) {
                    try {
                        await navigator.share({
                            title: "Thông tin thiết bị VSign",
                            text: shareText,
                        });
                    } catch (e) {}
                } else {
                    copyToClipboard(shareText, "thông tin thiết bị", this);
                }
            });
        }

        // Gắn sự kiện chạm-để-copy cho các field cards
        const fieldCards = document.querySelectorAll(".field-card");
        fieldCards.forEach((card) => {
            card.addEventListener("click", function () {
                const text = this.getAttribute("data-copy") || this.innerText;
                const label = this.getAttribute("data-label") || "";
                copyToClipboard(text.trim(), label, this);
            });
        });
    }

    // ----------------------------------------------------
    // TỰ ĐỘNG CHẠY KHI TẢI TRANG
    // ----------------------------------------------------
    document.addEventListener("DOMContentLoaded", function () {
        initIndexPage();
        initResultPage();
    });
})();
