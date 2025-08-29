# Inventory Management System (IMS)

A comprehensive web-based inventory management system with role-based access control, designed for businesses to manage their inventory, track sales, and monitor business performance.

## 🚀 Features

### 🔐 Authentication & Role Management
- **Three User Roles**: Admin, Manager, and Staff
- **Secure Login**: JWT-based authentication with bcrypt password hashing
- **Role-based Access Control**: Different features accessible based on user role

### 📦 Product Management
- **Product CRUD**: Add, edit, and manage products
- **Flexible Units**: Support for both countable (pieces, boxes) and weighable (kg, liters) items
- **Product Categories**: Organize products by category
- **SKU & Barcode**: Optional product identification
- **Pricing**: Set and manage unit prices

### 📊 Inventory Management
- **Stock In**: Add inventory when deliveries arrive
- **Stock Out**: Remove inventory for sales, waste, or adjustments
- **Real-time Updates**: Automatic stock level updates
- **Transaction History**: Track all stock movements with notes

### 🛒 Sales Management (POS-like)
- **Product Selection**: Search and select products by name, category, or SKU
- **Shopping Cart**: Add multiple items before checkout
- **Quantity/Weight Support**: Handle both countable and weighable products
- **Automatic Stock Deduction**: Stock levels updated after each sale

### 📈 Reports & Analytics
- **Stock Reports**: Current inventory levels and low stock alerts
- **Sales Reports**: Daily, weekly, and monthly sales data
- **Revenue Analytics**: Track revenue trends and performance
- **Period Selection**: View data for different time periods

### 👥 User Management (Admin Only)
- **Create Users**: Add new system users
- **Role Assignment**: Assign appropriate roles to users
- **Password Management**: Secure password handling

## 🏗️ System Architecture

### Backend
- **Node.js** with **Express.js** framework
- **SQLite** database for data persistence
- **JWT** for authentication
- **bcryptjs** for password hashing
- **Security middleware** (helmet, rate limiting, CORS)

### Frontend
- **React.js** with modern hooks
- **React Router** for navigation
- **Responsive design** with custom CSS
- **Toast notifications** for user feedback
- **Modal components** for forms

### Database Schema
- **Users**: Authentication and role management
- **Products**: Product information and current stock
- **Stock Transactions**: All stock movements with audit trail
- **Sales**: Sales records with product and user details

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IMS
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Start the development server**
   ```bash
   # Start backend (from root directory)
   npm run dev
   
   # Start frontend (in another terminal, from root directory)
   npm run client
   ```

5. **Access the application**
   - Backend API: http://localhost:5000
   - Frontend: http://localhost:3000

### Default Login Credentials
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Administrator

## 📱 User Interface

### Dashboard
- Overview of key metrics
- Quick access to common actions
- Role-based action buttons

### Navigation
- **Products**: Manage product catalog
- **Stock Management**: Handle inventory operations
- **Sales**: Process customer sales
- **Reports**: View business analytics
- **User Management**: Manage system users (Admin only)

### Responsive Design
- Mobile-friendly interface
- Collapsible sidebar navigation
- Touch-optimized controls

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: API request throttling
- **CORS Protection**: Cross-origin request security
- **Input Validation**: Server-side data validation
- **SQL Injection Protection**: Parameterized queries

## 📊 Role Permissions

### 👑 Administrator
- **Full System Access**: All features available
- **User Management**: Create, edit, and manage users
- **Product Management**: Add, edit, and delete products
- **Stock Operations**: Full inventory control
- **Sales Processing**: Record and manage sales
- **Reports Access**: View all business analytics

### 📊 Manager
- **Monitoring & Decision Making**: View all reports and analytics
- **Stock Operations**: Add and remove inventory
- **Sales Processing**: Record customer sales
- **Limited Access**: Cannot manage users or system settings

### 👷 Staff/Cashier
- **Sales Operations**: Process customer sales
- **Stock In**: Add inventory when deliveries arrive
- **Basic Access**: No access to reports, user management, or system settings

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Users (Admin Only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product (Admin only)
- `PUT /api/products/:id` - Update product (Admin only)

### Stock Management
- `POST /api/stock/stock-in` - Add inventory
- `POST /api/stock/stock-out` - Remove inventory

### Sales
- `POST /api/sales` - Record sale

### Reports (Admin/Manager)
- `GET /api/reports/stock` - Stock levels report
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/revenue` - Revenue analytics

## 📁 Project Structure

```
IMS/
├── server.js              # Main server file
├── package.json           # Backend dependencies
├── client/                # React frontend
│   ├── public/           # Static files
│   ├── src/              # Source code
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts
│   │   ├── services/     # API services
│   │   ├── App.js        # Main app component
│   │   └── index.js      # Entry point
│   └── package.json      # Frontend dependencies
└── README.md             # This file
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
PORT=5000
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### Database
The system uses SQLite by default. The database file (`inventory.db`) will be created automatically on first run.

## 🚀 Deployment

### Production Build
```bash
# Build frontend
cd client
npm run build
cd ..

# Start production server
npm start
```

### Environment Setup
- Set `NODE_ENV=production`
- Configure proper `JWT_SECRET`
- Set up reverse proxy (nginx) if needed
- Configure SSL certificates for HTTPS

## 🧪 Testing

The system includes basic error handling and validation. For production use, consider adding:

- Unit tests for API endpoints
- Integration tests for database operations
- Frontend component testing
- End-to-end testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the documentation
- Review the code comments
- Open an issue on GitHub

## 🔮 Future Enhancements

- **Barcode Scanner Integration**: Mobile app with camera scanning
- **Advanced Analytics**: Charts and graphs for better insights
- **Multi-location Support**: Manage inventory across multiple locations
- **Supplier Management**: Track suppliers and purchase orders
- **Email Notifications**: Low stock alerts and reports
- **Data Export**: CSV/Excel export functionality
- **Backup & Recovery**: Database backup and restore features

---

**Built with ❤️ using Node.js, Express, React, and SQLite**
