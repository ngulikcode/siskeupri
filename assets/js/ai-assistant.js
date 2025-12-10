/**
 * AI Financial Assistant Module
 * Handles chat interface, context gathering, and AI service integration
 */

const aiAssistant = (() => {
    // DOM Elements
    let chatWindow, toggleBtn, closeBtn, 
        messagesContainer, inputArea, inputField, sendBtn;

    // State
    const config = {
        provider: 'gemini',
        // Key is now loaded from window.GEMINI_API_KEY (defined in config.js)
    };

    let isTyping = false;

    // Initialize module
    function init() {
        // Get DOM elements
        chatWindow = document.getElementById('ai-chat-window');
        toggleBtn = document.getElementById('ai-chat-toggle');
        closeBtn = document.getElementById('ai-close-btn');
        messagesContainer = document.getElementById('chat-messages');
        inputField = document.getElementById('chat-input');
        sendBtn = document.getElementById('send-message-btn');

        // Event Listeners
        toggleBtn.addEventListener('click', toggleChat);
        closeBtn.addEventListener('click', () => toggleChat(false));

        sendBtn.addEventListener('click', handleSendMessage);
        inputField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        inputField.addEventListener('input', () => {
            sendBtn.disabled = inputField.value.trim() === '';
            // Auto resize textarea
            inputField.style.height = 'auto';
            inputField.style.height = (inputField.scrollHeight) + 'px';
        });

        console.log('AI Assistant Initialized (Global Key Mode)');
    }

    // Toggle Chat Window
    function toggleChat(forceState = null) {
        const isHidden = chatWindow.classList.contains('hidden');
        const newState = forceState !== null ? forceState : isHidden;

        const tooltip = document.querySelector('.ai-tooltip');
        
        if (newState) {
            chatWindow.classList.remove('hidden');
            toggleBtn.style.display = 'none'; // Hide button when open
            if (tooltip) tooltip.style.display = 'none'; // Hide tooltip
            scrollToBottom();
            // Focus input if opening
            setTimeout(() => inputField.focus(), 300);
        } else {
            chatWindow.classList.add('hidden');
            toggleBtn.style.display = 'flex'; // Show button when closed
            if (tooltip) tooltip.style.display = 'block'; // Show tooltip
            toggleBtn.innerHTML = '<i class="fa-solid fa-robot"></i>';
        }
    }

    // Context Gathering - FIXED VERSION
    function getFinancialContext() {
        const transactions = window.allTransactions || [];
        const accounts = window.accountModule && typeof window.accountModule.getAccounts === 'function' 
            ? window.accountModule.getAccounts() 
            : [];
        
        // Fixed: Safely get budgets
        let budgets = [];
        try {
            if (window.budgetModule) {
                // Check if getBudgets exists and is a function
                if (typeof window.budgetModule.getBudgets === 'function') {
                    budgets = window.budgetModule.getBudgets();
                } 
                // Fallback: try to access budgets array directly
                else if (Array.isArray(window.budgetModule.budgets)) {
                    budgets = window.budgetModule.budgets;
                }
                // Another fallback: try to access from global scope
                else if (typeof window.budgets !== 'undefined' && Array.isArray(window.budgets)) {
                    budgets = window.budgets;
                }
            }
        } catch (e) {
            console.warn('Could not access budgets:', e);
            budgets = [];
        }
        
        // Calculate basic stats
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const balance = income - expense;
        
        // Top categories
        const expensesByCategory = {};
        transactions.filter(t => t.type === 'expense').forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });
        
        const topCategories = Object.entries(expensesByCategory)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat, amount]) => `${cat}: Rp ${amount.toLocaleString()}`)
            .join(', ');

        // Recent transactions (last 5)
        const recentTransactions = transactions
            .slice(-5)
            .map(t => `${t.date}: ${t.type} - ${t.category} - Rp ${t.amount.toLocaleString()}`)
            .join('\n  ');

        return `
Context:
- Total Balance: Rp ${balance.toLocaleString()}
- Total Income: Rp ${income.toLocaleString()}
- Total Expense: Rp ${expense.toLocaleString()}
- Top Expenses: ${topCategories || 'None'}
- Active Budgets: ${budgets.length}
- Accounts: ${accounts.length}
- Recent Transactions (last 5):
  ${recentTransactions || 'None'}
        `.trim();
    }

    // Message Handling
    async function handleSendMessage() {
        const text = inputField.value.trim();
        if (!text) return;

        // Clear input
        inputField.value = '';
        inputField.style.height = 'auto'; // Reset height
        sendBtn.disabled = true;

        // Add User Message
        addMessage('user', text);

        // Show Typing Indicator
        showTypingIndicator();

        try {
            let responseText;
            const context = getFinancialContext();
            const apiKey = window.GEMINI_API_KEY;

            if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
                // Call Real AI API using Global Key
                responseText = await callAIProvider(text, context, apiKey);
            } else {
                // Fallback / Demo Mode if key is not configured
                await new Promise(r => setTimeout(r, 1000));
                responseText = getFallbackResponse(text, context);
            }

            removeTypingIndicator();
            addMessage('ai', responseText);
        } catch (error) {
            console.error('AI Error:', error);
            removeTypingIndicator();
            const errorMessage = error.message === 'Failed to fetch' 
                ? 'Koneksi internet bermasalah. Periksa koneksi Anda.' 
                : `Error AI: ${error.message}. Pastikan API Key valid.`;
            addMessage('ai', errorMessage);
        }
    }

    function addMessage(type, text) {
        const div = document.createElement('div');
        div.className = type === 'user' ? 'user-message' : 'ai-message';
        // Basic Markdown Support
        let formattedText = text
            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // Lists
            .replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
            // Line breaks
            .replace(/\n/g, '<br>');

        div.innerHTML = formattedText;
        messagesContainer.appendChild(div);
        scrollToBottom();
    }

    function showTypingIndicator() {
        if (document.querySelector('.typing-indicator')) return;
        
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        messagesContainer.appendChild(indicator);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.querySelector('.typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // AI Logic
    async function callAIProvider(query, context, apiKey) {
        // Construct Prompt
        const systemPrompt = `You are a helpful Financial Assistant for a personal finance app called SisKePri.
User's Financial Summary:
${context}

Instructions:
- Provide concise, actionable advice based on the user's data.
- Use Indonesian Rupiah (Rp) for currency formatting.
- If the user asks about budgeting, refer to the 50/30/20 rule (50% Need, 30% Want, 20% Savings) as a guideline, but adapt it to their specific numbers.
- Be friendly, professional, and encouraging.
- Answer in Indonesian (Bahasa Indonesia).
- Do not make up numbers not in the context.
- Keep responses concise (max 3-4 paragraphs).
`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{
                parts: [{
                    text: `${systemPrompt}\n\nUser Query: ${query}`
                }]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            throw new Error(data.error.message);
        }
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
             return data.candidates[0].content.parts[0].text;
        } else {
             throw new Error("Invalid response format from AI");
        }
    }

    function getFallbackResponse(query, context) {
        // Demo mode response when API Key is missing
        return `**Mode Demo (API Key belum dikonfigurasi)**: 
        
Untuk mengaktifkan fitur chat cerdas ini, Admin perlu menambahkan **GEMINI_API_KEY** di file \`assets/js/config.js\`.

Saat ini saya hanya bisa melihat data Anda:
${context}

Tapi saya belum bisa memberikan saran cerdas karena belum terhubung ke otak AI saya. 😊`;
    }

    return {
        init,
        toggleChat
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for other scripts to load
    setTimeout(() => {
        aiAssistant.init();
    }, 1500);
});