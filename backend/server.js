const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const dotenv = require('dotenv');
const { v4: uuidv4 } = require('uuid');
const { PersonalityManager } = require('./services/personalityManager');
const { OpenAIService } = require('./services/openaiService');
const { ConversationManager } = require('./services/conversationManager');
const { EmotionAnalyzer } = require('./services/emotionAnalyzer');
const { AnalyticsService } = require('./services/analyticsService');
const { SydneyDetector } = require('./services/sydneyDetector');

// Load environment variables
dotenv.config();

// Global API call limits - configurable via environment variable
const GLOBAL_API_LIMIT = parseInt(process.env.DAILY_API_LIMIT || '25', 10);
// Validate it's a positive number, default to 25 if invalid
global.GLOBAL_API_LIMIT = GLOBAL_API_LIMIT > 0 ? GLOBAL_API_LIMIT : 25;
global.globalApiCallCount = 0;

// Track the last reset date for daily limit reset
let lastResetDate = new Date().toISOString().split('T')[0]; // Format: "2025-04-22"

/**
 * Checks if API limit is reached and increments the counter if not
 * Handles date change to reset the counter at midnight
 * @returns {boolean} True if under limit and incremented, false if limit reached
 */
const checkAndIncrementApiCount = () => {
  // Check if day has changed - reset counter if it has
  const currentDate = new Date().toISOString().split('T')[0];
  if (currentDate !== lastResetDate) {
    console.log(`Midnight reset: API count from ${global.globalApiCallCount} to 0. Old: ${lastResetDate}, New: ${currentDate}`);
    global.globalApiCallCount = 0;
    lastResetDate = currentDate;
  }
  
  // Check if under limit
  if (global.globalApiCallCount < global.GLOBAL_API_LIMIT) {
    global.globalApiCallCount++;
    console.log(`Global API Call Count: ${global.globalApiCallCount}/${global.GLOBAL_API_LIMIT}`);
    return true; // OK to proceed
  } else {
    console.warn(`Global API Limit Reached (${global.GLOBAL_API_LIMIT}). Call blocked.`);
    return false; // Limit reached
  }
};

// Initialize Express app
const app = express();

// Configure CORS for deployment
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [/\.onrender\.com$/, process.env.FRONTEND_URL].filter(Boolean)
    : 'http://localhost:3000',
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Initialize services
const personalityManager = new PersonalityManager();
const openAIService = new OpenAIService(process.env.OPENAI_API_KEY);
const conversationManager = new ConversationManager(openAIService, personalityManager, checkAndIncrementApiCount);

// Initialize placeholder services (not integrated yet)
const emotionAnalyzer = new EmotionAnalyzer(process.env.OPENAI_API_KEY);
const analyticsService = new AnalyticsService(process.env.OPENAI_API_KEY);
const sydneyDetector = new SydneyDetector(process.env.OPENAI_API_KEY);

// Utility function to broadcast to all clients
const broadcast = (message) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN = 1
      client.send(JSON.stringify(message));
    }
  });
};

// Set up conversation manager event listeners
conversationManager.on('newMessage', ({ conversationId, message }) => {
  broadcast({
    type: 'NEW_MESSAGE',
    conversationId,
    message,
    timestamp: new Date().toISOString()
  });
});

conversationManager.on('conversationError', ({ conversationId, error }) => {
  broadcast({
    type: 'CONVERSATION_ERROR',
    conversationId,
    error,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.get('/api/personalities', (req, res) => {
  try {
    const personalities = personalityManager.getAllPersonalities();
    res.json(personalities);
  } catch (error) {
    console.error('Error fetching personalities:', error);
    res.status(500).json({ error: 'Failed to fetch personalities' });
  }
});

app.get('/api/conversations', (req, res) => {
  try {
    const conversations = conversationManager.getActiveConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  try {
    const uptime = process.uptime();
    const websocketConnections = wss.clients.size;
    const activeConversations = Object.values(conversationManager.conversations)
      .filter(c => c.active).length;
    
    res.json({
      status: 'OK',
      uptime: `${Math.floor(uptime / 60)} minutes, ${Math.round(uptime % 60)} seconds`,
      websocketConnections,
      activeConversations,
      globalApiCallCount: global.globalApiCallCount,
      globalApiLimit: global.GLOBAL_API_LIMIT
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'ERROR', error: error.message });
  }
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  console.log(`Client connected: ${clientId}`);
  
  // Send initial state to client
  ws.send(JSON.stringify({
    type: 'INIT',
    clientId,
    personalities: personalityManager.getAllPersonalities(),
    conversations: conversationManager.getActiveConversations(),
    timestamp: new Date().toISOString()
  }));
  
  ws.on('message', (message) => {
    try {
      const parsedMessage = JSON.parse(message);
      console.log(`Received message from ${clientId}:`, parsedMessage.type);
      
      // Handle different message types
      switch (parsedMessage.type) {
        case 'START_CONVERSATION':
          try {
            const { personalities, initialPrompt } = parsedMessage.data;
            const conversationSummary = conversationManager.startConversation(personalities, initialPrompt);
            
            // Broadcast conversation started event to all clients
            broadcast({
              type: 'CONVERSATION_STARTED',
              conversation: conversationSummary,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error starting conversation:', error);
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: error.message,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        case 'STOP_CONVERSATION':
          try {
            const { conversationId } = parsedMessage.data;
            const result = conversationManager.stopConversation(conversationId);
            
            // Broadcast conversation stopped event
            broadcast({
              type: 'CONVERSATION_STOPPED',
              conversationId,
              status: result.status,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error stopping conversation:', error);
            ws.send(JSON.stringify({
              type: 'ERROR',
              error: error.message,
              timestamp: new Date().toISOString()
            }));
          }
          break;
          
        default:
          console.log(`Unknown message type: ${parsedMessage.type}`);
          ws.send(JSON.stringify({
            type: 'ERROR',
            error: `Unknown message type: ${parsedMessage.type}`,
            timestamp: new Date().toISOString()
          }));
      }
    } catch (error) {
      console.error(`Error processing message from ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });
  
  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
  });
});

// Define port
const PORT = process.env.PORT || 3001;

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});