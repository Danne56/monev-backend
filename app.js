require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { body, validationResult } = require('express-validator');
const morgan = require('morgan');
const app = express();

app.use(express.json());
app.use(morgan('combined')); // Logging aktivitas

// Konfigurasi database menggunakan variabel lingkungan
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432, // Default PostgreSQL port
  max: 10, // Jumlah maksimal koneksi dalam pool
  idleTimeoutMillis: 30000, // Timeout untuk koneksi idle
};

// Buat koneksi pool ke database PostgreSQL
const dbPool = new Pool(dbConfig);

dbPool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Error connecting to the database:', err);
  } else {
    console.log('Database connection successful:', res.rows[0]);
  }
  //dbPool.end();
});

// Middleware untuk validasi role
function authorize(role) {
  return (req, res, next) => {
    const userRole = req.user.role; // Diperoleh dari token JWT
    if (userRole !== role) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    next();
  };
}

// Middleware untuk memverifikasi token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Akses ditolak. Token tidak ditemukan.' });
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token tidak valid.' });
    req.user = user;
    next();
  });
}

// Endpoint Register
app.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email tidak valid.'),
    body('password').isLength({ min: 8 }).withMessage('Password minimal 8 karakter.'),
    body('role').isIn(['pengunjung', 'pengelola', 'dinas', 'admin']).withMessage('Role tidak valid.')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { email, password, role } = req.body;
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Simpan data sebagai JSONB
      const query = 'INSERT INTO users (data) VALUES ($1)';
      const userData = {
        email,
        password: hashedPassword,
        role
      };
      await dbPool.query(query, [userData]);

      // Refetch data pengguna yang baru saja diregistrasi
      const refetchQuery = 'SELECT data FROM users WHERE data->>\'email\' = $1';
      const refetchResult = await dbPool.query(refetchQuery, [email]);
      const newUser = refetchResult.rows[0].data;

      res.status(201).json({
        message: 'Registrasi berhasil!',
        user: newUser // Kirim data pengguna terbaru
      });
    } catch (err) {
      console.error(err);
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Email sudah terdaftar.' });
      }
      res.status(500).json({ error: 'Terjadi kesalahan server.' });
    }
  }
);

// Endpoint Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    // Cari pengguna berdasarkan email di kolom JSONB
    const query = 'SELECT data FROM users WHERE data->>\'email\' = $1';
    const result = await dbPool.query(query, [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Email atau password salah.' });
    }

    const user = result.rows[0].data; // Data JSONB
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Email atau password salah.' });
    }

    // Generate JWT
    const token = jwt.sign({ email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Refetch data pengguna terbaru
    const refetchQuery = 'SELECT data FROM users WHERE data->>\'email\' = $1';
    const refetchResult = await dbPool.query(refetchQuery, [email]);
    const updatedUser = refetchResult.rows[0].data;

    res.json({
      token,
      user: updatedUser // Kirim data pengguna terbaru
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Endpoint Refetch
app.get('/refetch', authenticateToken, async (req, res) => {
  try {
    const { email } = req.user; // Dapatkan email dari token JWT

    // Query untuk mendapatkan data pengguna berdasarkan email
    const query = 'SELECT data FROM users WHERE data->>\'email\' = $1';
    const result = await dbPool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    const user = result.rows[0].data; // Data JSONB
    res.json({ user }); // Kirim data pengguna sebagai respons
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
});

// Endpoint Admin (Contoh endpoint dengan validasi role)
app.get('/admin', authenticateToken, authorize('admin'), (req, res) => {
  res.json({ message: 'Halo Admin!' });
});

// Penanganan kesalahan global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Terjadi kesalahan server.' });
});

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});