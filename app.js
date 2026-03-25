document.addEventListener('DOMContentLoaded', () => {
    // === DOM ELEMENTS ===
    const API_BASE = 'http://localhost:8090/api'; // Changed to 8090 as per application.properties

    // Auth Elements
    const authOverlay = document.getElementById('auth-overlay');
    const authTabs = document.querySelectorAll('.auth-tab');
    const authForms = document.querySelectorAll('.auth-form');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const logoutBtn = document.getElementById('logout-btn');
    const userGreeting = document.getElementById('user-greeting');
    const adminDashboardBtn = document.getElementById('admin-dashboard-btn');
    
    // Main App Elements
    const codeInput = document.getElementById('code-input');
    const stdinInput = document.getElementById('stdin-input');
    const languageSelect = document.getElementById('language-select');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    const actionSpinner = document.getElementById('loading-spinner');
    const analyzeBtnText = document.querySelector('.btn-text');
    
    // Output Elements
    const initialPlaceholder = document.getElementById('initial-placeholder');
    const executionResults = document.getElementById('execution-results');
    const outputBox = document.getElementById('output-box');
    const errorBox = document.getElementById('error-box');
    
    // Metrics Elements
    const metricLines = document.getElementById('metric-lines');
    const metricMethods = document.getElementById('metric-methods');
    const metricComplexity = document.getElementById('metric-complexity');
    const metricVariables = document.getElementById('metric-variables');
    
    // Insights Elements
    const beginnerText = document.getElementById('beginner-text');
    const workflowText = document.getElementById('workflow-text');
    
    // Video Elements
    const videoSuggestionsContainer = document.getElementById('video-suggestions-container');
    
    // History Elements
    const historyContainer = document.getElementById('history-container');
    const refreshHistoryBtn = document.getElementById('refresh-history-btn');
    
    // AI Chat Elements
    const chatHistory = document.getElementById('chat-history');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatSendBtn = document.getElementById('ai-chat-send');
    
    // Admin Elements
    const adminOverlay = document.getElementById('admin-overlay');
    const closeAdminBtn = document.getElementById('close-admin-btn');
    const adminTabsBtn = document.querySelectorAll('#admin-overlay .tab-btn');
    const adminPanes = document.querySelectorAll('#admin-overlay .tab-pane');
    const adminUsersList = document.getElementById('admin-users-list');
    const adminSubsList = document.getElementById('admin-subs-list');

    // Main App Tabs
    const mainTabBtns = document.querySelectorAll('.output-section .tab-btn');
    const mainTabPanes = document.querySelectorAll('.output-section .tab-pane');

    // === STATE ===
    let currentUser = null;
    let currentToken = localStorage.getItem('token');
    let currentRole = localStorage.getItem('role');
    let currentUsername = localStorage.getItem('username');

    // === INITIALIZATION ===
    function init() {
        if (!currentToken) {
            showAuth();
        } else {
            hideAuth();
            setupUserUI();
            fetchHistory(); // Load history if logged in
        }
    }

    // === TAB LOGIC ===
    function setupTabs(buttons, panes) {
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('active'));
                panes.forEach(p => {
                    p.classList.remove('active');
                    p.classList.add('hidden');
                });
                btn.classList.add('active');
                const targetId = btn.getAttribute('data-target');
                const target = document.getElementById(targetId);
                target.classList.add('active');
                target.classList.remove('hidden');
            });
        });
    }

    setupTabs(authTabs, authForms);
    setupTabs(mainTabBtns, mainTabPanes);
    setupTabs(adminTabsBtn, adminPanes);

    // === AUTHENTICATION LOGIC ===
    function showAuth() {
        authOverlay.classList.remove('hidden');
    }

    function hideAuth() {
        authOverlay.classList.add('hidden');
    }

    function setupUserUI() {
        userGreeting.textContent = `Hello, ${currentUsername}`;
        if (currentRole === 'ROLE_ADMIN' || currentRole === 'ADMIN') {
            adminDashboardBtn.classList.remove('hidden');
        } else {
            adminDashboardBtn.classList.add('hidden');
        }
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('role', data.role);
                currentToken = data.token;
                currentUsername = data.username;
                currentRole = data.role;
                hideAuth();
                setupUserUI();
                fetchHistory();
                errorEl.classList.add('hidden');
            } else {
                errorEl.textContent = data.message || 'Login failed';
                errorEl.classList.remove('hidden');
            }
        } catch (err) {
            errorEl.textContent = 'Server connection error.';
            errorEl.classList.remove('hidden');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const errorEl = document.getElementById('register-error');
        
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const text = await res.text();
            
            if (res.ok && !text.startsWith('Error')) {
                alert('Registration successful! Please login.');
                authTabs[0].click(); // Switch to login tab
                errorEl.classList.add('hidden');
            } else {
                errorEl.textContent = text;
                errorEl.classList.remove('hidden');
            }
        } catch (err) {
            errorEl.textContent = 'Server connection error.';
            errorEl.classList.remove('hidden');
        }
    });

    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        currentToken = null;
        currentRole = null;
        currentUsername = null;
        resetUI();
        showAuth();
    });

    // === MAIN ANALYSIS LOGIC ===
    analyzeBtn.addEventListener('click', async () => {
        const code = codeInput.value.trim();
        const language = languageSelect.value;
        const stdin = stdinInput.value;

        if (!code) {
            alert('Please enter some code to analyze!');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtnText.textContent = 'Analyzing...';
        actionSpinner.classList.remove('hidden');
        initialPlaceholder.classList.add('hidden');

        try {
            const response = await fetch(`${API_BASE}/code/analyze`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ language, code, stdin })
            });
            
            if (response.status === 401 || response.status === 403) {
                alert('Session expired. Please log in again.');
                logoutBtn.click();
                return;
            }

            const data = await response.json();
            populateUI(data);
            
            // Auto refresh history
            fetchHistory();
        } catch (error) {
            console.error('Analysis Error:', error);
            alert('Failed to connect to backend for analysis.');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtnText.textContent = 'Analyze Code';
            actionSpinner.classList.add('hidden');
        }
    });

    clearBtn.addEventListener('click', () => {
        codeInput.value = '';
        if (stdinInput) stdinInput.value = '';
        resetUI();
    });

    function resetUI() {
        initialPlaceholder.classList.remove('hidden');
        executionResults.classList.add('hidden');
        metricLines.textContent = '--';
        metricMethods.textContent = '--';
        metricComplexity.textContent = '--';
        metricVariables.textContent = '--';
        beginnerText.textContent = 'No insights generated yet.';
        workflowText.textContent = 'No insights generated yet.';
        videoSuggestionsContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:20px;">Run analysis to get video suggestions.</div>';
        mainTabBtns[0].click(); // Goto Results tab
    }

    function populateUI(data) {
        executionResults.classList.remove('hidden');

        // Results
        outputBox.textContent = data.output || 'No output generated.';
        errorBox.textContent = data.errorOutput || 'No errors encountered.';
        if (data.errorOutput) {
            errorBox.style.display = 'block';
            errorBox.previousElementSibling.style.display = 'block';
        } else {
            errorBox.style.display = 'none';
            errorBox.previousElementSibling.style.display = 'none';
        }

        // Metrics
        metricLines.textContent = data.lineCount || 0;
        metricMethods.textContent = data.methodCount || 0;
        metricComplexity.textContent = data.cyclomaticComplexity || 0;
        metricVariables.textContent = data.variableCount || 0;

        // Explanations
        beginnerText.textContent = data.beginnerExplanation || 'No basic explanation available.';
        workflowText.textContent = data.workflowExplanation || 'No workflow trace available.';

        // Video Suggestions
        if (data.videoSuggestions && data.videoSuggestions.length > 0) {
            videoSuggestionsContainer.innerHTML = '';
            data.videoSuggestions.forEach(video => {
                const card = document.createElement('a');
                card.className = 'video-card';
                card.href = video.url;
                card.target = '_blank';
                card.innerHTML = `
                    <div class="video-title"><i class="fab fa-youtube" style="color:#ff0000;"></i> ${video.title}</div>
                    <div class="video-desc">${video.description}</div>
                `;
                videoSuggestionsContainer.appendChild(card);
            });
        }
    }

    // === HISTORY LOGIC ===
    refreshHistoryBtn.addEventListener('click', fetchHistory);

    async function fetchHistory() {
        if (!currentToken) return;
        try {
            const res = await fetch(`${API_BASE}/code/history`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const historyList = await res.json();
                historyContainer.innerHTML = '';
                if (historyList.length === 0) {
                    historyContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding: 20px;">No history available yet.</div>';
                    return;
                }
                
                historyList.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'history-item';
                    
                    const dt = new Date(item.submittedAt).toLocaleString();
                    const statusClass = item.success ? 'status-success' : 'status-error';
                    const statusText = item.success ? 'Success' : 'Failed';

                    div.innerHTML = `
                        <div>
                            <span class="hist-lang">${item.language}</span>
                            <span class="hist-time" style="margin-left:10px;">${dt}</span>
                        </div>
                        <span class="hist-status ${statusClass}">${statusText}</span>
                    `;
                    
                    div.addEventListener('click', () => loadPastSubmission(item.id));
                    historyContainer.appendChild(div);
                });
            }
        } catch (e) {
            console.error('Error fetching history:', e);
        }
    }

    async function loadPastSubmission(id) {
        try {
            const res = await fetch(`${API_BASE}/code/submission/${id}`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                // Load into UI
                codeInput.value = data.code;
                languageSelect.value = data.language;
                
                // Formulate a mock AnalysisResponse since history endpoints usually return entity
                const formattedData = {
                    output: data.output,
                    errorOutput: data.errorOutput,
                    metrics: {
                        lineCount: data.lineCount,
                        methodCount: data.methodCount,
                        cyclomaticComplexity: data.cyclomaticComplexity,
                        variableCount: data.variableCount
                    },
                    beginnerExplanation: data.beginnerExplanation,
                    workflowExplanation: data.workflowExplanation,
                    videoSuggestions: [] // Assuming DB doesn't store video links directly, or we fetch them dynamically
                };
                
                populateUI(formattedData);
                mainTabBtns[0].click(); // Go to results
            }
        } catch (e) {
            console.error('Error loading submission:', e);
        }
    }

    // === AI CHAT LOGIC ===
    aiChatSendBtn.addEventListener('click', sendAiChatMessage);
    aiChatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendAiChatMessage();
    });

    async function sendAiChatMessage() {
        const question = aiChatInput.value.trim();
        const code = codeInput.value.trim();
        const language = languageSelect.value;

        if (!question) return;
        
        // Append User Message
        appendChatMessage(question, 'user-msg');
        aiChatInput.value = '';
        
        // Append Loading Message
        const tempId = 'loading-' + Date.now();
        appendChatMessage('...', 'ai-msg', tempId);

        try {
            const res = await fetch(`${API_BASE}/code/ai-chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify({ question, code, language })
            });
            
            const tmpEl = document.getElementById(tempId);
            if (tmpEl) tmpEl.remove();

            if (res.ok) {
                const data = await res.json();
                appendChatMessage(data.answer, 'ai-msg');
            } else {
                appendChatMessage("Sorry, I encountered an error communicating with the server.", 'ai-msg');
            }
        } catch (e) {
            const tmpEl = document.getElementById(tempId);
            if (tmpEl) tmpEl.remove();
            appendChatMessage("Connection failed.", 'ai-msg');
        }
    }

    function appendChatMessage(text, typeClass, id = '') {
        const wrapper = document.createElement('div');
        wrapper.className = `chat-msg ${typeClass}`;
        if (id) wrapper.id = id;
        
        const bubble = document.createElement('div');
        bubble.className = 'msg-bubble';
        bubble.textContent = text;
        
        wrapper.appendChild(bubble);
        chatHistory.appendChild(wrapper);
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    // === ADMIN DASHBOARD ===
    adminDashboardBtn.addEventListener('click', () => {
        adminOverlay.classList.remove('hidden');
        fetchAdminData();
    });

    closeAdminBtn.addEventListener('click', () => {
        adminOverlay.classList.add('hidden');
    });

    async function fetchAdminData() {
        if (currentRole !== 'ROLE_ADMIN' && currentRole !== 'ADMIN') return;
        
        // Fetch Users (Assuming endpoint exists in AdminController)
        try {
            const res = await fetch(`${API_BASE}/admin/users`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const users = await res.json();
                let html = '<table class="admin-table"><tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th></tr>';
                users.forEach(u => {
                    html += `<tr><td>${u.id}</td><td>${u.username}</td><td>${u.email}</td><td>${u.roles}</td></tr>`;
                });
                html += '</table>';
                adminUsersList.innerHTML = html;
            } else {
                adminUsersList.innerHTML = "Cannot fetch users.";
            }
        } catch (e) {
            adminUsersList.innerHTML = "Error fetching users.";
        }

        // Fetch Submissions
        try {
            const res = await fetch(`${API_BASE}/admin/submissions`, {
                headers: { 'Authorization': `Bearer ${currentToken}` }
            });
            if (res.ok) {
                const subs = await res.json();
                let html = '<table class="admin-table"><tr><th>ID</th><th>User</th><th>Language</th><th>Date</th><th>Success</th></tr>';
                subs.forEach(s => {
                    const dt = new Date(s.submittedAt).toLocaleString();
                    html += `<tr><td>${s.id}</td><td>${s.username || 'N/A'}</td><td>${s.language}</td><td>${dt}</td><td>${s.success}</td></tr>`;
                });
                html += '</table>';
                adminSubsList.innerHTML = html;
            } else {
                adminSubsList.innerHTML = "Cannot fetch submissions.";
            }
        } catch (e) {
            adminSubsList.innerHTML = "Error fetching submissions.";
        }
    }

    // START
    init();
});
