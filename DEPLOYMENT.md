# Deployment Instructions

This project is configured to be deployed as two separate services:
1.  **Frontend**: Deployed to **Vercel**.
2.  **Backend**: Deployed to **Render**.

---

## Part 1: Backend Deployment (Render)

1.  **Push to GitHub**: Ensure this repository is pushed to your GitHub account.
2.  **Create Render Web Service**:
    *   Log in to [Render](https://dashboard.render.com/).
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository.
3.  **Configure Service**:
    *   **Root Directory**: Leave blank (default to repo root).
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install` (Installs dependencies from root `package.json`)
    *   **Start Command**: `npm start` (Runs `node server/index.js`)
4.  **Environment Variables**:
    Add the following environment variables in the Render dashboard:
    *   `MONGO_URI`: Your MongoDB connection string (e.g., from MongoDB Atlas).
    *   `GOOGLE_CLIENT_ID`: Your Google OAuth Client ID.
    *   `GOOGLE_CLIENT_SECRET`: Your Google OAuth Client Secret.
    *   `COOKIE_KEY`: A random string for session encryption.
    *   `CLIENT_URL`: The URL of your future Vercel frontend (e.g., `https://your-app.vercel.app`). *You can add this later after deploying the frontend.*
5.  **Deploy**: Click **Create Web Service**.
6.  **Copy URL**: Once deployed, copy the service URL (e.g., `https://social-map-backend.onrender.com`).

---

## Part 2: Frontend Deployment (Vercel)

1.  **Import to Vercel**:
    *   Log in to [Vercel](https://vercel.com/).
    *   Click **Add New...** -> **Project**.
    *   Import the same GitHub repository.
2.  **Configure Project**:
    *   **Root Directory**: Leave as default (repo root).
    *   **Framework Preset**: Vite (should be auto-detected, or select Other).
    *   **Build Command**: `npm run build` (This runs `cd client && npm install && npm run build` and moves `dist` to root).
    *   **Output Directory**: `dist` (default).
3.  **Environment Variables**:
    Add the following environment variable:
    *   `VITE_API_URL`: The **Render Backend URL** you copied in Part 1 (e.g., `https://social-map-backend.onrender.com`).
4.  **Deploy**: Click **Deploy**.

---

## Part 3: Final Wiring

1.  **Update Render**: Go back to your Render dashboard, edit the Environment Variables, and set `CLIENT_URL` to your new Vercel App URL (e.g., `https://your-project.vercel.app`). Redeploy the backend.
2.  **Update Google Cloud Console**:
    *   Add your Render Backend URL + `/auth/google/callback` to the **Authorized redirect URIs**.
    *   Add your Vercel App URL to **Authorized JavaScript origins**.

## Local Development
To run locally:
1.  Backend: `cd server && npm start` (runs on port 3000)
2.  Frontend: `cd client && npm run dev` (runs on port 5173)
3.  Ensure `client/.env.development` has `VITE_API_URL=http://localhost:3000`.
