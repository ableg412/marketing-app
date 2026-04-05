const express = require('express');
const session = require('express-session');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
let db;
(async () => {
    db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            address TEXT,
            phone TEXT,
            email TEXT
        );

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        );
    `);

    // Seed dummy data
    const user = await db.get('SELECT * FROM users WHERE username = ?', ['Abel']);
    if (!user) {
        await db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['Abel', '1234']);
    }

    const contactsCount = await db.get('SELECT COUNT(*) as count FROM contacts');
    if (contactsCount.count === 0) {
        await db.run('INSERT INTO contacts (name, address, phone, email) VALUES (?, ?, ?, ?)', ['John Doe', '123 Maple St, Houston', '555-0101', 'john@example.com']);
        await db.run('INSERT INTO contacts (name, address, phone, email) VALUES (?, ?, ?, ?)', ['Jane Smith', '456 Oak Rd, Austin', '555-0202', 'jane@example.com']);
        await db.run('INSERT INTO contacts (name, address, phone, email) VALUES (?, ?, ?, ?)', ['Robert Garcia', '789 Pine Ln, Dallas', '555-0303', 'robert@example.com']);
        await db.run('INSERT INTO contacts (name, address, phone, email) VALUES (?, ?, ?, ?)', ['Sarah Wilson', '321 Birch Blvd, San Antonio', '555-0404', 'sarah@example.com']);
    }
    console.log('Database initialized and seeded.');
})();

// Middleware
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'marketing-secret',
    resave: false,
    saveUninitialized: true
}));

// Auth middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.user) return next();
    res.redirect('/login');
};

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await db.get('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    
    if (user) {
        req.session.user = user;
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/dashboard', isAuthenticated, async (req, res) => {
    const contacts = await db.all('SELECT * FROM contacts');
    res.render('dashboard', { contacts });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
});
