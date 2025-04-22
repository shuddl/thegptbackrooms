const { EventEmitter } = require('events');
const { v4: uuidv4 } = require('uuid');

/**
 * ConversationManager class for managing conversations between AI personalities.
 * Handles conversation lifecycle, state management, and the autonomous conversation loop.
 */
class ConversationManager extends EventEmitter {
    /**
     * Initialize the ConversationManager
     * @param {object} openAIService - Instance of OpenAIService
     * @param {object} personalityManager - Instance of PersonalityManager
     * @param {function} checkAndIncrementApiCount - Function to check API limits and increment counter
     */
    constructor(openAIService, personalityManager, checkAndIncrementApiCount) {
        super();
        this.openAIService = openAIService;
        this.personalityManager = personalityManager;
        this.checkAndIncrementApiCount = checkAndIncrementApiCount || (() => true); // Default to always allow if not provided
        this.conversations = {};
        this.conversationTimeouts = {};
        console.log("ConversationManager initialized");
    }

    /**
     * Get a summary of all active conversations
     * @returns {Array<object>} - Array of conversation summary objects
     */
    getActiveConversations() {
        return Object.values(this.conversations)
            .filter(conversation => conversation.active)
            .map(conversation => {
                // Get a limited number of recent messages
                const recentMessages = conversation.messages
                    .filter(msg => msg.role !== 'system') // Exclude system prompts
                    .slice(-10); // Get only the last 10 messages
                
                // Create personality summaries
                const personalitySummaries = conversation.personalities.map(personality => ({
                    id: personality.id,
                    name: personality.name
                }));
                
                return {
                    id: conversation.id,
                    startTime: conversation.startTime,
                    active: conversation.active,
                    personalities: personalitySummaries,
                    recentMessages: recentMessages,
                    nextSpeakerIndex: conversation.nextSpeakerIndex,
                    apiCallCount: conversation.apiCallCount
                };
            });
    }

    /**
     * Start a new conversation with specified personalities
     * @param {Array<string>} personalityIds - Array of personality IDs to include
     * @param {string} initialPrompt - Optional initial prompt to start the conversation
     * @returns {object} - Conversation summary object
     */
    startConversation(personalityIds, initialPrompt) {
        // Generate a unique ID for the conversation
        const id = uuidv4();
        
        // Validate we have at least 2 personalities for a conversation
        if (!Array.isArray(personalityIds) || personalityIds.length < 2) {
            throw new Error('At least 2 personalities are required for a conversation');
        }
        
        console.log(`Starting new conversation ${id} with personalities: ${personalityIds.join(', ')}`);
        
        // Retrieve full personality configurations
        const personalityConfigs = personalityIds.map(id => {
            try {
                return this.personalityManager.getPersonality(id);
            } catch (error) {
                throw new Error(`Failed to start conversation: ${error.message}`);
            }
        });
        
        // Initialize conversation state
        const conversation = {
            id,
            personalities: personalityConfigs,
            messages: [],
            startTime: new Date(),
            active: true,
            nextSpeakerIndex: 0,
            apiCallCount: 0,
            turnLimit: 100, // Default turn limit
            totalTokens: 0 // Track total tokens used
        };
        
        // Add system prompts for each personality
        personalityConfigs.forEach(personality => {
            conversation.messages.push({
                role: 'system',
                content: personality.systemPrompt,
                personalityId: personality.id,
                name: personality.name,
                timestamp: new Date()
            });
        });
        
        // Add initial prompt or default starter message
        if (initialPrompt && typeof initialPrompt === 'string' && initialPrompt.trim()) {
            conversation.messages.push({
                role: 'user',
                content: initialPrompt.trim(),
                timestamp: new Date(),
                name: 'Initiator'
            });
        } else {
            conversation.messages.push({
                role: 'user',
                content: 'Begin the conversation.',
                timestamp: new Date(),
                name: 'System'
            });
        }
        
        // Store the conversation
        this.conversations[id] = conversation;
        
        // Start the conversation loop (non-awaited, runs in background)
        this._runConversationLoop(id);
        
        // Return a summary for broadcasting
        return this._createConversationSummary(conversation);
    }

    /**
     * Stop an active conversation
     * @param {string} conversationId - ID of the conversation to stop
     * @returns {object} - Status object
     */
    stopConversation(conversationId) {
        const conversation = this.conversations[conversationId];
        
        if (!conversation) {
            return { id: conversationId, status: 'not_found' };
        }
        
        // Set conversation as inactive
        conversation.active = false;
        
        // Clear any scheduled next turn
        if (this.conversationTimeouts[conversationId]) {
            clearTimeout(this.conversationTimeouts[conversationId]);
            delete this.conversationTimeouts[conversationId];
        }
        
        console.log(`Conversation ${conversationId} stopped`);
        
        return { id: conversationId, status: 'stopped' };
    }
    
    /**
     * Create a summary object for a conversation
     * @private
     * @param {object} conversation - The conversation object
     * @returns {object} - Summary object for the conversation
     */
    _createConversationSummary(conversation) {
        // Create personality summaries
        const personalitySummaries = conversation.personalities.map(personality => ({
            id: personality.id,
            name: personality.name
        }));
        
        // Get non-system messages
        const visibleMessages = conversation.messages.filter(msg => msg.role !== 'system');
        
        return {
            id: conversation.id,
            startTime: conversation.startTime,
            active: conversation.active,
            personalities: personalitySummaries,
            messages: visibleMessages,
            apiCallCount: conversation.apiCallCount,
            totalTokens: conversation.totalTokens
        };
    }
    
    /**
     * Format messages for OpenAI API
     * @private
     * @param {Array<object>} messages - The conversation messages
     * @returns {Array<object>} - Formatted messages for OpenAI API
     */
    _formatMessagesForOpenAI(messages) {
        // Filter out system messages - these are stored internally but not passed to every API call
        return messages
            .filter(msg => msg.role !== 'system')
            .map(msg => ({
                role: msg.role,
                content: msg.content,
                // Include name if defined and if message role supports it (user, assistant)
                ...(msg.name && (msg.role === 'user' || msg.role === 'assistant') && { name: msg.name })
            }));
    }

    /**
     * Run the conversation loop - handles turn-taking, API calls, and scheduling
     * @private
     * @param {string} conversationId - The ID of the conversation
     */
    async _runConversationLoop(conversationId) {
        // Get the conversation state
        const conversation = this.conversations[conversationId];
        
        // Check if conversation exists and is active
        if (!conversation || !conversation.active) {
            console.log(`Conversation ${conversationId} is not active or doesn't exist. Stopping loop.`);
            return;
        }
        
        // Check if turn limit reached
        if (conversation.apiCallCount >= conversation.turnLimit) {
            console.log(`Turn limit (${conversation.turnLimit}) reached for conversation ${conversationId}`);
            this.stopConversation(conversationId);
            this.emit('conversationError', {
                conversationId,
                error: 'Turn limit reached'
            });
            return;
        }
        
        // Check global API limit using injected function
        if (!this.checkAndIncrementApiCount()) {
            console.log(`Global API limit reached. Stalling conversation ${conversationId}`);
            this.emit('conversationError', {
                conversationId,
                error: 'Global API limit reached. Conversation stalled until limit resets.'
            });
            return;
        }
        
        // Get current speaker
        const currentSpeakerIndex = conversation.nextSpeakerIndex;
        const currentPersonality = conversation.personalities[currentSpeakerIndex];
        
        console.log(`Conversation ${conversationId}: ${currentPersonality.name}'s turn (${currentSpeakerIndex + 1}/${conversation.personalities.length})`);
        
        try {
            // Format message history for API call
            const formattedHistory = this._formatMessagesForOpenAI(conversation.messages);
            
            // Add the current personality's system prompt at the beginning
            const messagesWithSystemPrompt = [
                { 
                    role: 'system', 
                    content: currentPersonality.systemPrompt 
                },
                ...formattedHistory
            ];
            
            // Call OpenAI API
            const response = await this.openAIService.generateResponse(
                messagesWithSystemPrompt,
                currentPersonality
            );
            
            // Update conversation API call counter
            conversation.apiCallCount++;
            
            // Update token tracking
            if (response.usage && typeof response.usage.total_tokens === 'number') {
                conversation.totalTokens += response.usage.total_tokens;
            }
            
            // Create new message from response
            const newMessage = {
                role: 'assistant',
                content: response.content,
                timestamp: new Date(),
                personalityId: currentPersonality.id,
                name: currentPersonality.name,
                usage: response.usage
            };
            
            // Add to conversation history
            conversation.messages.push(newMessage);
            
            // Broadcast new message event
            this.emit('newMessage', {
                conversationId,
                message: newMessage
            });
            
            // Schedule next turn
            conversation.nextSpeakerIndex = (currentSpeakerIndex + 1) % conversation.personalities.length;
            
            // Random delay between 2-5 seconds
            const delay = 2000 + Math.floor(Math.random() * 3000);
            
            // Clear any existing timeout
            if (this.conversationTimeouts[conversationId]) {
                clearTimeout(this.conversationTimeouts[conversationId]);
            }
            
            // Schedule next turn
            this.conversationTimeouts[conversationId] = setTimeout(
                () => this._runConversationLoop(conversationId),
                delay
            );
            
        } catch (error) {
            console.error(`Error in conversation ${conversationId}:`, error);
            
            // Emit error event
            this.emit('conversationError', {
                conversationId,
                error: error.message
            });
            
            // Stop the conversation on API error
            this.stopConversation(conversationId);
        }
    }

    /**
     * Get a conversation by ID
     * @param {string} conversationId - ID of the conversation to retrieve
     * @returns {object} - Conversation object
     */
    getConversation(conversationId) {
        const conversation = this.conversations[conversationId];
        if (!conversation) {
            throw new Error(`Conversation ${conversationId} not found`);
        }
        return conversation;
    }

    /**
     * List all conversations (active and inactive)
     * @returns {Array<object>} - Array of conversation summary objects
     */
    listConversations() {
        return Object.values(this.conversations).map(conversation => {
            const { id, personalities, startTime, active, apiCallCount, totalTokens } = conversation;
            
            return {
                id,
                personalities: personalities.map(p => ({ id: p.id, name: p.name })),
                messageCount: conversation.messages.filter(msg => msg.role !== 'system').length,
                startTime,
                active,
                apiCallCount,
                totalTokens
            };
        });
    }
}

module.exports = { ConversationManager };