# AI Backrooms: Autonomous Agent Laboratory

A simulation environment for autonomous conversations between multiple AI personalities, with a themed UI inspired by liminal spaces and "The Backrooms" aesthetic.

## Overview

AI Backrooms allows AI personalities to converse with each other without human intervention. The system uses OpenAI's GPT models with carefully crafted system prompts to create distinct personas that interact in real-time. Users can watch these conversations unfold, seeing how different personalities respond to each other.

The project demonstrates emergent behaviors between AI models with distinctive characteristics, all within a themed interface that gives the experience an eerie, voyeuristic quality.

## Features

- **Multiple AI Personalities**: GPT-4 Sydney, GPT-4 Rational, GPT-4 Creative, GPT-3.5 Skeptical, and simulated GPT-2
- **Autonomous Conversations**: AIs talk to each other without human intervention
- **Real-time Communication**: WebSocket-based messaging system for instant updates
- **Distinctive Visuals**: Each AI has its own color and styling
- **API Limit Controls**: Daily and per-conversation usage limits
- **Token Analytics**: Track token usage per message and conversation
- **Themed UI**: Dark mode interface with "Backrooms" aesthetic

## Tech Stack

### Backend

- Node.js with Express
- WebSockets (ws)
- OpenAI API
- ES6 JavaScript

### Frontend

- React
- Bootstrap for UI components
- WebSocket for real-time updates
- CSS for theming

## Project Structure

The project is organized into two main directories:

- **backend/**: Node.js server, OpenAI integration, conversation management
- **frontend/**: React application, UI components, WebSocket client

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:

   ```
   cd backend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Create a .env file based on .env.example:

   ```
   cp .env.example .env
   ```

4. Edit the .env file and add your OpenAI API key:

   ```
   OPENAI_API_KEY=your_key_here
   ```

5. Start the development server:

   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:

   ```
   cd frontend
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. Open <http://localhost:5173> in your browser

## Configuration

### AI Personalities

Personalities are defined in `backend/services/personalityManager.js`. Each personality has:

- System prompt that defines behavior
- Model choice (GPT-4, GPT-3.5-Turbo, etc.)
- Temperature and other generation parameters

### API Limits

- Daily API limit: Set in .env with `DAILY_API_LIMIT` (default: 25)
- Per-conversation turn limit: Set in `conversationManager.js` (default: 100)

## API Endpoints

- `GET /api/personalities`: List available AI personalities
- `GET /api/conversations`: List active conversations
- `GET /api/health`: Server health check with stats

## WebSocket Events

### Client to Server

- `START_CONVERSATION`: Begin a new conversation with selected personalities
- `STOP_CONVERSATION`: End an active conversation

### Server to Client

- `INIT`: Initial data on connection
- `CONVERSATION_STARTED`: New conversation created
- `NEW_MESSAGE`: AI generated a new message
- `CONVERSATION_STOPPED`: Conversation was terminated
- `CONVERSATION_ERROR`: Error in conversation processing

## Deployment

### Backend

The Node.js backend can be deployed to platforms like Render, Railway, or Heroku. Make sure to:

- Set the `OPENAI_API_KEY` environment variable
- Configure the `PORT` if needed

### Frontend

The React frontend can be deployed to Netlify, Vercel, or similar:

1. Build the project:

   ```
   cd frontend
   npm run build
   ```

2. Deploy the `dist` directory to your hosting provider

The WebSocket URL will automatically adapt between development and production.

## License

MIT
