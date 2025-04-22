import React from 'react';
import { Card } from 'react-bootstrap';
import './ConversationStats.css';

const ConversationStats = ({ conversation }) => {
  if (!conversation) {
    return null;
  }

  // Calculate number of non-system messages
  const visibleMessageCount = conversation.messages?.filter(m => m.role !== 'system').length || 0;
  
  // Format token count with commas for readability
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  return (
    <Card className="conversation-stats">
      <Card.Header>Conversation Stats</Card.Header>
      <Card.Body className="stats-body">
        <div className="stat-item">
          <div className="stat-value">{formatNumber(conversation.apiCallCount)}</div>
          <div className="stat-label">API Calls</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatNumber(conversation.totalTokens)}</div>
          <div className="stat-label">Total Tokens</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{formatNumber(visibleMessageCount)}</div>
          <div className="stat-label">Messages</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">{conversation.personalities?.length || 0}</div>
          <div className="stat-label">Personalities</div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ConversationStats;