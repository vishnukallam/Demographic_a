# Demographic - Social Map Application (Production)

A real-time location-based social app connecting users via shared interests.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- MongoDB Atlas Account

## Project Structure

- **root**: Contains the Backend (Node.js/Express/Socket.io).
- **client/**: Contains the Frontend (React/Vite).

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd Demographic
    ```

2.  **Install Backend Dependencies:**
    ```bash
    npm install
    ```

3.  **Install Frontend Dependencies:**
    ```bash
    cd client
    npm install
    cd ..
    ```

## Configuration

Create a `.env` file in the root directory:

```env
# MongoDB & Server Config
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/?appName=Cluster0
PORT=10000
JWT_SECRET=your_super_secret_jwt_key

# URLs for CORS
CLIENT_URL=http://localhost:5173
VITE_API_URL=http://localhost:10000

# Legacy Google OAuth (Optional/Future Use)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://localhost:10000/auth/google/callback
```

## Running Locally

To run both the backend and frontend concurrently:

```bash
npm run dev
```

- **Backend:** http://localhost:10000
- **Frontend:** http://localhost:5173

## Deployment

### Backend (Render)

1.  Create a **Web Service** on Render.
2.  Set `Build Command`: `npm install`
3.  Set `Start Command`: `node server/index.js`
4.  Add Environment Variables from the Ledger below.

### Frontend (Vercel)

1.  Import project.
2.  **Root Directory:** `.` (Repo Root)
3.  **Build Command:** `npm install && cd client && npm install && npm run build`
4.  **Output Directory:** `client/dist`
5.  **Environment Variables:**
    - `VITE_API_URL`: Your production backend URL (e.g., https://your-app.onrender.com)

---

## Development Ledger

### Authentication Update (Current)

-   **System Pivot**: Replaced Google OAuth with Custom Email/Password Authentication using JWT.
-   **New Features**:
    -   Registration with Name, Email, Password, Bio.
    -   Interest selection with Categories and Custom Interest support.
    -   **Interest Moderation**: Automated flagging of inappropriate custom interests (Explicit, Violence, Hate, etc.).
    -   **Avatars**: Auto-generated initials avatars for users without profile photos.
-   **Security**:
    -   `bcryptjs` for password hashing.
    -   `jsonwebtoken` for stateless authentication.
    -   Removed `express-session` and `passport`.
-   **Legacy**:
    -   Google Strategy code moved to `server/auth/legacy/`.
    -   Login page includes a placeholder for future Google Login integration.

### Files Modified

1.  **`server/models/User.js`**: Added password, bio; removed strict googleId requirement.
2.  **`server/routes/auth.js`**: New custom auth endpoints (`/register`, `/login`).
3.  **`server/utils/moderation.js`**: Content moderation logic.
4.  **`client/src/components/Register.jsx`**: New registration UI.
5.  **`client/src/components/Login.jsx`**: Updated for email/password.
6.  **`client/src/store/authSlice.js`**: Refactored for JWT auth.

### Environment Variables Checklist

#### Render (Backend)
-   `MONGO_URI`: Connection string for MongoDB Atlas.
-   `PORT`: `10000`.
-   `JWT_SECRET`: Secure key for token signing.
-   `CLIENT_URL`: URL of the frontend (for CORS).

#### Vercel (Frontend)
-   `VITE_API_URL`: URL of the backend.
