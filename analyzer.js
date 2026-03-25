// analyzer.js - Core application logic for the Dashboard

// === 1. AUTHENTICATION CHECK ===
const currentToken = localStorage.getItem('token');
const currentUsername = localStorage.getItem('username');
const currentRole = localStorage.getItem('role');

if (!currentToken) {
    // Not logged in, redirect to landing page
    window.location.href = 'index.html';
}

// Set User Profile UI
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('display-username').textContent = currentUsername || 'User';
    
    const roleElem = document.getElementById('display-role');
    if (currentRole === 'ADMIN') {
        roleElem.textContent = 'Administrator';
        roleElem.style.color = 'var(--admin-color)';
        // Show Admin Navigation Section
        document.getElementById('admin-menu-section').classList.remove('hidden');
    } else {
        roleElem.textContent = 'Student';
    }
});

// === 2. SIDEBAR NAVIGATION LOGIC ===
const API_BASE = 'http://localhost:8090/api';
const navBtns = document.querySelectorAll('.side-nav-btn');
const views = document.querySelectorAll('.dashboard-view');
const pageTitle = document.getElementById('page-title');

navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Deactivate all buttons & hide all views
        navBtns.forEach(b => b.classList.remove('active'));
        views.forEach(v => v.classList.add('hidden'));
        
        // Activate selected
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-target');
        document.getElementById(targetId).classList.remove('hidden');
        
        // Update Title
        pageTitle.textContent = btn.textContent.trim();

        // Specific View Actions
        if (targetId === 'history-view') {
            fetchHistory();
        } else if (targetId === 'admin-view' && currentRole === 'ADMIN') {
            fetchAdminStats();
            fetchAdminUsers();
            fetchAdminSubmissions();
        }
    });
});

// === 3. LOGOUT ===
document.getElementById('logout-btn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'index.html';
});


// === 4. CORE ANALYZER LOGIC ===
const analyzeBtn = document.getElementById('analyze-btn');
const clearBtn = document.getElementById('clear-btn');
const loadingSpinner = document.getElementById('loading-spinner');

// Code Inputs
const codeInput = document.getElementById('code-input');
const stdinInput = document.getElementById('stdin-input');
const languageSelect = document.getElementById('language-select');

// Output Panels
const outputBox = document.getElementById('output-box');
const errorBox = document.getElementById('error-box');
const errorContainer = document.getElementById('error-container');
const executionResults = document.getElementById('execution-results');
const initialPlaceholder = document.getElementById('initial-placeholder');
const statusBadge = document.getElementById('status-badge');

// Metrics
const mLines = document.getElementById('m-lines');
const mMethods = document.getElementById('m-methods');
const mComplex = document.getElementById('m-complex');
const mVars = document.getElementById('m-vars');
const metricsQuickView = document.getElementById('metrics-quick-view');

// Explanations
const beginnerText = document.getElementById('beginner-text');
const workflowText = document.getElementById('workflow-text');

// Videos
const videoContainer = document.getElementById('video-suggestions-container');

// State Variables
let lastSubmissionId = null; 
let currentLanguage = "Java";

// Execute Code
analyzeBtn.addEventListener('click', async () => {
    const code = codeInput.value.trim();
    currentLanguage = languageSelect.value;
    const stdin = stdinInput.value;

    if (!code) {
        alert('Please write some code first!');
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(`${API_BASE}/code/analyze`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ language: currentLanguage, code, stdin })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                alert('Session expired. Please log in again.');
                localStorage.clear();
                window.location.href = 'index.html';
                return;
            }
            throw new Error('Analysis request failed. Connection error.');
        }

        const data = await response.json();
        
        // Save submission ID for Chat Context
        lastSubmissionId = data.submissionId;
        
        // Populate specific dashboard areas
        renderExecutionResults(data);
        renderCodeMetrics(data);
        renderExplanations(data);
        renderVideoSuggestions(data.videoSuggestions);

    } catch (err) {
        alert('Server Connection Error: Ensure backend is running.\n' + err.message);
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        analyzeBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
    } else {
        analyzeBtn.disabled = false;
        loadingSpinner.classList.add('hidden');
    }
}

function renderExecutionResults(data) {
    initialPlaceholder.classList.add('hidden');
    executionResults.classList.remove('hidden');

    // Output Box
    outputBox.textContent = data.output || 'Process finished (No output).';
    
    // Status Badge
    statusBadge.classList.remove('hidden', 'success', 'fail');
    if (data.executionSuccess) {
        statusBadge.textContent = "SUCCESS";
        statusBadge.classList.add('success');
    } else {
        statusBadge.textContent = "EXECUTION FAILED";
        statusBadge.classList.add('fail');
    }

    // Error Box
    if (data.errorOutput && data.errorOutput.trim().length > 0) {
        errorContainer.classList.remove('hidden');
        errorBox.textContent = data.errorOutput;
    } else {
        errorContainer.classList.add('hidden');
        errorBox.textContent = '';
    }
}

function renderCodeMetrics(data) {
    metricsQuickView.classList.remove('hidden');
    mLines.textContent = data.lineCount || 0;
    mMethods.textContent = data.methodCount || 0;
    mComplex.textContent = data.cyclomaticComplexity || 0;
    mVars.textContent = data.variableCount || 0;
}

function renderExplanations(data) {
    beginnerText.textContent = data.beginnerExplanation || 'No basic explanation available.';
    workflowText.textContent = data.workflowExplanation || 'No workflow available.';
}

function renderVideoSuggestions(videos) {
    videoContainer.innerHTML = ''; // clear

    if (!videos || videos.length === 0) {
        videoContainer.innerHTML = `<div class="empty-state">No tutorial suggestions could be generated for this code snippet.</div>`;
        return;
    }

    videos.forEach(v => {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.innerHTML = `
            <div class="vid-thumb">
                <i class="fab fa-youtube"></i>
            </div>
            <div class="vid-info">
                <div class="vid-title" title="${v.title}">${v.title}</div>
                <div class="vid-desc">${v.description}</div>
                <a href="${v.url}" target="_blank" class="vid-btn btn secondary-btn small-btn">
                    <i class="fas fa-play"></i> Watch
                </a>
            </div>
        `;
        videoContainer.appendChild(card);
    });
}

// Clear Button
clearBtn.addEventListener('click', () => {
    codeInput.value = '';
    stdinInput.value = '';
    
    // Reset UI to clean state
    executionResults.classList.add('hidden');
    initialPlaceholder.classList.remove('hidden');
    metricsQuickView.classList.add('hidden');
    statusBadge.classList.add('hidden');
    errorContainer.classList.add('hidden');
    
    beginnerText.textContent = 'Run analysis first.';
    workflowText.textContent = 'Run analysis first.';
    videoContainer.innerHTML = `<div class="empty-state">Analyze code to see tailored tutorial recommendations.</div>`;
    
    lastSubmissionId = null;
});


// === 5. AI CHAT ASSISTANT ===
const chatInput = document.getElementById('ai-chat-input');
const chatSendBtn = document.getElementById('ai-chat-send');
const chatHistory = document.getElementById('chat-history');

chatSendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});

async function sendChatMessage() {
    const question = chatInput.value.trim();
    if (!question) return;

    // Append User Message
    appendBubble(question, 'user');
    chatInput.value = '';

    const currentCodeContext = codeInput.value.trim() || "No code provided.";

    try {
        const response = await fetch(`${API_BASE}/code/ai-chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ 
                question: question,
                code: currentCodeContext,
                language: currentLanguage
            })
        });

        if (response.ok) {
            const data = await response.json();
            appendBubble(data.answer || "Blank response.", "ai");
        } else {
            appendBubble("Error: Failed to reach AI service.", "ai");
        }
    } catch (err) {
        appendBubble("Connection error with backend.", "ai");
    }
}

function appendBubble(text, sender) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}`;
    msgDiv.innerHTML = `<div class="bubble">${text}</div>`;
    chatHistory.appendChild(msgDiv);
    // Auto-scroll
    chatHistory.scrollTop = chatHistory.scrollHeight;
}


// === 6. HISTORY LOGIC ===
const historyTableBody = document.getElementById('history-table-body');
document.getElementById('refresh-history-btn').addEventListener('click', fetchHistory);

async function fetchHistory() {
    historyTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Loading history...</td></tr>`;
    try {
        const response = await fetch(`${API_BASE}/code/history`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.ok) {
            const history = await response.json();
            renderHistory(history);
        }
    } catch(err) {
        historyTableBody.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">Failed to load history.</td></tr>`;
    }
}

function renderHistory(history) {
    historyTableBody.innerHTML = '';
    
    if (history.length === 0) {
        historyTableBody.innerHTML = `<tr><td colspan="5" class="empty-state-text">No history found.</td></tr>`;
        return;
    }

    history.forEach(item => {
        const tr = document.createElement('tr');
        
        // Date parsing
        const dateObj = new Date(item.submittedAt);
        const dateStr = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        // Status Badge
        const statusHTML = item.executionSuccess ? 
            `<span class="badge-status success">SUCCESS</span>` : 
            `<span class="badge-status fail">FAILED</span>`;

        tr.innerHTML = `
            <td>${dateStr}</td>
            <td><strong>${item.language}</strong></td>
            <td>${item.lineCount}</td>
            <td>${statusHTML}</td>
            <td>
                <button class="btn secondary-btn small-btn" onclick="viewSubmission(${item.id})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        historyTableBody.appendChild(tr);
    });
}

// Attach to window so onclick can fire
window.viewSubmission = function(id) {
    alert("Full submission viewer dialog can be bound here in the future.");
};

// === 7. ADMIN DASHBOARD LOGIC ===
const adminUsersList = document.getElementById('admin-users-list');
const adminSubsList = document.getElementById('admin-subs-list');

// Metrics KPIs
const adminStatUsers = document.getElementById('admin-stat-users');
const adminStatSubs = document.getElementById('admin-stat-subs');
const adminStatSuccess = document.getElementById('admin-stat-success');

// Modal Elements
const codeModal = document.getElementById('code-modal');
const modalCodeArea = document.getElementById('modal-code-area');
document.getElementById('close-modal-btn').addEventListener('click', () => {
    codeModal.classList.add('hidden');
});

// Store submissions globally to easily retrieve code by ID
let globalSubmissions = {};

async function fetchAdminUsers() {
    try {
        const response = await fetch(`${API_BASE}/admin/users`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const users = await response.json();
            adminUsersList.innerHTML = '';
            users.forEach(u => {
                adminUsersList.innerHTML += `
                    <tr>
                        <td>#${u.id}</td>
                        <td><strong>${u.username}</strong></td>
                        <td>${u.email}</td>
                        <td>${u.role}</td>
                    </tr>
                `;
            });
        }
    } catch(e) {}
}

async function fetchAdminSubmissions() {
    try {
        const response = await fetch(`${API_BASE}/admin/submissions`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const subs = await response.json();
            adminSubsList.innerHTML = '';
            globalSubmissions = {}; // reset mapping
            
            subs.forEach(s => {
                globalSubmissions[s.id] = s.code; // Store code for the modal
                
                const date = new Date(s.submittedAt).toLocaleDateString();
                const status = s.executionSuccess ? '<span style="color:var(--success-color)">Success</span>' : '<span style="color:var(--error-color)">Failed</span>';
                
                adminSubsList.innerHTML += `
                    <tr>
                        <td>#${s.id}</td>
                        <td>${s.user ? s.user.username : 'Unknown'}</td>
                        <td>${s.language}</td>
                        <td>${date}</td>
                        <td>
                            <button class="btn secondary-btn small-btn" onclick="openAdminCodeModal(${s.id})">
                                <i class="fas fa-eye"></i> Code
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch(e) {}
}

// Global function to trigger modal
window.openAdminCodeModal = function(subId) {
    if(globalSubmissions[subId]) {
        modalCodeArea.value = globalSubmissions[subId];
        codeModal.classList.remove('hidden');
    }
}

async function fetchAdminStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/analytics`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            const stats = await response.json();
            adminStatUsers.innerHTML = stats.totalUsers || 0;
            adminStatSubs.innerHTML = stats.totalSubmissions || 0;
            // E.g. Success Rate: 85%
            const successRate = stats.totalSubmissions > 0 
                ? Math.round((stats.successfulExecutions / stats.totalSubmissions) * 100) 
                : 0;
            adminStatSuccess.innerHTML = successRate + '%';
        }
    } catch(e) {}
}
