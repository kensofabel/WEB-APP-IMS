const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database initialization
const db = new sqlite3.Database('./inventory.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'staff')),
    full_name TEXT NOT NULL,
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Products table
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    sku TEXT UNIQUE,
    barcode TEXT,
    unit_type TEXT NOT NULL,
    quantity REAL DEFAULT 0,
    weight REAL DEFAULT 0,
    price_per_unit REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Stock transactions table
  db.run(`CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK(transaction_type IN ('stock_in', 'stock_out', 'adjustment')),
    quantity REAL NOT NULL,
    weight REAL DEFAULT 0,
    unit_price REAL,
    total_amount REAL,
    notes TEXT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Sales table
  db.run(`CREATE TABLE IF NOT EXISTS sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    quantity REAL NOT NULL,
    weight REAL DEFAULT 0,
    unit_price REAL NOT NULL,
    total_amount REAL NOT NULL,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Create default admin user if none exists
  db.get("SELECT COUNT(*) as count FROM users WHERE role = 'admin'", (err, row) => {
    if (err) {
      console.error('Error checking admin users:', err);
    } else if (row.count === 0) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.run(`INSERT INTO users (username, password, role, full_name, email) 
               VALUES (?, ?, ?, ?, ?)`, 
               ['admin', hashedPassword, 'admin', 'System Administrator', 'admin@ims.com']);
      console.log('Default admin user created: username: admin, password: admin123');
    }
  });
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Routes
// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        full_name: user.full_name,
        email: user.email
      }
    });
  });
});

// User management routes (Admin only)
app.get('/api/users', authenticateToken, requireRole(['admin']), (req, res) => {
  db.all('SELECT id, username, role, full_name, email, created_at FROM users', (err, users) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(users);
  });
});

app.post('/api/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  const { username, password, role, full_name, email } = req.body;
  
  if (!username || !password || !role || !full_name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['admin', 'manager', 'staff'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(password, 10);

  db.run(`INSERT INTO users (username, password, role, full_name, email) 
           VALUES (?, ?, ?, ?, ?)`, 
           [username, hashedPassword, role, full_name, email], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.status(201).json({ 
      id: this.lastID,
      username,
      role,
      full_name,
      email
    });
  });
});

// Product management routes
app.get('/api/products', authenticateToken, (req, res) => {
  db.all('SELECT * FROM products ORDER BY name', (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(products);
  });
});

app.post('/api/products', authenticateToken, requireRole(['admin']), (req, res) => {
  const { name, category, sku, barcode, unit_type, quantity, weight, price_per_unit } = req.body;
  
  if (!name || !category || !unit_type || !price_per_unit) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  db.run(`INSERT INTO products (name, category, sku, barcode, unit_type, quantity, weight, price_per_unit) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, 
           [name, category, sku, barcode, unit_type, quantity || 0, weight || 0, price_per_unit], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.status(201).json({ 
      id: this.lastID,
      name,
      category,
      sku,
      barcode,
      unit_type,
      quantity: quantity || 0,
      weight: weight || 0,
      price_per_unit
    });
  });
});

app.put('/api/products/:id', authenticateToken, requireRole(['admin']), (req, res) => {
  const { id } = req.params;
  const { name, category, sku, barcode, unit_type, quantity, weight, price_per_unit } = req.body;
  
  db.run(`UPDATE products SET name = ?, category = ?, sku = ?, barcode = ?, unit_type = ?, 
           quantity = ?, weight = ?, price_per_unit = ?, updated_at = CURRENT_TIMESTAMP 
           WHERE id = ?`, 
           [name, category, sku, barcode, unit_type, quantity, weight, price_per_unit, id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product updated successfully' });
  });
});

// Stock management routes
app.post('/api/stock/stock-in', authenticateToken, (req, res) => {
  const { product_id, quantity, weight, unit_price, notes } = req.body;
  const user_id = req.user.id;
  
  if (!product_id || (!quantity && !weight)) {
    return res.status(400).json({ error: 'Product ID and quantity/weight are required' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Add stock transaction record
    db.run(`INSERT INTO stock_transactions (product_id, transaction_type, quantity, weight, unit_price, notes, user_id) 
             VALUES (?, 'stock_in', ?, ?, ?, ?, ?)`, 
             [product_id, quantity || 0, weight || 0, unit_price, notes, user_id], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }
      
      // Update product stock
      const updateQuery = weight ? 
        'UPDATE products SET weight = weight + ? WHERE id = ?' :
        'UPDATE products SET quantity = quantity + ? WHERE id = ?';
      const updateValue = weight || quantity;
      
      db.run(updateQuery, [updateValue, product_id], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }
        
        db.run('COMMIT');
        res.json({ message: 'Stock added successfully' });
      });
    });
  });
});

app.post('/api/stock/stock-out', authenticateToken, (req, res) => {
  const { product_id, quantity, weight, notes } = req.body;
  const user_id = req.user.id;
  
  if (!product_id || (!quantity && !weight)) {
    return res.status(400).json({ error: 'Product ID and quantity/weight are required' });
  }

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Check current stock
    db.get('SELECT quantity, weight FROM products WHERE id = ?', [product_id], (err, product) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!product) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const availableQuantity = product.quantity || 0;
      const availableWeight = product.weight || 0;
      const requestedQuantity = quantity || 0;
      const requestedWeight = weight || 0;
      
      if (quantity && availableQuantity < requestedQuantity) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock quantity' });
      }
      
      if (weight && availableWeight < requestedWeight) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock weight' });
      }
      
      // Add stock transaction record
      db.run(`INSERT INTO stock_transactions (product_id, transaction_type, quantity, weight, notes, user_id) 
               VALUES (?, 'stock_out', ?, ?, ?, ?)`, 
               [product_id, requestedQuantity, requestedWeight, notes, user_id], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Update product stock
        const updateQuery = weight ? 
          'UPDATE products SET weight = weight - ? WHERE id = ?' :
          'UPDATE products SET quantity = quantity - ? WHERE id = ?';
        const updateValue = weight || quantity;
        
        db.run(updateQuery, [updateValue, product_id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          db.run('COMMIT');
          res.json({ message: 'Stock deducted successfully' });
        });
      });
    });
  });
});

// Sales routes
app.post('/api/sales', authenticateToken, (req, res) => {
  const { product_id, quantity, weight, unit_price } = req.body;
  const user_id = req.user.id;
  
  if (!product_id || !unit_price || (!quantity && !weight)) {
    return res.status(400).json({ error: 'Product ID, unit price, and quantity/weight are required' });
  }

  const total_amount = (quantity || weight) * unit_price;

  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Check current stock
    db.get('SELECT quantity, weight FROM products WHERE id = ?', [product_id], (err, product) => {
      if (err) {
        db.run('ROLLBACK');
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!product) {
        db.run('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }
      
      const availableQuantity = product.quantity || 0;
      const availableWeight = product.weight || 0;
      const requestedQuantity = quantity || 0;
      const requestedWeight = weight || 0;
      
      if (quantity && availableQuantity < requestedQuantity) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock quantity' });
      }
      
      if (weight && availableWeight < requestedWeight) {
        db.run('ROLLBACK');
        return res.status(400).json({ error: 'Insufficient stock weight' });
      }
      
      // Record sale
      db.run(`INSERT INTO sales (product_id, quantity, weight, unit_price, total_amount, user_id) 
               VALUES (?, ?, ?, ?, ?, ?)`, 
               [product_id, requestedQuantity, requestedWeight, unit_price, total_amount, user_id], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: 'Database error' });
        }
        
        // Deduct from stock
        const updateQuery = weight ? 
          'UPDATE products SET weight = weight - ? WHERE id = ?' :
          'UPDATE products SET quantity = quantity - ? WHERE id = ?';
        const updateValue = weight || quantity;
        
        db.run(updateQuery, [updateValue, product_id], function(err) {
          if (err) {
            db.run('ROLLBACK');
            return res.status(500).json({ error: 'Database error' });
          }
          
          db.run('COMMIT');
          res.json({ 
            message: 'Sale recorded successfully',
            sale_id: this.lastID,
            total_amount
          });
        });
      });
    });
  });
});

// Reports routes
app.get('/api/reports/stock', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  db.all('SELECT * FROM products ORDER BY name', (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(products);
  });
});

app.get('/api/reports/sales', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { period = 'daily' } = req.query;
  
  let dateFilter = '';
  switch (period) {
    case 'daily':
      dateFilter = "WHERE DATE(created_at) = DATE('now')";
      break;
    case 'weekly':
      dateFilter = "WHERE DATE(created_at) >= DATE('now', '-7 days')";
      break;
    case 'monthly':
      dateFilter = "WHERE DATE(created_at) >= DATE('now', '-30 days')";
      break;
  }
  
  const query = `
    SELECT s.*, p.name as product_name, u.username as seller
    FROM sales s
    JOIN products p ON s.product_id = p.id
    JOIN users u ON s.user_id = u.id
    ${dateFilter}
    ORDER BY s.created_at DESC
  `;
  
  db.all(query, (err, sales) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
    res.json({ sales, totalRevenue });
  });
});

app.get('/api/reports/revenue', authenticateToken, requireRole(['admin', 'manager']), (req, res) => {
  const { period = 'daily' } = req.query;
  
  let dateFilter = '';
  switch (period) {
    case 'daily':
      dateFilter = "WHERE DATE(created_at) = DATE('now')";
      break;
    case 'weekly':
      dateFilter = "WHERE DATE(created_at) >= DATE('now', '-7 days')";
      break;
    case 'monthly':
      dateFilter = "WHERE DATE(created_at) >= DATE('now', '-30 days')";
      break;
  }
  
  const query = `
    SELECT 
      DATE(created_at) as date,
      SUM(total_amount) as daily_revenue,
      COUNT(*) as total_sales
    FROM sales
    ${dateFilter}
    GROUP BY DATE(created_at)
    ORDER BY date DESC
  `;
  
  db.all(query, (err, revenue) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    
    const totalRevenue = revenue.reduce((sum, day) => sum + day.daily_revenue, 0);
    const totalSales = revenue.reduce((sum, day) => sum + day.total_sales, 0);
    
    res.json({ 
      daily_revenue: revenue,
      totalRevenue,
      totalSales
    });
  });
});

// Serve static files from React build
app.use(express.static(path.join(__dirname, 'client/build')));

// Catch all handler for React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Default admin credentials: username: admin, password: admin123`);
});
