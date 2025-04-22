import React from 'react';
import { Card, Form, Button, Badge } from 'react-bootstrap';
import Select from 'react-select';
import './Sidebar.css';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleDateString([], { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit'
  });
};

const Sidebar = ({ 
  personalities,
  conversations, 
  activeConversationId, 
  isConnected,
  isStartingConversation,
  selectedPersonalityIds,
  initialPrompt,
  onSelectConversation, 
  onStartConversation,
  onStopConversation,
  onPersonalitySelection,
  onPromptChange
}) => {
  
  const handleStartConversation = (e) => {
    e.preventDefault();
    if (selectedPersonalityIds.length < 2) {
      alert('Please select at least 2 personalities');
      return;
    }
    
    onStartConversation();
  };

  const personalityOptions = personalities.map(p => ({
    value: p.id,
    label: p.name
  }));

  return (
    <div className="sidebar">
      <div className="conversation-list">
        <Card>
          <Card.Header>Conversations</Card.Header>
          <div className="list-group list-group-flush">
            {conversations && conversations.length > 0 ? (
              conversations
                .sort((a, b) => new Date(b.startTime) - new Date(a.startTime)) // Sort by newest first
                .map(conversation => (
                <div 
                  key={conversation.id} 
                  className={`conversation-item ${activeConversationId === conversation.id ? 'active' : ''}`} 
                  onClick={() => onSelectConversation(conversation.id)}
                >
                  <div className="conversation-item-header">
                    <div className="conversation-title">
                      Conversation #{conversation.id.substring(0, 6)}
                      {' '}
                      <Badge bg={conversation.active ? 'success' : 'secondary'} pill>
                        {conversation.active ? 'Active' : 'Stopped'}
                      </Badge>
                    </div>
                    <div className="conversation-time">
                      {formatDate(conversation.startTime)}
                    </div>
                  </div>
                  <div className="conversation-participants">
                    {conversation.personalities.map(p => p.name).join(', ')}
                  </div>
                  {conversation.active && (
                    <Button 
                      variant="outline-danger" 
                      size="sm" 
                      className="mt-2"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the parent onClick
                        onStopConversation(conversation.id);
                      }}
                    >
                      <i className="bi bi-stop-circle me-1"></i> Stop
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="list-group-item text-center text-muted">
                No conversations yet
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="controls">
        <Card>
          <Card.Header>New Conversation</Card.Header>
          <Card.Body>
            <Form className="controls-form" onSubmit={handleStartConversation}>
              <Form.Group className="mb-3">
                <Form.Label>Select Personalities (min 2)</Form.Label>
                <Select
                  isMulti
                  name="personalities"
                  options={personalityOptions}
                  className="react-select-container"
                  classNamePrefix="react-select"
                  value={selectedPersonalityIds}
                  onChange={onPersonalitySelection}
                  placeholder="Choose personalities..."
                  isDisabled={!isConnected}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Initial Prompt (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  className="prompt-textarea"
                  value={initialPrompt}
                  onChange={onPromptChange}
                  placeholder="Enter an optional prompt to start the conversation..."
                  disabled={!isConnected}
                />
              </Form.Group>

              <Button 
                variant="primary" 
                type="submit" 
                className="w-100"
                disabled={!isConnected || selectedPersonalityIds.length < 2 || isStartingConversation}
              >
                {isStartingConversation ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Starting...
                  </>
                ) : (
                  'Start Conversation'
                )}
              </Button>
              {!isConnected && (
                <div className="text-danger text-center mt-2 small">
                  Waiting for connection...
                </div>
              )}
            </Form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default Sidebar;