/* =========================
   Souverain New Tab - JS
   (clean, no duplicate const)
========================= */

(() => {
    // ---------- Elements ----------
    const input = document.getElementById("q");
    const form = document.getElementById("searchForm");

    const rageToggle = document.getElementById("rageToggle");
    const rageHud = document.getElementById("rageHud");

    const muteToggle = document.getElementById("muteToggle");
    const muteIcon = document.getElementById("muteIcon");

    const clockTime = document.getElementById("clockTime");
    const clockDate = document.getElementById("clockDate");

    const wEmoji = document.getElementById("wEmoji");
    const wTemp = document.getElementById("wTemp");
    const wDesc = document.getElementById("wDesc");
    const wCity = document.getElementById("wCity");
    const wWind = document.getElementById("wWind");

    // Modal install
    const howInstallBtn = document.getElementById("howInstallBtn");
    const copyLinkBtn = document.getElementById("copyLinkBtn");
    const installModal = document.getElementById("installModal");
    const closeModalBtn = document.getElementById("closeModal");
    const copyStepsBtn = document.getElementById("copyStepsBtn");

    // Rating
    const stars = document.querySelectorAll("#stars span");
    const avgRatingEl = document.getElementById("avgRating");
    const feedbackEl = document.getElementById("feedback");
    const saveBtn = document.getElementById("saveFeedback");

    // ---------- Keys ----------
    const RAGE_KEY = "souverain_rage_mode";
    const MUTE_KEY = "souverain_sound_muted";
    const RATINGS_KEY = "souverain_ratings";
    const FEEDBACK_KEY = "souverain_feedback";

    // ---------- Rage sound ----------
    const RAGE_SOUND_PATH = "cocorico.mp3";
    let rageAudio = null;

    function isMuted() {
        return localStorage.getItem(MUTE_KEY) === "1";
    }

    function setMuted(on) {
        localStorage.setItem(MUTE_KEY, on ? "1" : "0");
        document.body.classList.toggle("muted", on);
        muteToggle?.setAttribute("aria-pressed", String(on));
        if (muteIcon) muteIcon.textContent = on ? "🔇" : "🔊";
    }

    function ensureAudio() {
        if (rageAudio) return rageAudio;
        rageAudio = new Audio(RAGE_SOUND_PATH);
        rageAudio.volume = 0.65;
        return rageAudio;
    }

    function playRageSound() {
        if (isMuted()) return;
        try {
            const a = ensureAudio();
            a.currentTime = 0;
            a.play().catch(() => { });
        } catch (_) { }
    }

    function setRage(on, { playSound = false } = {}) {
        document.body.classList.toggle("rage", on);
        rageToggle?.setAttribute("aria-pressed", String(on));
        if (rageHud) rageHud.hidden = !on;
        localStorage.setItem(RAGE_KEY, on ? "1" : "0");
        if (on && playSound) playRageSound();
    }

    // ---------- Search ----------
    function looksLikeUrl(v) {
        return /^(https?:\/\/|ftp:\/\/)/i.test(v) || /^[^\s]+\.[^\s]+$/i.test(v);
    }

    function go(v) {
        v = (v || "").trim();
        if (!v) return;

        if (looksLikeUrl(v)) {
            const url = /^(https?:\/\/|ftp:\/\/)/i.test(v) ? v : `https://${v}`;
            window.location.href = url;
            return;
        }
        window.location.href = `https://www.qwant.com/?q=${encodeURIComponent(v)}`;
    }

    // ---------- Clock ----------
    function pad2(n) { return String(n).padStart(2, "0"); }

    function tickClock() {
        const now = new Date();
        const hh = pad2(now.getHours());
        const mm = pad2(now.getMinutes());
        const ss = pad2(now.getSeconds());
        if (clockTime) clockTime.textContent = `${hh}:${mm}:${ss}`;

        const fmt = new Intl.DateTimeFormat("fr-FR", {
            weekday: "long", year: "numeric", month: "long", day: "2-digit"
        });
        if (clockDate) clockDate.textContent = fmt.format(now);
    }

    // ---------- Weather (Open-Meteo only) ----------
    function weatherEmoji(code) {
        if (code === 0) return "☀️";
        if ([1, 2].includes(code)) return "🌤️";
        if (code === 3) return "☁️";
        if ([45, 48].includes(code)) return "🌫️";
        if ([51, 53, 55, 56, 57].includes(code)) return "🌦️";
        if ([61, 63, 65, 66, 67].includes(code)) return "🌧️";
        if ([71, 73, 75, 77].includes(code)) return "❄️";
        if ([80, 81, 82].includes(code)) return "🌧️";
        if ([95, 96, 99].includes(code)) return "⛈️";
        return "⛅";
    }

    function weatherText(code) {
        const map = {
            0: "Ciel dégagé",
            1: "Peu nuageux",
            2: "Partiellement nuageux",
            3: "Couvert",
            45: "Brouillard",
            48: "Brouillard givrant",
            51: "Bruine légère",
            53: "Bruine",
            55: "Bruine dense",
            61: "Pluie faible",
            63: "Pluie",
            65: "Pluie forte",
            71: "Neige faible",
            73: "Neige",
            75: "Neige forte",
            80: "Averses faibles",
            81: "Averses",
            82: "Averses fortes",
            95: "Orage",
            96: "Orage + grêle",
            99: "Orage + grêle"
        };
        return map[code] || "Météo";
    }

    async function fetchWeather(lat, lon) {
        const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${lat}&longitude=${lon}` +
            `&current_weather=true&timezone=Europe%2FParis`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("weather_fetch_failed");
        return res.json();
    }

    async function refreshWeather() {
        const fallback = { lat: 48.8566, lon: 2.3522, label: "Paris" };

        const getPos = () => new Promise((resolve) => {
            if (!navigator.geolocation) return resolve(null);
            navigator.geolocation.getCurrentPosition(
                (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
                () => resolve(null),
                { enableHighAccuracy: false, timeout: 2500, maximumAge: 30 * 60 * 1000 }
            );
        });

        const pos = await getPos();
        const lat = pos?.lat ?? fallback.lat;
        const lon = pos?.lon ?? fallback.lon;

        try {
            const data = await fetchWeather(lat, lon);
            const cw = data?.current_weather;
            if (!cw) throw new Error("no_current_weather");

            const code = cw.weathercode;
            const temp = Math.round(cw.temperature);
            const wind = Math.round(cw.windspeed);

            if (wEmoji) wEmoji.textContent = weatherEmoji(code);
            if (wTemp) wTemp.textContent = String(temp);
            if (wDesc) wDesc.textContent = weatherText(code);
            if (wWind) wWind.textContent = `${wind} km/h`;

            if (wCity) wCity.textContent = pos ? "Ta zone" : fallback.label;
        } catch (_) {
            if (wEmoji) wEmoji.textContent = "⛅";
            if (wTemp) wTemp.textContent = "--";
            if (wDesc) wDesc.textContent = "Météo indisponible";
            if (wCity) wCity.textContent = fallback.label;
            if (wWind) wWind.textContent = "-- km/h";
        }
    }

    // ---------- Rating ----------
    function updateAvg(v) {
        if (avgRatingEl) avgRatingEl.textContent = v ? String(v) : "--";
    }

    function loadRatings() {
        const data = JSON.parse(localStorage.getItem(RATINGS_KEY) || "[]");
        if (!data.length) return updateAvg("--");
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        updateAvg(avg.toFixed(1));
    }

    // ---------- Modal install ----------
    function openModal() {
        if (!installModal) return;
        installModal.hidden = false;
    }

    function closeModal() {
        if (!installModal) return;
        installModal.hidden = true;
    }

    // ---------- Init ----------
    function loadState() {
        setMuted(isMuted());
        const rageSaved = localStorage.getItem(RAGE_KEY) === "1";
        setRage(rageSaved, { playSound: false });
    }

    // ---------- Events ----------
    form?.addEventListener("submit", (e) => {
        e.preventDefault();
        go(input?.value || "");
    });

    document.querySelectorAll("[data-go]").forEach(btn => {
        btn.addEventListener("click", () => {
            const url = btn.getAttribute("data-go");
            if (url) window.location.href = url;
        });
    });

    rageToggle?.addEventListener("click", () => {
        const on = !document.body.classList.contains("rage");
        setRage(on, { playSound: on });
    });

    muteToggle?.addEventListener("click", () => {
        setMuted(!isMuted());
    });

    // Modal open/close
    howInstallBtn?.addEventListener("click", openModal);
    closeModalBtn?.addEventListener("click", closeModal);

    // click outside card closes
    installModal?.addEventListener("click", (e) => {
        if (e.target === installModal) closeModal();
    });

    // ESC closes
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });

    // Copy link
    copyLinkBtn?.addEventListener("click", async () => {
        const link = "https://souverain.fr";
        try {
            await navigator.clipboard.writeText(link);
            alert("Lien copié ✅");
        } catch {
            prompt("Copie ce lien :", link);
        }
    });

    // Copy steps
    copyStepsBtn?.addEventListener("click", async () => {
        const text =
            `Installer Souverain (extension New Tab)
1) Télécharger l’extension (ZIP ou Store)
2) Chrome: chrome://extensions  | Firefox: about:addons
3) Chrome: Mode développeur > Charger l’extension non empaquetée
4) Ouvrir un nouvel onglet ✅
Lien: https://souverain.fr`;
        try {
            await navigator.clipboard.writeText(text);
            alert("Étapes copiées ✅");
        } catch {
            prompt("Copie ces étapes :", text);
        }
    });

    // Rating clicks
    stars.forEach(star => {
        star.addEventListener("click", () => {
            const val = parseInt(star.dataset.v, 10);
            stars.forEach(s => s.classList.toggle("active", parseInt(s.dataset.v, 10) <= val));

            const arr = JSON.parse(localStorage.getItem(RATINGS_KEY) || "[]");
            arr.push(val);
            localStorage.setItem(RATINGS_KEY, JSON.stringify(arr));
            loadRatings();
        });
    });

    saveBtn?.addEventListener("click", () => {
        const txt = (feedbackEl?.value || "").trim();
        if (!txt) return;
        localStorage.setItem(FEEDBACK_KEY, txt);
        alert("Merci pour votre retour !");
        if (feedbackEl) feedbackEl.value = "";
    });

    // ---------- Boot ----------
    loadState();
    loadRatings();
    tickClock();
    setInterval(tickClock, 1000);
    refreshWeather();
    setInterval(refreshWeather, 30 * 60 * 1000);
    input?.focus();
})();
const copyBtn = document.getElementById("copyLinkBtn");

if (copyBtn) {
    copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(
            "https://github.com/jlb30350/souverain-newtab-extension/releases/tag/v1.0.1"
        );
        alert("Lien copié !");
    });
}

