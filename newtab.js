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
    const searchInput = document.getElementById("searchInput");

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


    startClock();
});
