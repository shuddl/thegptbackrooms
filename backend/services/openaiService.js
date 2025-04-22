const { OpenAI } = require('openai');

class OpenAIService {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error("OpenAI API key is missing. Please set OPENAI_API_KEY environment variable.");
        }
        this.client = new OpenAI({ apiKey });
        console.log("OpenAI Service Initialized.");
    }

    /**
     * Generates a response from an OpenAI chat model.
     * @param {Array<object>} messages - The conversation history formatted for OpenAI API (e.g., [{role: 'system', content: '...'}, {role: 'user', content: '...'}])
     * @param {object} personality - The configuration object for the specific personality being used. Must include 'model', 'temperature', 'maxTokens', and optionally 'frequencyPenalty', 'presencePenalty'.
     * @returns {Promise<object>} - Object containing content, finishReason, and usage data.
     * @throws {Error} - Throws detailed error on API failure.
     */
    async generateResponse(messages, personality) {
        const {
            model,
            temperature,
            maxTokens,
            frequencyPenalty, // Optional, defaults used if undefined
            presencePenalty // Optional, defaults used if undefined
        } = personality; // Destructure required and optional params

        if (!model || typeof temperature === 'undefined' || !maxTokens) {
            throw new Error("Personality config missing required parameters (model, temperature, maxTokens) for OpenAI call.");
        }

        console.log(`OpenAI Request: Model=${model}, Temp=${temperature}, MaxTokens=${maxTokens}`);
        // console.log("Messages Sent:", JSON.stringify(messages, null, 2)); // Uncomment for deep debugging

        try {
            const completion = await this.client.chat.completions.create({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: maxTokens,
                // Include penalties only if they are defined in the personality object
                ...(typeof frequencyPenalty !== 'undefined' && { frequency_penalty: frequencyPenalty }),
                ...(typeof presencePenalty !== 'undefined' && { presence_penalty: presencePenalty }),
                // stream: false // Default is false, explicitly state if needed
            });

            // console.log("OpenAI Raw Response:", completion); // Uncomment for deep debugging

            if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
                 throw new Error("Invalid response structure from OpenAI API: Missing choices or message.");
            }
            if (completion.choices[0].message.content === null || completion.choices[0].message.content === undefined ) {
                 console.warn(`OpenAI response content is null/undefined. Finish Reason: ${completion.choices[0].finish_reason}`);
                 // Handle potential null content (e.g., content filter) - return empty or specific marker
                 return {
                   content: `[Response blocked or empty: ${completion.choices[0].finish_reason}]`,
                   finishReason: completion.choices[0].finish_reason,
                   usage: completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
                 };
             }

            return {
                content: completion.choices[0].message.content.trim(), // Trim whitespace
                finishReason: completion.choices[0].finish_reason,
                usage: completion.usage // Includes prompt_tokens, completion_tokens, total_tokens
            };

        } catch (error) {
            console.error('OpenAI API Error:', error);
            // Enhance error reporting
            let errorMessage = `OpenAI API Error: ${error.message}`;
            if (error.response) { // Axios-like error structure from older versions or http errors
               errorMessage = `OpenAI API Error: Status ${error.response.status} - ${JSON.stringify(error.response.data)}`;
            } else if (error.status) { // Structure from the official openai>=4 library
               errorMessage = `OpenAI API Error: Status ${error.status} - ${error.name} - ${error.message}`;
                // You might want to inspect error.error or error.headers for more details
            } else if (error.code) {
               errorMessage = `OpenAI API Error Code: ${error.code} - ${error.message}`;
            }

            console.error("Detailed OpenAI Error:", JSON.stringify(error, null, 2)); // Log the full error object

            // Handle specific common errors
            if (error.status === 429) {
                throw new Error('OpenAI API rate limit exceeded or quota reached. Please check your account.');
            }
            if (error.status === 401) {
                throw new Error('OpenAI API Error: Authentication failed. Check your API key.');
            }
             if (error.status === 400 && error.message.includes('context_length_exceeded')) {
                throw new Error('OpenAI API Error: Conversation history too long (context length exceeded).');
            }

            // Rethrow a formatted error
            throw new Error(errorMessage);
        }
    }
}

module.exports = { OpenAIService };