# Smart Availability Generator

A Google Calendar-integrated web application that generates copy-paste-ready availability text for email outreach.

## Features

- 🗓️ Google Calendar integration
- ⚡ Fast availability scanning
- 📋 Copy-paste-ready text output
- 🌍 Timezone conversion support
- ⚙️ Customizable working hours and buffers
- 📱 Responsive design

## Setup

### Prerequisites

- Node.js 18+ and npm
- Google Cloud Console project with Calendar API enabled

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API
4. Configure OAuth consent screen
5. Create OAuth 2.0 credentials (Web application)
6. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - Your production domain (for deployment)
7. Copy your Client ID

### Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Add your Google Client ID to `.env`:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   ```

### Development

Run the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

Build for production:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Deployment

This app is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your `VITE_GOOGLE_CLIENT_ID` environment variable in Vercel dashboard
4. Deploy!

## Tech Stack

- **Framework:** React 18
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **Routing:** React Router
- **Calendar API:** Google Calendar API v3
- **OAuth:** @react-oauth/google
- **Date Handling:** date-fns
- **Storage:** LocalStorage

## Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth, Settings)
├── pages/            # Page components
├── services/         # API services (Google Calendar)
├── utils/            # Utility functions
└── App.jsx           # Main app component
```

## License

MIT
