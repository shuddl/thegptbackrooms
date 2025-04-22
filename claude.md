# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: AI Backrooms - Autonomous Agent Laboratory

### Commands
- Setup: `npm install` in both root and frontend directories
- Backend: `npm run dev` from root directory
- Frontend: `cd frontend && npm run dev` 
- Lint: `npm run lint`
- Test: `npm test` or `npm test -- -t "test name"` for single test

### Code Standards
- Use TypeScript with strict type checking
- Follow ESLint rules without exceptions
- Organize imports alphabetically with React imports first
- Use functional components with React hooks
- Follow RESTful API design patterns
- Use async/await for asynchronous operations
- Handle all errors with proper try/catch blocks
- Use camelCase for variables/functions, PascalCase for components/classes
- Document all functions, classes and complex logic with JSDoc

### Architecture
Backend uses modular services (OpenAIService, PersonalityManager, ConversationManager).
Frontend uses React Components with WebSocket connections to backend.

### Project Requirements
- Goal: Simulate autonomous conversations between AI personalities (GPT models)
- Tech Stack: React, Node.js/Express, WebSockets
- Focus on functionality over UI polish