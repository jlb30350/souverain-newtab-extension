// ====== Favoris persos ======


const STORAGE_KEY = "souverainFavs";

const defaultFavs = [
    { name: "Studi", url: "https://www.studi.com" },
    { name: "Gmail", url: "https://mail.google.com" },
    { name: "ChatGPT", url: "https://chat.openai.com" },
    { name: "Gemini", url: "https://gemini.google.com" },
    { name: "YouTube", url: "https://www.youtube.com" },
];

function loadFavs() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : defaultFavs;
    } catch (e) {
        console.warn("Favs load error:", e);
        return defaultFavs;
    }
}

function saveFavs(favs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
}

function normalizeUrl(url) {
    const u = (url || "").trim();
    if (!u) return "";
    return u.startsWith("http://") || u.startsWith("https://") ? u : `https://${u}`;
}

let editMode = false;

function renderFavs() {
    const grid = document.getElementById("myFavs");
    if (!grid) return;

    const favs = loadFavs();
    grid.innerHTML = "";

    favs.forEach((fav, index) => {
        const a = document.createElement("a");
        a.href = fav.url;
        a.target = "_blank";
        a.className = "fav-item";
        a.textContent = fav.name;

        if (editMode) {
            const del = document.createElement("button");
            del.type = "button";
            del.className = "fav-del";
            del.textContent = "✕";
            del.title = "Supprimer";
            del.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const next = loadFavs().filter((_, i) => i !== index);
                saveFavs(next);
                renderFavs();
            });
            a.appendChild(del);
        }

        grid.appendChild(a);
    });
}

// ====== UI générale (recherche, actions, modal, horloge) ======
function isProbablyUrl(text) {
    return /^(https?:\/\/)/i.test(text) || /^[\w-]+\.[\w.-]+/.test(text);
}

function goTo(target) {
    window.location.href = target;
}

function startClock() {
    const timeEl = document.getElementById("clockTime");
    const dateEl = document.getElementById("clockDate");

    function tick() {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        const ss = String(d.getSeconds()).padStart(2, "0");
        timeEl.textContent = `${hh}:${mm}:${ss}`;

        const opts = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        dateEl.textContent = d.toLocaleDateString("fr-FR", opts).toUpperCase();
    }

    tick();
    setInterval(tick, 1000);
}

document.addEventListener("DOMContentLoaded", () => {
    // Favoris buttons
    const btnEdit = document.getElementById("editFavs");
    const btnAdd = document.getElementById("addFav");

    if (btnEdit) {
        btnEdit.addEventListener("click", () => {
            editMode = !editMode;
            btnEdit.textContent = editMode ? "Terminer" : "Modifier";
            renderFavs();
        });
    }

    if (btnAdd) {
        btnAdd.addEventListener("click", () => {
            const name = prompt("Nom du favori :");
            if (!name) return;

            const url = normalizeUrl(prompt("URL du favori :"));
            if (!url) return;

            const favs = loadFavs();
            favs.push({ name: name.trim(), url });
            saveFavs(favs);
            renderFavs();
        });
    }

    renderFavs();

    // Search
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("q");


    if (searchForm && searchInput) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const q = searchInput.value.trim();
            if (!q) return;

            if (isProbablyUrl(q)) {
                const url = normalizeUrl(q);
                goTo(url);
            } else {
                goTo(`https://www.qwant.com/?q=${encodeURIComponent(q)}`);
            }
        });
    }

    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            searchForm.requestSubmit();
        }
    });


    // Quick actions
    document.querySelectorAll(".action[data-go]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const url = btn.getAttribute("data-go");
            if (url) goTo(url);
        });
    });

    // Modal
    const modal = document.getElementById("modal");
    const openModal = document.getElementById("openModal");
    const closeModal = document.getElementById("closeModal");

    if (openModal && modal) openModal.addEventListener("click", () => (modal.style.display = "flex"));
    if (closeModal && modal) closeModal.addEventListener("click", () => (modal.style.display = "none"));
    if (modal) modal.addEventListener("click", (e) => {
        if (e.target === modal) modal.style.display = "none";
    });

    // ===== Rage mode =====
    const rageBtn = document.getElementById("rageBtn");
    if (rageBtn) {
        rageBtn.addEventListener("click", () => {
            document.body.classList.toggle("rage");
        });
    }

    // ===== Sound (vrai audio) =====
    const muteBtn = document.getElementById("muteBtn");
    const muteIcon = document.getElementById("muteIcon");
    const bgAudio = document.getElementById("bgAudio");

    async function safePlay(audio) {
        try {
            await audio.play();
            return true;
        } catch (e) {
            console.warn("Audio play blocked (browser policy). Click again:", e);
            return false;
        }
    }

    if (muteBtn && muteIcon && bgAudio) {
        // état initial : muet
        bgAudio.volume = 0.5;
        bgAudio.muted = true;
        muteIcon.textContent = "🔇";

        muteBtn.addEventListener("click", async () => {
            // toggle mute
            bgAudio.muted = !bgAudio.muted;

            if (!bgAudio.muted) {
                // la 1ère lecture peut être bloquée si pas d'interaction => ici c'est un clic donc OK
                const ok = await safePlay(bgAudio);
                if (!ok) {
                    bgAudio.muted = true;
                }
            }

            muteIcon.textContent = bgAudio.muted ? "🔇" : "🔊";
            document.body.classList.toggle("muted", bgAudio.muted);
        });
    } else {
        console.warn("Son: éléments manquants (muteBtn/muteIcon/bgAudio). Vérifie les IDs et l'audio.");
    }

    // ====== METEO REELLE (Open-Meteo) ======
    const WEATHER_CACHE_KEY = "souverainWeatherCacheV1";
    const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000; // 15 min

    function wmoToText(code) {
        const map = {
            0: "Ciel dégagé",
            1: "Plutôt dégagé",
            2: "Partiellement nuageux",
            3: "Couvert",
            45: "Brouillard",
            48: "Brouillard givrant",
            51: "Bruine faible",
            53: "Bruine",
            55: "Bruine forte",
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
            99: "Orage violent + grêle",
        };
        return map[code] ?? "Météo";
    }

    function wmoToIcon(code) {
        if (code === 0) return "☀️";
        if ([1, 2].includes(code)) return "⛅";
        if (code === 3) return "☁️";
        if ([45, 48].includes(code)) return "🌫️";
        if ([51, 53, 55].includes(code)) return "🌦️";
        if ([61, 63, 65, 80, 81, 82].includes(code)) return "🌧️";
        if ([71, 73, 75].includes(code)) return "🌨️";
        if ([95, 96, 99].includes(code)) return "⛈️";
        return "⛅";
    }

    function setWeatherUI({ tempC, code, windKmh, label }) {
        const emojiEl = document.getElementById("wEmoji");
        const tempEl = document.getElementById("wTemp");
        const descEl = document.getElementById("wDesc");
        const cityEl = document.getElementById("wCity");
        const windEl = document.getElementById("wWind");

        if (emojiEl) emojiEl.textContent = wmoToIcon(code);
        if (tempEl) tempEl.textContent = Math.round(tempC);
        if (descEl) descEl.textContent = wmoToText(code);
        if (cityEl) cityEl.textContent = label || "Ici";
        if (windEl) windEl.textContent = `${Math.round(windKmh)} km/h`;
    }


    function loadWeatherCache() {
        try {
            const raw = localStorage.getItem(WEATHER_CACHE_KEY);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            if (!obj?.ts || (Date.now() - obj.ts) > WEATHER_CACHE_TTL_MS) return null;
            return obj.data;
        } catch {
            return null;
        }
    }

    function saveWeatherCache(data) {
        try {
            localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
        } catch { }
    }

    async function reverseGeocodeOpenMeteo(lat, lon) {
        // Optionnel: petit label ville (Open-Meteo Geocoding)
        const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=fr`;
        const r = await fetch(url);
        if (!r.ok) return null;
        const j = await r.json();
        const place = j?.results?.[0];
        if (!place) return null;
        const name = [place.name, place.admin1].filter(Boolean).join(", ");
        return name || null;
    }

    async function fetchWeatherOpenMeteo(lat, lon) {
        // /v1/forecast (doc officielle) :contentReference[oaicite:2]{index=2}
        const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weather_code,wind_speed_10m` +
            `&timezone=Europe%2FParis`;

        const r = await fetch(url);
        if (!r.ok) throw new Error("Meteo fetch failed");
        const j = await r.json();

        const cur = j.current;
        return {
            tempC: cur.temperature_2m,
            code: cur.weather_code,
            windKmh: cur.wind_speed_10m,
        };
    }

    async function initWeather() {
        // 1) Cache
        const cached = loadWeatherCache();
        if (cached) {
            setWeatherUI(cached);
            return;
        }

        // 2) Geo navigateur (le plus précis)
        if (!navigator.geolocation) {
            setWeatherUI({ tempC: 0, code: 2, windKmh: 0, label: "Géoloc indispo" });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                try {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;

                    const meteo = await fetchWeatherOpenMeteo(lat, lon);
                    const data = { ...meteo, label: "Ta zone" };

                    setWeatherUI(data);
                    saveWeatherCache(data);
                } catch (e) {
                    console.warn("Météo: erreur API", e);
                    setWeatherUI({ tempC: 0, code: 2, windKmh: 0, label: "Météo KO" });
                }
            },
            (err) => {
                console.warn("Météo: géoloc refusée", err);
                // fallback propre si refus : on laisse un message
                setWeatherUI({ tempC: 0, code: 2, windKmh: 0, label: "Autorise la géoloc" });
            },
            { enableHighAccuracy: false, timeout: 8000, maximumAge: 60 * 60 * 1000 }
        );
    }

    initWeather();

    startClock();
});
