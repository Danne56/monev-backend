
# User Authentication and Role-Based Access Control API

This is a Node.js-based RESTful API that provides user registration, login, and role-based access control. It uses PostgreSQL as the database and stores user data in JSONB format. The API includes features like password hashing, JWT authentication, and role-based authorization.

## Prerequisites

Before running the application, ensure you have the following installed:

- Node.js (v14 or higher)
- PostgreSQL (with a database already created)
- Environment variables configured (see `.env.example`)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/authentication-api.git
   cd authentication-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add the following environment variables:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret_key
   ```

4. Set up the PostgreSQL database:
   - Ensure PostgreSQL is running.
   - Create a table for storing user data:
     ```sql
     CREATE TABLE users (
       id SERIAL PRIMARY KEY,
       data JSONB NOT NULL
     );
     ```
    - Create a unique index for email:
	  ```sql
	  CREATE UNIQUE INDEX idx_users_email ON users ((data->>'email'));
	  ```

5. Start the server:
   ```bash
   npm start
   ```

The server will start on `http://localhost:3000`.

## API Endpoints

### 1. Register a New User
**POST** `/register`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "role": "pengunjung"
}
```

Response:
- Success (201): `{ "message": "Registrasi berhasil!" }`
- Error (400): Validation errors or duplicate email.

---

### 2. Login
**POST** `/login`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

Response:
- Success (200): `{ "token": "jwt_token_here" }`
- Error (400): Invalid email or password.

---

### 3. Admin Endpoint (Protected)
**GET** `/admin`

Headers:
```json
Authorization: Bearer <jwt_token>
```

Response:
- Success (200): `{ "message": "Halo Admin!" }`
- Error (403): Access denied if the user is not an admin.

---

## Middleware

### 1. `authenticateToken`
Verifies the JWT token provided in the `Authorization` header. If valid, it attaches the user information to the request object (`req.user`).

### 2. `authorize(role)`
Checks if the authenticated user has the required role to access the endpoint. For example, only users with the `admin` role can access the `/admin` endpoint.

---

## Database Configuration

The database connection is managed using a connection pool from the `pg` library. The configuration is loaded from environment variables:

```javascript
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  max: 10, // Maximum number of connections in the pool
  idleTimeoutMillis: 30000, // Timeout for idle connections
};
```

---

## Logging

The API uses the `morgan` library to log HTTP requests. Logs include details like request method, URL, response status, and response time.

---

## Security Considerations

- **Password Hashing**: Passwords are hashed using bcrypt with a salt round of 10.
- **JWT Expiry**: Tokens expire after 1 hour (`expiresIn: '1h'`).
- **Environment Variables**: Sensitive information like database credentials and JWT secret is stored in environment variables.

---

## Future Improvements

- Add rate limiting to prevent brute-force attacks.
- Implement email verification during registration.
- Add support for refreshing JWT tokens.
- Enhance logging with structured logs and integration with monitoring tools.
