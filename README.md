# Password Manager Application

A secure password manager application built with the MERN stack (MongoDB, Express.js, React, Node.js) that allows users to securely store and manage their account credentials with file attachments and automatic logo fetching.

## Features

- 🔐 Secure user authentication with JWT
- 🔑 Password storage with encryption
- ⚡ Automatic password generation
- 📎 File attachments support with GridFS
- 🌐 Enhanced automatic website logo fetching system
- 🎨 Dark mode interface
- 📱 Responsive design for all devices
- 🛡️ Protected API routes with rate limiting

## Tech Stack

- **Frontend**: React.js, TailwindCSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas with GridFS for file storage
- **Authentication**: JWT (JSON Web Tokens)
- **File Storage**: GridFS for scalable file storage
- **Logo System**: Multi-source favicon fetching with fallback options

## Enhanced Logo Fetching System

The application includes a sophisticated logo fetching system with the following features:

- Multiple source fetching:
  - Direct website favicon.ico
  - Google's favicon service
  - Fallback to text-based avatars
- Quality validation:
  - Content-type verification
  - Image format validation
- Status tracking:
  - Success/error status
  - Source tracking
  - Quality indicators
- Automatic updates:
  - Daily logo refresh
  - Manual update option for admins

## Project Structure

```
password-manager/
├── backend/
│   ├── config/
│   │   ├── db.js                 # Database configuration
│   │   │   └── default.json          # Default configuration
│   │   ├── middleware/
│   │   │   ├── auth.js               # Authentication middleware
│   │   │   ├── error.js             # Error handling middleware
│   │   │   └── upload.js            # File upload middleware
│   │   ├── models/
│   │   │   ├── Account.js           # Account model schema
│   │   │   └── User.js              # User model schema
│   │   ├── routes/
│   │   │   ├── accountRoutes.js     # Account routes
│   │   │   ├── authRoutes.js        # Authentication routes
│   │   │   └── userRoutes.js        # User routes
│   │   ├── uploads/                  # File upload directory
│   │   ├── .env                     # Environment variables
│   │   ├── package.json             # Backend dependencies
│   │   └── server.js                # Express server setup
│   │
│   ├── frontend/
│   │   ├── public/
│   │   │   ├── index.html           # HTML template
│   │   │   └── favicon.ico          # App favicon
│   │   ├── src/
│   │   │   ├── components/          # React components
│   │   │   │   ├── Auth/
│   │   │   │   │   ├── Login.js
│   │   │   │   │   └── Register.js
│   │   │   │   ├── Dashboard/
│   │   │   │   │   └── Dashboard.js
│   │   │   │   └── common/          # Shared components
│   │   │   ├── context/
│   │   │   │   └── AuthContext.js   # Authentication context
│   │   │   ├── styles/
│   │   │   │   └── tailwind.css     # Tailwind styles
│   │   │   ├── App.js               # Main App component
│   │   │   └── index.js             # React entry point
│   │   ├── package.json             # Frontend dependencies
│   │   └── tailwind.config.js       # Tailwind configuration
│   │
│   ├── .gitignore                   # Git ignore rules
│   └── README.md                    # Project documentation
└── package.json                 # Root package.json
```

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm (v6 or higher)
- MongoDB Atlas account
- Git

## Installation

1. Clone the repository:
```bash
git clone https://github.com/jayakumar9/password-manager.git
cd password-manager
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

4. Configure environment variables:

Create a `.env` file in the backend directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=your_mongodb_atlas_connection_string
# Example: mongodb+srv://username:password@cluster.mongodb.net/password_manager?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret_key
JWT_EXPIRE=30d                  # Token expiration time (30 days)

# Rate Limiting
RATE_LIMIT_WINDOW=15           # Time window in minutes
RATE_LIMIT_MAX=100             # Maximum requests per window

# File Upload Configuration
MAX_FILE_SIZE=5                # Maximum file size in MB
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# Optional: Email Configuration (if implementing email notifications)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your_email@gmail.com
# SMTP_PASS=your_app_specific_password
```

5. Create required directories:
```bash
mkdir backend/uploads
```

## Running the Application

1. Start the backend server:
```bash
cd backend
npm run dev
```

2. In a new terminal, start the frontend:
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user

### Accounts
- GET `/api/accounts` - Get all accounts
- POST `/api/accounts` - Create new account
- PUT `/api/accounts/:id` - Update account
- DELETE `/api/accounts/:id` - Delete account
- GET `/api/accounts/generate-password` - Generate secure password
- POST `/api/accounts/update-logos` - Update all account logos (Admin only)
- GET `/api/accounts/files/:id` - Get attached file

### File Management
- GridFS integration for scalable file storage
- Secure file access with user authentication
- Support for multiple file types
- Automatic cleanup of unused files

## Security Measures

- Password hashing using bcrypt
- JWT for secure authentication
- File upload validation
- CORS protection
- Rate limiting on API endpoints
- Secure password generation
- Protected file access

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add YourFeature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Open a Pull Request

## Troubleshooting

If you encounter any issues:

1. Ensure MongoDB is running and accessible
2. Check all environment variables are set correctly
3. Verify all dependencies are installed
4. Clear browser cache and local storage
5. Check console for error messages

## License

This project is licensed under the MIT License. 