# Demographic - Social Map Application

A full-stack MERN application connecting users based on location and interests.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/) (running locally or a cloud instance like Atlas)

## Project Structure

- **root**: Contains the Backend (Node.js/Express) code and configuration.
- **client/**: Contains the Frontend (React/Vite) code.

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

Create a `.env` file in the root directory. You can use the example below:

```env
# Database
MONGO_URI=mongodb://127.0.0.1:27017/mapData

# Authentication (Google OAuth)
# Get these from https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Session Security
COOKIE_KEY=a_random_secret_string

# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Server Port
PORT=3000
```

> **Note:** Without `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, Google Authentication will be disabled.

## Running Locally

To run both the backend and frontend concurrently:

```bash
npm run dev
```

- **Backend:** http://localhost:3000
- **Frontend:** http://localhost:5173

## Deployment

### Backend (Render)

This repository is configured for deployment on [Render](https://render.com/).

1.  Create a new **Web Service** on Render.
2.  Connect your GitHub repository.
3.  Render will automatically detect the `render.yaml` configuration.
4.  **Important:** You must manually set the Environment Variables in the Render Dashboard under "Environment":
    - `MONGO_URI`: Your production MongoDB connection string.
    - `GOOGLE_CLIENT_ID`: Production Google Client ID.
    - `GOOGLE_CLIENT_SECRET`: Production Google Client Secret.
    - `CLIENT_URL`: The URL of your deployed Frontend (e.g., `https://your-app.vercel.app`).
    - `COOKIE_KEY`: (Optional) Render can generate this, or you can set a custom one.

### Frontend (Vercel)

1.  Import the project into [Vercel](https://vercel.com/).
2.  Vercel should automatically detect the `client` directory or root config.
3.  **Build Settings:**
    - **Root Directory:** `.` (Root)
    - **Build Command:** `npm run build` (This runs the script in root `package.json` which builds the client).
    - **Output Directory:** `dist`
4.  **Environment Variables:**
    - `VITE_API_URL`: The URL of your deployed Backend (e.g., `https://social-map-backend.onrender.com`).
