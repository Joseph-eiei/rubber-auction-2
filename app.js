const express       = require('express');
const path          = require('path');
const bodyParser    = require('body-parser');
const sqlite3       = require('sqlite3').verbose();
const session       = require('express-session');

const app = express();
const db  = new sqlite3.Database('./data.db');

// ตั้งค่า view engine และ public folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'rubber-auction-secret',
  resave: false,
  saveUninitialized: false
}));

// สร้างตาราง offers ถ้ายังไม่มี
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS offers (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT,
    price REAL,
    date  TEXT
  )`);
});

// --- หน้าแรก (/) ให้กรอกชื่อ + ราคา ---
app.get('/', (req, res) => {
  res.render('index', { success: null }); // Pass success: null to avoid ReferenceError
});

app.post('/bid', (req, res) => {
  const { name, price } = req.body;
  // เก็บวันที่ไทย dd/mm/yyyy
  const today = new Date().toLocaleDateString('th-TH', {
    day:   'numeric',
    month: 'numeric',
    year:  'numeric'
  });
  db.run(
    'INSERT INTO offers (name, price, date) VALUES (?, ?, ?)',
    [name, price, today],
    err => {
      if (err) console.error(err);
      res.render('index', { success: 'ส่งราคาประมูลสำเร็จ!' }); // Pass success message
    }
  );
});

// --- หน้า login (/login) สำหรับแอดมิน (password = 2956) ---
app.get('/login', (req, res) => {
  res.render('login.ejs', { error: null });
});

app.post('/login', (req, res) => {
  if (req.body.password === '2956') {
    req.session.auth = true;
    res.redirect('/results');
  } else {
    res.render('login', { error: 'รหัสผ่านไม่ถูกต้อง' });
  }
});

// --- หน้าแสดงผล (/results) ---
app.get('/results', (req, res) => {
  if (!req.session.auth) return res.redirect('/login');

  // หาวันที่ล่าสุด
  db.get(
    `SELECT date
       FROM offers
      ORDER BY date(date,'+') DESC
      LIMIT 1`,
    [],
    (err, row) => {
      if (err || !row) {
        return res.render('results', { date: null, offers: [] });
      }
      const latestDate = row.date;
      // ดึงรายการของวันที่นั้น เรียงจากราคาสูงสุด
      db.all(
        `SELECT name, price
           FROM offers
          WHERE date = ?
          ORDER BY price DESC`,
        [latestDate],
        (err, rows) => {
          const offers = rows.map((o, i) => ({
            rank:  i + 1,
            name:  o.name,
            price: o.price.toFixed(2)
          }));
          res.render('results', { date: latestDate, offers });
        }
      );
    }
  );
});

// --- logout ---
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

// เริ่มเซิร์ฟเวอร์
app.listen(3000, () =>
  console.log('▶︎ Server running at http://localhost:3000')
);

