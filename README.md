# Demographic - Social Map Application (Production)

A real-time location-based social app connecting users via shared interests using Google Authentication.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- MongoDB Atlas Account
- Google Cloud Console Project (OAuth credentials)

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
SESSION_SECRET=your_secure_session_secret

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
CALLBACK_URL=http://localhost:10000/auth/google/callback

# URLs for CORS and Redirects
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:10000
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
    - `VITE_SERVER_URL`: Your production backend URL (e.g., https://your-app.onrender.com)

---

## Development Ledger

### Files Modified

1.  **`server/index.js`**:
    -   Updated CORS configuration to dynamically allow `CLIENT_URL` and localhost.
    -   Configured `mongoose.connect` with `MONGO_URI` and added error handling (process exit on failure).
    -   Updated Passport Google Strategy to use `CALLBACK_URL`.
    -   Implemented `requireAuth` middleware for protected routes (`/api/interests`, `/api/user/interests`).
    -   Ensured server listens on `0.0.0.0` and `PORT`.
    -   Removed implicit guest handling.
    -   **Update**: Removed legacy local MongoDB fallback. Updated `mongoose.connect` options. Added Atlas connection logging.

2.  **`client/src/App.jsx`**:
    -   Refactored to use `ProtectedRoute`.
    -   Implemented strict redirect: Unauthenticated users are redirected to `/login`.
    -   Added `/login` route.

3.  **`client/src/components/Chat.jsx`**:
    -   **Deleted**: Legacy guest mode chat component replaced by `ChatOverlay.jsx` usage in `Map.jsx`.

4.  **`client/src/store/authSlice.js`**:
    -   Verified removal of guest logic.

5.  **`package.json`**:
    -   Updated `build` script to handle client/server dependency installation and build for Vercel monorepo structure.

6.  **`vercel.json`**:
    -   Updated `outputDirectory` to `client/dist`.
    -   Configured rewrites for SPA routing.

### Transition Fixes

-   **Guest Mode Removal**: Completely stripped the "Guest" access path. The application now strictly enforces Google OAuth.
-   **Authentication Enforcement**: Added server-side middleware to reject unauthenticated API requests with 401. Added client-side routing guards to redirect to login.
-   **MongoDB Connectivity**: Switched to environment-variable based connection with strict error handling to ensure production readiness.
-   **Deployment Compatibility**:
    -   **Render**: Fixed port binding (0.0.0.0) and dynamic callback URLs.
    -   **Vercel**: Configured build scripts and output directories to support the `client/` subdirectory structure within the root repo.
-   **Urgent Auth Fix**:
    -   Removed `server/.env.example`.
    -   Hardcoded production credentials in root `.env` (excluding sensitive data from repo history, present in local env).
    -   Removed legacy local MongoDB connection string support.
    -   Verified removal of deprecated Mongoose options while maintaining connection to Atlas Cluster0.

### Environment Variables Checklist

#### Render (Backend)
-   `MONGO_URI`: Connection string for MongoDB Atlas.
-   `PORT`: `10000` (or as assigned).
-   `SESSION_SECRET`: Secret for session signing.
-   `GOOGLE_CLIENT_ID`: OAuth Client ID.
-   `GOOGLE_CLIENT_SECRET`: OAuth Client Secret.
-   `CALLBACK_URL`: `https://<your-render-url>/auth/google/callback`
-   `CLIENT_URL`: `https://<your-vercel-url>`
-   `SERVER_URL`: `https://<your-render-url>`

#### Vercel (Frontend)
-   `VITE_SERVER_URL`: `https://<your-render-url>`
