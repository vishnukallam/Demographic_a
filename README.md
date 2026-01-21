# Demographic - Social Map Application (Guest Mode)

A real-time location-based social app connecting users via shared interests without account registration.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)

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

Create a `.env` file in the root directory (optional, defaults provided):

```env
# Client URL (for CORS)
CLIENT_URL=http://localhost:5173

# Server Port
PORT=3000
```

## Running Locally

To run both the backend and frontend concurrently:

```bash
npm run dev
```

- **Backend:** http://localhost:3000
- **Frontend:** http://localhost:5173

## How it Works

1.  **Guest Login:** Users enter their name and select interests in the browser. This data is stored locally.
2.  **Real-time Map:** The app broadcasts your location to the server (in-memory only).
3.  **Discovery:** The server finds other users within 10km who share at least one interest.
4.  **Chat:** Users can initiate direct chats with nearby users via ephemeral socket connections.

## Deployment

### Backend (Render)

1.  Create a **Web Service** on Render.
2.  Set `Build Command` to empty or `npm install`.
3.  Set `Start Command` to `node server/index.js`.
4.  Environment Variables:
    - `CLIENT_URL`: Your production frontend URL.

### Frontend (Vercel)

1.  Import project.
2.  **Build Command:** `npm run build`
3.  **Output Directory:** `dist`
4.  **Environment Variables:**
    - `VITE_API_URL`: Your production backend URL.
