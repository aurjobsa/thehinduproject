// server.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Supabase requires this for SSL
});

// Test DB connection
pool.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL database successfully');
    client.release();
  })
  .catch(err => {
    console.error('❌ Failed to connect to the database:', err.stack);
  });


// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied' });
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Check if user is admin
const isAdmin = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_roles WHERE user_id = $1 AND role = $2',
      [userId, 'admin']
    );
    return result.rows.length > 0;
  } catch (err) {
    console.error('Database error:', err);
    return false;
  }
};

// Routes

app.get('/', (req, res)=>{
  res.sendFile("/public/index.html")
})

// Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, fullName, location, phone, skills } = req.body;
    
    // Check if user exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Insert user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, full_name, location, phone, skills) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [username, email, passwordHash, fullName, location, phone, skills]
    );
    
    // Set initial role as 'user'
    await pool.query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [result.rows[0].id, 'user']
    );
    
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is admin
    const admin = await isAdmin(user.id);
    
    // Create token
    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: admin },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        isAdmin: admin
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all posts
app.get('/api/posts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT p.*, u.username FROM posts p JOIN users u ON p.admin_id = u.id ORDER BY p.created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching posts:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create post (admin only)
app.post('/api/posts', authenticateToken, async (req, res) => {
  try {
    const { title, content, imageUrl } = req.body;
    const userId = req.user.id;
    
    // Check if user is admin
    const admin = await isAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Only admins can create posts' });
    }
    
    const result = await pool.query(
      'INSERT INTO posts (admin_id, title, content, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, title, content, imageUrl]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add this route to backend-code.js, right after the post creation route

// Delete post (admin only)
app.delete('/api/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    
    // Check if user is admin
    const admin = await isAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Only admins can delete posts' });
    }
    
    // First delete all comments associated with the post
    await pool.query(
      'DELETE FROM comments WHERE post_id = $1',
      [postId]
    );
    
    // Then delete the post
    const result = await pool.query(
      'DELETE FROM posts WHERE id = $1 RETURNING *',
      [postId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    console.error('Error deleting post:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get post comments
app.get('/api/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    
    const result = await pool.query(
      'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.post_id = $1 ORDER BY c.created_at',
      [postId]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment to post
app.post('/api/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;
    
    const result = await pool.query(
      'INSERT INTO comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, content]
    );
    
    const comment = result.rows[0];
    
    // Get username for the response
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    comment.username = userResult.rows[0].username;
    
    res.status(201).json(comment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all events
app.get('/api/events', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT e.*, u.username FROM events e JOIN users u ON e.created_by = u.id ORDER BY e.event_date'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching events:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create event (admin only)
app.post('/api/events', authenticateToken, async (req, res) => {
  try {
    const { title, description, location, eventDate } = req.body;
    const userId = req.user.id;
    
    // Check if user is admin
    const admin = await isAdmin(userId);
    if (!admin) {
      return res.status(403).json({ error: 'Only admins can create events' });
    }
    
    const result = await pool.query(
      'INSERT INTO events (title, description, location, event_date, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, location, eventDate, userId]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// RSVP to event
app.post('/api/events/:eventId/rsvp', authenticateToken, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.body;
    const userId = req.user.id;
    
    // Check if RSVP exists
    const checkResult = await pool.query(
      'SELECT * FROM event_rsvps WHERE event_id = $1 AND user_id = $2',
      [eventId, userId]
    );
    
    if (checkResult.rows.length > 0) {
      // Update existing RSVP
      await pool.query(
        'UPDATE event_rsvps SET status = $1 WHERE event_id = $2 AND user_id = $3',
        [status, eventId, userId]
      );
    } else {
      // Create new RSVP
      await pool.query(
        'INSERT INTO event_rsvps (event_id, user_id, status) VALUES ($1, $2, $3)',
        [eventId, userId, status]
      );
    }
    
    res.json({ message: 'RSVP updated successfully' });
  } catch (err) {
    console.error('Error updating RSVP:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get chat messages
app.get('/api/chat', authenticateToken, async (req, res) => {
  try {
    // Get the last 50 messages
    const result = await pool.query(
      'SELECT m.*, u.username FROM messages m JOIN users u ON m.user_id = u.id ORDER BY m.created_at DESC LIMIT 50'
    );
    
    res.json(result.rows.reverse());
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Post chat message
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    
    const result = await pool.query(
      'INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING *',
      [userId, content]
    );
    
    const message = result.rows[0];
    
    // Get username for the response
    const userResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    message.username = userResult.rows[0].username;
    
    res.status(201).json(message);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Server start
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
