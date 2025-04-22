import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import ConversationViewer from './components/ConversationViewer';
import ConversationStats from './components/ConversationStats';
import Sidebar from './components/Sidebar';
import useWebSocket from './hooks/useWebSocket';
import './App.css';

function App() {
  const [clientId, setClientId] = useState(null);
  const [personalities, setPersonalities] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [selectedPersonalityIds, setSelectedPersonalityIds] = useState([]);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [isStartingConversation, setIsStartingConversation] = useState(false);
  const [error, setError] = useState(null);
  
  // Use the WebSocket hook
  const { isConnected, lastMessage, sendMessage } = useWebSocket();
  
  // Get the active conversation object
  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Handle WebSocket messages with the lastMessage from the hook
  useEffect(() => {
    if (lastMessage) {
      handleWebSocketMessage(lastMessage);
    }
  }, [lastMessage]);
  
  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message) => {
    console.log('WS Message:', message.type);
    
    switch (message.type) {
      case 'INIT':
        setClientId(message.clientId);
        setPersonalities(message.personalities || []);
        
        const initialConversations = message.conversations || [];
        setConversations(initialConversations);
        
        // Set first active conversation if available
        if (initialConversations.length > 0) {
          // Find the first active conversation, or use the most recent one
          const activeConvo = initialConversations.find(c => c.active) || initialConversations[0];
          setActiveConversationId(activeConvo.id);
        }
        break;
        
      case 'CONVERSATION_STARTED':
        setConversations(prevConversations => {
          // Add the new conversation
          const newConversations = [...prevConversations, message.conversation];
          // Set as active conversation
          setActiveConversationId(message.conversation.id);
          return newConversations;
        });
        
        // Clear form data and reset loading state
        setSelectedPersonalityIds([]);
        setInitialPrompt('');
        setIsStartingConversation(false);
        break;
        
      case 'NEW_MESSAGE':
        setConversations(prevConversations => {
          return prevConversations.map(conversation => {
            if (conversation.id === message.conversationId) {
              // Update token counts
              const updatedTotalTokens = conversation.totalTokens + 
                (message.message.usage?.total_tokens || 0);
              
              // Add the new message
              return {
                ...conversation,
                messages: [...conversation.messages, message.message],
                apiCallCount: conversation.apiCallCount + 1,
                totalTokens: updatedTotalTokens
              };
            }
            return conversation;
          });
        });
        break;
        
      case 'CONVERSATION_STOPPED':
        setConversations(prevConversations => {
          // Update the stopped conversation
          const updatedConversations = prevConversations.map(conversation => {
            if (conversation.id === message.conversationId) {
              return { ...conversation, active: false };
            }
            return conversation;
          });
          
          // If the stopped conversation was active, find a new active one
          if (activeConversationId === message.conversationId) {
            const newActiveConvo = updatedConversations.find(c => c.active && c.id !== message.conversationId);
            if (newActiveConvo) {
              setActiveConversationId(newActiveConvo.id);
            }
          }
          
          return updatedConversations;
        });
        break;
        
      case 'CONVERSATION_ERROR':
        console.error('Conversation error:', message.error);
        showError(`Conversation error: ${message.error}`);
        break;
      
      case 'ERROR':
        console.error('Server error:', message.error);
        showError(`Server error: ${message.error}`);
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, [activeConversationId]);
  
  // Handle personality selection change
  const handlePersonalitySelection = (selectedOptions) => {
    setSelectedPersonalityIds(selectedOptions || []);
  };
  
  // Handle prompt input change
  const handlePromptChange = (event) => {
    setInitialPrompt(event.target.value);
  };
  
  // Helper to show error messages
  const showError = (message, duration = 5000) => {
    setError(message);
    setTimeout(() => setError(null), duration);
  };
  
  // Start a new conversation
  const handleStartConversation = () => {
    // Validate selection
    if (selectedPersonalityIds.length < 2) {
      showError('At least 2 personalities required');
      return;
    }
    
    // Set loading state
    setIsStartingConversation(true);
    
    try {
      // Extract personality IDs from selection
      const personalityIds = selectedPersonalityIds.map(option => option.value);
      
      // Send the command
      const success = sendMessage('START_CONVERSATION', {
        personalities: personalityIds,
        initialPrompt: initialPrompt.trim() || null
      });
      
      if (!success) {
        showError('Failed to start conversation: WebSocket not connected');
        setIsStartingConversation(false);
      }
      
      // Form reset happens in the message handler on confirmation
    } catch (error) {
      console.error('Error starting conversation:', error);
      showError(`Error starting conversation: ${error.message}`);
      setIsStartingConversation(false);
    } finally {
      // If the WebSocket message event doesn't come back after 10 seconds, reset loading state
      setTimeout(() => {
        setIsStartingConversation(false);
      }, 10000);
    }
  };
  
  // Stop an active conversation
  const handleStopConversation = (conversationId) => {
    if (!conversationId) {
      showError('No conversation ID provided');
      return;
    }
    
    const success = sendMessage('STOP_CONVERSATION', {
      conversationId
    });
    
    if (!success) {
      showError('Failed to stop conversation: WebSocket not connected');
    }
  };
  
  // Select a conversation
  const handleSelectConversation = (conversationId) => {
    setActiveConversationId(conversationId);
  };

  return (
    <div className="App">
      <header className="header">
        <h1>AI Backrooms: Autonomous Agent Laboratory</h1>
        <p>Status: {isConnected ? 'Connected' : 'Disconnected'} {clientId ? `| Client ID: ${clientId.substring(0, 8)}` : ''}</p>
      </header>
      
      {error && (
        <Alert variant="danger" className="mb-3 mx-3">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}
      
      <main>
        <Container fluid>
          <Row className="content-row">
            <Col md={4} lg={3} className="sidebar-col">
              <Sidebar 
                personalities={personalities} 
                conversations={conversations}
                activeConversationId={activeConversationId}
                isConnected={isConnected}
                isStartingConversation={isStartingConversation}
                selectedPersonalityIds={selectedPersonalityIds}
                initialPrompt={initialPrompt}
                onSelectConversation={handleSelectConversation}
                onStartConversation={handleStartConversation}
                onStopConversation={handleStopConversation}
                onPersonalitySelection={handlePersonalitySelection}
                onPromptChange={handlePromptChange}
              />
            </Col>
            <Col md={8} lg={9} className="conversation-col">
              {activeConversation && (
                <ConversationStats conversation={activeConversation} />
              )}
              <ConversationViewer 
                conversation={activeConversation} 
              />
              {activeConversation && activeConversation.active && (
                <div className="conversation-controls">
                  <Button 
                    variant="outline-danger" 
                    onClick={() => handleStopConversation(activeConversation.id)}
                    disabled={!isConnected}
                  >
                    <i className="bi bi-stop-circle me-2"></i>
                    Stop Conversation
                  </Button>
                </div>
              )}
            </Col>
          </Row>
        </Container>
      </main>
    </div>
  );
}

export default App;