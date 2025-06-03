# ChitChat

ChitChat is a full-stack real-time chat application built with React, Express, MongoDB, and Socket.IO. It features user authentication, profile management, image uploads, and live messaging.

## Features

- User signup, login, and logout
- Real-time messaging with Socket.IO
- Profile picture upload (Cloudinary)
- Theme selection (DaisyUI themes)
- Responsive UI with Tailwind CSS and DaisyUI
- Online user status
- Sidebar with contacts
- Message attachments (images)

## Tech Stack

- **Frontend:** React, Vite, Zustand, Socket.IO Client, DaisyUI, Tailwind CSS
- **Backend:** Express, MongoDB, Mongoose, Socket.IO, Cloudinary, JWT, bcryptjs

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB database (Atlas or local)
- Cloudinary account (for image uploads)

### Environment Variables

Create a `.env` file in the `backend/` directory with the following:

```
MONGODB_URI=your_mongodb_uri
PORT=5001
JWT_SECRET=your_jwt_secret
NODE_ENV=development
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Installation

#### Backend

```sh
cd backend
npm install
npm run dev
```

#### Frontend

```sh
cd frontend
npm install
npm run dev
```

The frontend will run on [http://localhost:5173](http://localhost:5173) and the backend on [http://localhost:5001](http://localhost:5001).

## Project Structure

```
backend/
  src/
    controllers/
    lib/
    middleware/
    models/
    routes/
    index.js
frontend/
  src/
    components/
    constants/
    lib/
    pages/
    store/
    App.jsx
    main.jsx
```

## License

MIT

---

**Note:** For production, set `NODE_ENV=production` and ensure your environment variables are set securely.