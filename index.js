const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to SQLite Database
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) {
        console.error("Database connection error:", err.message);
    } else {
        console.log("Connected to SQLite database.");
        
        db.run(`
            CREATE TABLE IF NOT EXISTS Users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL
            )
        `);
        
        db.run(`
            CREATE TABLE IF NOT EXISTS ConferenceSections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                section_name TEXT NOT NULL,
                content TEXT NOT NULL
            )
        `, () => {
            db.get("SELECT COUNT(*) as count FROM ConferenceSections", (err, row) => {
                if (row && row.count === 0) {
                    const stmt = db.prepare("INSERT INTO ConferenceSections (section_name, content) VALUES (?, ?)");
                    const sections = [
                        ['Home', 'Welcome to the 2026 International Conference on Advanced Systems (ICA2S). This premier event brings together researchers, scientists, and industry practitioners to explore the latest innovations in technology.'],
                        ['Committee', '<h3 class="font-bold text-blue-400 mb-2">Steering Committee</h3><ul class="list-disc pl-5 mb-4"><li>Dr. Aris Thompson (Chair)</li><li>Dr. Sarah Jenkins (Co-Chair)</li></ul>'],
                        ['Important Dates', '<div class="overflow-x-auto"><table class="w-full border-collapse border border-gray-700 text-left"><tr class="bg-gray-800"><th class="p-2 border border-gray-700">Event</th><th class="p-2 border border-gray-700">Date</th></tr><tr><td class="p-2 border border-gray-700">Paper Submission</td><td class="p-2 border border-gray-700">October 15, 2025</td></tr></table></div>'],
                        ['Registration', '<ul class="list-disc pl-5"><li>Regular Author: $450</li><li>Student Author: $250</li></ul><p class="mt-4 text-sm text-red-400 font-bold">Late registration after Jan 1st will incur a $100 surcharge.</p>'],
                        ['Contact', 'For general inquiries: info@ica2s.vercel.app<br>Phone: +1 (555) 123-4567']
                    ];
                    sections.forEach(s => stmt.run(s[0], s[1]));
                    stmt.finalize();
                }
            });
        });
    }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'ica2s_secret_key',
    resave: false,
    saveUninitialized: false
}));

// --- API ENDPOINTS (Stay same as original) ---
app.get('/api/sections', (req, res) => {
    db.all("SELECT * FROM ConferenceSections", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    db.run("INSERT INTO Users (username, password) VALUES (?, ?)", [username, password], function(err) {
        if (err) return res.status(400).json({ success: false, message: "Error or User exists" });
        res.json({ success: true, message: "Registered! Please login." });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM Users WHERE username = ? AND password = ?", [username, password], (err, row) => {
        if (row) {
            req.session.user = row.username;
            res.json({ success: true, username: row.username });
        } else res.status(401).json({ success: false, message: "Invalid credentials" });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/status', (req, res) => {
    if (req.session.user) res.json({ loggedIn: true, username: req.session.user });
    else res.json({ loggedIn: false });
});

// --- UPDATED DARK MODE FRONTEND ---
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ICA2S 2026 - MD AQUIB</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        html { scroll-behavior: smooth; }
        body { background-color: #0f172a; color: #f1f5f9; }
        .modal { display: none; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); }
        .modal.active { display: flex; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1e293b; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
    </style>
</head>
<body class="leading-relaxed">

    <nav class="fixed top-0 w-full bg-slate-900/90 border-b border-slate-800 text-white z-50 backdrop-blur-md">
        <div class="max-w-7xl mx-auto px-4 h-16 flex justify-between items-center">
            <span class="font-black text-xl tracking-tighter text-blue-500">ICA2S 2026</span>
            
            <div class="hidden md:flex space-x-6 text-[12px] font-bold uppercase items-center">
                <a href="#Home" class="hover:text-blue-400 transition">Home</a>
                <a href="#Committee" class="hover:text-blue-400 transition">Committee</a>
                <a href="#Important-Dates" class="hover:text-blue-400 transition">Dates</a>
                <a href="#Registration" class="hover:text-blue-400 transition">Registration</a>
                
                <div id="desktop-auth-container" class="ml-4 pl-4 border-l border-slate-700">
                    <button onclick="toggleModal()" id="btn-login" class="bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-500 transition shadow-lg shadow-blue-900/20">Login</button>
                    <div id="user-profile" class="hidden flex items-center gap-3">
                        <span id="welcome-msg" class="text-blue-400"></span>
                        <button onclick="handleLogout()" class="text-xs bg-red-500/10 text-red-400 border border-red-500/50 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition">Logout</button>
                    </div>
                </div>
            </div>
        </div>
    </nav>

    <main id="main-target" class="pt-24 px-6 max-w-5xl mx-auto"></main>

    <footer class="bg-slate-950 border-t border-slate-800 text-white py-12 text-center mt-20">
        <div class="max-w-2xl mx-auto px-4">
            <p class="opacity-50 text-sm mb-4">&copy; 2026 ICA2S International</p>
            <div class="pt-4">
                <p class="text-xl font-bold tracking-tight text-white">MD AQUIB</p>
                <p class="text-blue-500 font-mono mt-1">Scholar Number: 24U021021</p>
            </div>
        </div>
    </footer>

    <div id="auth-modal" class="modal fixed inset-0 z-[100] items-center justify-center p-4">
        <div class="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-8 relative">
            <button onclick="toggleModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl">&times;</button>
            <h2 id="modal-title" class="text-2xl font-bold text-white mb-6">User Login</h2>
            <form id="auth-form" onsubmit="handleAuth(event)">
                <div class="mb-4">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
                    <input type="text" id="username" required class="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <div class="mb-6">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
                    <input type="password" id="password" required class="w-full bg-slate-800 border border-slate-700 p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none">
                </div>
                <p id="auth-error" class="text-red-400 text-sm mb-4 hidden"></p>
                <button type="submit" id="submit-btn" class="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-500 transition">Continue</button>
            </form>
            <button onclick="toggleMode()" id="toggle-btn" class="mt-4 text-sm text-blue-400 hover:underline w-full text-center">New here? Create account</button>
        </div>
    </div>

    <script>
        let isLoginMode = true;

        async function loadContent() {
            const res = await fetch('/api/sections');
            const data = await res.json();
            const target = document.getElementById('main-target');
            target.innerHTML = data.map(item => \`
                <section id="\${item.section_name.replace(/\\s+/g, '-')}" class="py-12">
                    <h2 class="text-3xl font-black text-white mb-6 flex items-center">
                        <span class="w-2 h-8 bg-blue-600 mr-4 rounded-full"></span>
                        \${item.section_name}
                    </h2>
                    <div class="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl shadow-xl text-slate-300">
                        \${item.content}
                    </div>
                </section>
            \`).join('');
        }

        async function checkAuthStatus() {
            const res = await fetch('/api/status');
            const data = await res.json();
            document.getElementById('btn-login').classList.toggle('hidden', data.loggedIn);
            document.getElementById('user-profile').classList.toggle('hidden', !data.loggedIn);
            if(data.loggedIn) document.getElementById('welcome-msg').innerText = 'Welcome, ' + data.username;
        }

        async function handleAuth(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const res = await fetch(isLoginMode ? '/api/login' : '/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const result = await res.json();
            if (result.success) {
                if (isLoginMode) { toggleModal(); checkAuthStatus(); }
                else { isLoginMode = true; toggleMode(); }
            } else {
                const err = document.getElementById('auth-error');
                err.innerText = result.message; err.classList.remove('hidden');
            }
        }

        async function handleLogout() {
            await fetch('/api/logout', { method: 'POST' });
            checkAuthStatus();
        }

        function toggleModal() { document.getElementById('auth-modal').classList.toggle('active'); }
        function toggleMode() {
            isLoginMode = !isLoginMode;
            document.getElementById('modal-title').innerText = isLoginMode ? 'User Login' : 'Create Account';
            document.getElementById('toggle-btn').innerText = isLoginMode ? "New here? Create account" : "Already have an account? Login";
        }

        loadContent();
        checkAuthStatus();
    </script>
</body>
</html>
    `);
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});