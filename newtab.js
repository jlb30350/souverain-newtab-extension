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

const RAGE_KEY = "souverain_rage_mode";
const MUTE_KEY = "souverain_sound_muted";

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

/* ---------- Search ---------- */
function looksLikeUrl(v) {
    return /^(https?:\/\/|ftp:\/\/)/i.test(v) || (/^[^\s]+\.[^\s]+$/i.test(v));
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

/* ---------- Clock ---------- */
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

/* ---------- Weather (Open-Meteo) ---------- */
function weatherEmoji(code) {
    // WMO codes -> emojis
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
    // current_weather fournit temp, windspeed, weathercode
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=Europe%2FParis`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather_fetch_failed");
    return res.json();
}

async function reverseGeocode(lat, lon) {
    // Open-Meteo geocoding reverse (simple)
    const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=fr&count=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json();
}

async function refreshWeather() {
    // fallback Paris si géoloc refusée
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

        // ville (reverse geocode) : si échec, label simple
        let cityLabel = pos ? "Ta zone" : fallback.label;
        try {
            const geo = await reverseGeocode(lat, lon);
            const name = geo?.results?.[0]?.name;
            if (name) cityLabel = name;
        } catch (_) { }
        if (wCity) wCity.textContent = cityLabel;

    } catch (e) {
        if (wEmoji) wEmoji.textContent = "⛅";
        if (wTemp) wTemp.textContent = "--";
        if (wDesc) wDesc.textContent = "Météo indisponible";
        if (wCity) wCity.textContent = fallback.label;
        if (wWind) wWind.textContent = "-- km/h";
    }
}

/* ---------- Init ---------- */
function loadState() {
    setMuted(isMuted());
    const rageSaved = localStorage.getItem(RAGE_KEY) === "1";
    setRage(rageSaved, { playSound: false });
}

form?.addEventListener("submit", (e) => {
    e.preventDefault();
    go(input.value);
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

loadState();
tickClock();
setInterval(tickClock, 1000);

refreshWeather();
setInterval(refreshWeather, 30 * 60 * 1000);

input?.focus();

/* ---------- Rating system ---------- */
const stars = document.querySelectorAll("#stars span");
const avgRatingEl = document.getElementById("avgRating");
const feedbackEl = document.getElementById("feedback");
const saveBtn = document.getElementById("saveFeedback");

const RATINGS_KEY = "souverain_ratings";

function loadRatings() {
    const data = JSON.parse(localStorage.getItem(RATINGS_KEY) || "[]");
    if (!data.length) return updateAvg(0);
    const avg = data.reduce((a, b) => a + b, 0) / data.length;
    updateAvg(avg.toFixed(1));
}

function updateAvg(v) {
    avgRatingEl.textContent = v || "--";
}

stars.forEach(star => {
    star.addEventListener("click", () => {
        const val = parseInt(star.dataset.v);
        stars.forEach(s => s.classList.toggle("active", s.dataset.v <= val));

        const arr = JSON.parse(localStorage.getItem(RATINGS_KEY) || "[]");
        arr.push(val);
        localStorage.setItem(RATINGS_KEY, JSON.stringify(arr));
        loadRatings();
    });
});

saveBtn.addEventListener("click", () => {
    const txt = feedbackEl.value.trim();
    if (txt) {
        localStorage.setItem("souverain_feedback", txt);
        alert("Merci pour votre retour !");
        feedbackEl.value = "";
    }
});

loadRatings();
/* ---------- Install Modal + Copy ---------- */
const howInstallBtn = document.getElementById("howInstallBtn");
const copyLinkBtn = document.getElementById("copyLinkBtn");
const installModal = document.getElementById("installModal");
const closeModal = document.getElementById("closeModal");
const copyStepsBtn = document.getElementById("copyStepsBtn");

function openModal() {
    installModal.hidden = false;
}
function closeIt() {
    installModal.hidden = true;
}

howInstallBtn?.addEventListener("click", openModal);
closeModal?.addEventListener("click", closeIt);

// clic sur fond = fermer
installModal?.addEventListener("click", (e) => {
    if (e.target === installModal) closeIt();
});

copyLinkBtn?.addEventListener("click", async () => {
    const link = "https://souverain.fr"; // change en GitHub si besoin
    try {
        await navigator.clipboard.writeText(link);
        alert("Lien copié ✅");
    } catch {
        prompt("Copie ce lien :", link);
    }
});

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
