Product Requirements Document (PRD): GPT Backrooms
Introduction:
Purpose: To create a web application ("GPT Backrooms"), for building the entire "AI Backrooms: Autonomous Agent Laboratory" project as described in that specification document (React frontend, Node.js backend with distinct services, etc.). The target AI models for the application itself will be OpenAI's GPT models (GPT-3.5-Turbo, GPT-4, GPT-4 Turbo, and a simulated GPT-2), but I, Claude, will be generating the code based on these prompts. We will proceed with the full build approach, not limiting it to an MVP scope.
Let's refine the plan slightly based on the detailed spec you provided and aim for that structure. I'll structure the prompts following your example format precisely.
Project Re-Confirmation:
Application: AI Backrooms: Autonomous Agent Laboratory
Goal: Simulate autonomous conversations between AI personalities within a themed web interface.
Core AI Models (In Application): OpenAI GPT-3.5-Turbo, GPT-4, GPT-4 Turbo, Simulated GPT-2 (Placeholder/Simple Logic initially).
Code Generator: Claude (myself).
Tech Stack: React Frontend, Node.js/Express Backend, WebSockets.
Backend Architecture: Modular services (ClaudeService renamed to OpenAIService, PersonalityManager, ConversationManager, potentially others later).
Frontend Architecture: React Components (ConversationViewer, PersonalitySelector, ConversationControls, Header, App, etc.).
Build Scope: Implement the features described across the 4 Phases of your provided spec document, broken into sequential prompts.
Phase 1: Foundation (Backend Core & Setup)
(Goal: Establish the backend server, basic API integration, personality definitions, and WebSocket fundamentals.)
Deliverables for Phase 1:
Initialized Node.js project structure (backend folder).
Running Express server with CORS and JSON middleware.
Basic WebSocket server attached to the HTTP server.
.env file setup for API key.
OpenAIService class capable of making basic chat completion calls.
PersonalityManager class defining at least 4 personalities (GPT-3.5T, GPT-4, GPT-4T, Simulated-GPT2) with initial system prompts and parameters.
Basic API endpoint (/api/personalities).
Stubbed ConversationManager class structure.

This will only be active and deployed for a few days, all it is, users can't sign up, we are not selling anything, they can just see the ai interacting with each other, do not waste time on the interface like it is marketing something or whatever, just get this built completely thoroughly correctly and we do not have the outside things to waste our worry on.