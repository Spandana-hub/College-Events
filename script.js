// ==============================
// 1. FIREBASE CONFIG
// ==============================
const firebaseConfig = {
    apiKey: "AIzaSyBJM-NokxmVf4947LkatBRdyp94OV55kdg",
    authDomain: "college-events-be5d8.firebaseapp.com",
    projectId: "college-events-be5d8",
    storageBucket: "college-events-be5d8.firebasestorage.app",
    messagingSenderId: "387002702214",
    appId: "1:387002702214:web:05ce77aa86de871939f407",
    measurementId: "G-ZZSDRQ351J"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

// ==============================
// 2. EXTERNAL URLS
// ==============================
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx7qxKJw6NSthS5MTvotkQ4vS4LNx7gqAsW8KVAL957tJK_vnox-tCtGUqO1rVYkjmUjQ/exec";
const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSd1vpOK3-3vXG8K3sCAeGFD9lEichlyvtNB2xLscPmYIzC-iw/viewform?usp=dialog";

// ==============================
// 3. GLOBAL STATE
// ==============================
let allEvents = [];
let isHost = false;

// ==============================
// 4. AUTH STATE HANDLER
// ==============================
auth.onAuthStateChanged(async (user) => {
    const path = window.location.pathname;
    const isLoginPage =
        path.endsWith("index.html") || path.endsWith("/") || path === "";

    // 🔴 Not logged in → always go to login
    if (!user) {
        if (!isLoginPage) window.location.href = "index.html";
        return;
    }

    try {
        // 🔹 Fetch role
        const roleDoc = await db.collection("roles").doc(user.email).get();
        const isAdmin = roleDoc.exists && roleDoc.data().isAdmin === true;

        // ===============================
        // 🔁 REDIRECT LOGIC
        // ===============================
        if (isLoginPage) {
            if (isAdmin) {
                window.location.href = "hostdashboard.html";
            } else {
                window.location.href = "studentdashboard.html";
            }
            return;
        }

        // ===============================
        // 🟢 PAGE-SPECIFIC UI SETUP
        // ===============================
        isHost = isAdmin;

        const hostBtn = document.getElementById("host-btn");
        if (hostBtn) hostBtn.style.display = isHost ? "block" : "none";

        loadEvents();

    } catch (err) {
        console.error("Role check failed", err);
        alert("Unable to verify user role");
        auth.signOut();
    }
});


// ==============================
// 5. AUTH ACTIONS
// ==============================
function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("password").value;
    if (!email || !pass) return alert("Please fill all fields");

    auth.signInWithEmailAndPassword(email, pass).catch(e => alert(e.message));
}

function signUp() {
    const email = document.getElementById("signup-email").value;
    const pass = document.getElementById("signup-password").value;
    const btn = document.getElementById("signup-btn");

    if (!email || !pass) return alert("Please fill all fields");
    
    btn.innerText = "Creating...";
    btn.disabled = true;

    auth.createUserWithEmailAndPassword(email, pass)
        .then(() => {
            alert("Account created successfully!");
            // No need to toggleAuth, onAuthStateChanged will redirect automatically
        })
        .catch(e => {
            alert(e.message);
            btn.innerText = "Register";
            btn.disabled = false;
        });
}

function logout() { auth.signOut(); }

function toggleAuth() {
    const loginBox = document.getElementById("login-container");
    const signupBox = document.getElementById("signup-container");
    loginBox.style.display = loginBox.style.display === "none" ? "block" : "none";
    signupBox.style.display = signupBox.style.display === "none" ? "block" : "none";
}

// ==============================
// 6. EVENT DISPLAY & HELPERS
// ==============================
async function loadEvents() {
    try {
        const res = await fetch(APPS_SCRIPT_URL);
        allEvents = await res.json();
        displayEvents(allEvents);
    } catch (e) { console.error("Fetch failed", e); }
}
function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatTime(timeStr) {
    if (!timeStr) return "";
    const d = new Date(timeStr);
    if (isNaN(d)) return "";

    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`; // ✅ 24-hour clock
}
function displayEvents(events) {
    const grid = document.getElementById("event-grid");
    if (!grid) return;

    grid.innerHTML = events.map(event => {
        const statusColor =
            (event.Statusoftheevent || "").toLowerCase() === "ongoing"
                ? "#22c55e"
                : "#6366f1";

        return `
        <div class="event-card">

            <h2>${event.NameoftheEvent || "Event"}</h2>

            <p style="font-size:12px; color:var(--gray); margin-top:10px;">
                ${event.Descriptionoftheevent || ""}
            </p>

            <p>📍 ${event.Venueoftheevent || "Campus"}</p>

            <p style="padding-bottom:15px">
                📅 ${formatDate(event.Dateoftheevent)}
                &nbsp; | &nbsp;
                ⏰ ${formatTime(event.Timeoftheevent)}
            </p>

            <span class="event-tag" style="font-size:0.8rem; background:${statusColor}">
                ${(event.Statusoftheevent || "Upcoming").toUpperCase()}
            </span>

            ${
                isHost
                    ? `<button class="btn-delete" onclick="deleteEvent('${event.id}')">🗑 Delete</button>`
                    : ""
            }
        </div>
        `;
    }).join("");
}

function filterEvents() {
    const term = document.getElementById("search-input").value.toLowerCase();
    displayEvents(allEvents.filter(e => (e.NameoftheEvent || "").toLowerCase().includes(term)));
}

function openPostForm() { window.open(GOOGLE_FORM_URL, "_blank"); }