import React, { useEffect, useRef } from 'react';
import { Card } from 'react-bootstrap';
import './ConversationViewer.css';

const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const ConversationViewer = ({ conversation }) => {
  const containerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    } else if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [conversation?.messages]);

  if (!conversation) {
    return (
      <div className="conversation-viewer d-flex justify-content-center align-items-center">
        <div className="text-center text-muted">
          <h4>No conversation selected</h4>
          <p>Start a new conversation or select an existing one</p>
        </div>
      </div>
    );
  }
  
  // Show a loading state when a conversation exists but has no messages yet
  if (conversation && (!conversation.messages || conversation.messages.length === 0)) {
    return (
      <div className="conversation-viewer d-flex justify-content-center align-items-center">
        <div className="text-center">
          <div className="spinner-border text-light mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Initializing conversation...</p>
        </div>
      </div>
    );
  }

  // Filter out system prompts if they exist in the messages array
  const visibleMessages = conversation.messages?.filter(msg => msg.role !== 'system') || [];

  return (
    <div className="conversation-viewer" ref={containerRef}>
      {visibleMessages.map((message, index) => {
        // Generate a unique key for each message
        const messageKey = `${message.personalityId || 'system'}-${message.timestamp || index}`;
        
        return (
          <div 
            key={messageKey}
            className={`message-entry persona-${message.personalityId || 'system'}`}
          >
            <div className="message-header">
              <span className="message-sender">{message.name || 'System'}</span>
              <span className="message-timestamp">
                {message.timestamp ? formatTimestamp(message.timestamp) : ''}
              </span>
            </div>
            <div className="message-content">
              {message.content}
            </div>
            {message.usage && (
              <div className="message-tokens">
                {message.usage.prompt_tokens || 0}p + {message.usage.completion_tokens || 0}c = {message.usage.total_tokens || 0} tokens
              </div>
            )}
          </div>
        );
      })}
      
      {/* This is the invisible element that we'll scroll to */}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ConversationViewer;