// AgentCore Memory Browser - JavaScript Application

// Global variables
let currentMemory = null;
let jsonEditor = null;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Initialize the application
async function initializeApp() {
    console.log('Initializing AgentCore Memory Browser...');

    // Initialize JSONEditor
    initializeJsonEditor();

    // Load memories
    await loadMemories();

    // Setup event listeners
    setupEventListeners();
}

// Initialize JSONEditor for viewing JSON data
function initializeJsonEditor() {
    const container = document.getElementById('json-editor');
    const options = {
        mode: 'code',  // Always start in code mode for better readability
        modes: ['code', 'tree', 'view'],  // Code mode first, others available
        search: true,
        navigationBar: true,
        statusBar: true,
        readOnly: true  // Make it read-only since we're just viewing data
    };

    jsonEditor = new JSONEditor(container, options);
}

// Setup event listeners
function setupEventListeners() {
    const memorySelect = document.getElementById('memory-select');
    if (memorySelect) {
        memorySelect.addEventListener('change', handleMemorySelection);
    }

    // Setup global click handlers
    document.addEventListener('click', function(event) {
        if (event.target.closest('.copy-btn')) {
            handleCopyClick(event);
        }

        // Handle JSON view buttons
        if (event.target.closest('.view-json-btn')) {
            handleJsonViewClick(event);
        }

        // Handle delete buttons
        if (event.target.closest('.delete-btn')) {
            handleDeleteClick(event);
        }
    });
}

// Load available memories
async function loadMemories() {
    const loadingDiv = document.getElementById('memory-loading');
    const listDiv = document.getElementById('memory-list');
    const errorDiv = document.getElementById('memory-error');
    const memorySelect = document.getElementById('memory-select');

    try {
        showElement(loadingDiv);
        hideElement(listDiv);
        hideElement(errorDiv);

        console.log('Fetching memories from API...');
        const response = await fetch('/api/memories');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const memories = await response.json();
        console.log(`Loaded ${memories.length} memories`);

        // Clear existing options (keep the first "Choose a memory..." option)
        while (memorySelect.children.length > 1) {
            memorySelect.removeChild(memorySelect.lastChild);
        }

        // Add memories to select
        memories.forEach(memory => {
            const option = document.createElement('option');
            option.value = memory.id;
            option.textContent = memory.name || `Memory ${memory.id}`;
            option.dataset.memory = JSON.stringify(memory);
            memorySelect.appendChild(option);
        });

        hideElement(loadingDiv);
        showElement(listDiv);

    } catch (error) {
        console.error('Error loading memories:', error);
        hideElement(loadingDiv);
        showElement(errorDiv);
    }
}

// Handle memory selection change
async function handleMemorySelection(event) {
    const selectedOption = event.target.selectedOptions[0];
    const memoryId = selectedOption.value;

    if (!memoryId) {
        hideMemoryDetails();
        hideMemoryInfo();
        return;
    }

    // Show basic memory info from the option data
    const memoryData = JSON.parse(selectedOption.dataset.memory);
    showMemoryInfo(memoryData);

    // Load detailed memory information
    await loadMemoryDetails(memoryId);
}

// Show basic memory information in sidebar
function showMemoryInfo(memory) {
    const infoDiv = document.getElementById('memory-info');
    const statusSpan = document.getElementById('memory-status');
    const createdSpan = document.getElementById('memory-created');
    const updatedSpan = document.getElementById('memory-updated');

    statusSpan.textContent = memory.status;
    statusSpan.className = `badge ${getStatusBadgeClass(memory.status)}`;

    createdSpan.textContent = formatDate(memory.createdAt);
    updatedSpan.textContent = formatDate(memory.updatedAt);

    showElement(infoDiv);
}

// Hide memory information in sidebar
function hideMemoryInfo() {
    const infoDiv = document.getElementById('memory-info');
    hideElement(infoDiv);
}

// Load detailed memory information
async function loadMemoryDetails(memoryId) {
    const loadingDiv = document.getElementById('loading-memory');
    const detailsDiv = document.getElementById('memory-details');
    const errorDiv = document.getElementById('error-memory');
    const welcomeDiv = document.getElementById('welcome-message');

    try {
        hideElement(welcomeDiv);
        hideElement(detailsDiv);
        hideElement(errorDiv);
        showElement(loadingDiv);

        console.log(`Loading details for memory: ${memoryId}`);
        const response = await fetch(`/api/memories/${memoryId}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const memory = await response.json();
        console.log('Memory details loaded:', memory);

        currentMemory = memory;
        displayMemoryDetails(memory);

        hideElement(loadingDiv);
        showElement(detailsDiv);

    } catch (error) {
        console.error('Error loading memory details:', error);
        document.getElementById('error-message').textContent = error.message;
        hideElement(loadingDiv);
        showElement(errorDiv);
    }
}

// Display memory details in the main content area
function displayMemoryDetails(memory) {
    // Update overview section
    document.getElementById('memory-title').innerHTML = `
        <i class="bi bi-info-circle me-2"></i>
        ${memory.name || 'Memory Details'}
    `;

    document.getElementById('detail-status').textContent = memory.status;
    document.getElementById('detail-status').className = `badge ${getStatusBadgeClass(memory.status)}`;

    document.getElementById('detail-created').textContent = formatDate(memory.createdAt);
    document.getElementById('detail-updated').textContent = formatDate(memory.updatedAt);

    // Show description if available
    const descriptionDiv = document.getElementById('memory-description');
    const descriptionSpan = document.getElementById('detail-description');
    if (memory.description) {
        descriptionSpan.textContent = memory.description;
        showElement(descriptionDiv);
    } else {
        hideElement(descriptionDiv);
    }

    // Update metadata section
    document.getElementById('detail-id').textContent = memory.id;
    document.getElementById('detail-arn').textContent = memory.arn;

    // Show encryption key if available
    const encryptionDiv = document.getElementById('detail-encryption');
    const encryptionKeySpan = document.getElementById('detail-encryption-key');
    if (memory.encryptionKeyArn) {
        encryptionKeySpan.textContent = memory.encryptionKeyArn;
        showElement(encryptionDiv);
    } else {
        hideElement(encryptionDiv);
    }

    // Show execution role if available
    const executionDiv = document.getElementById('detail-execution');
    const executionRoleSpan = document.getElementById('detail-execution-role');
    if (memory.memoryExecutionRoleArn) {
        executionRoleSpan.textContent = memory.memoryExecutionRoleArn;
        showElement(executionDiv);
    } else {
        hideElement(executionDiv);
    }

    // Display strategies
    displayStrategies(memory.strategies || []);
}

// Display memory strategies as tabs
function displayStrategies(strategies) {
    const strategiesTabsDiv = document.getElementById('strategies-tabs');

    if (!strategies.length) {
        strategiesTabsDiv.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-info-circle text-muted" style="font-size: 2rem;"></i>
                <p class="text-muted mt-2">No strategies configured for this memory.</p>
            </div>
        `;
        return;
    }

    // Create tab navigation
    let tabsHtml = '<ul class="nav nav-tabs" id="strategy-tabs" role="tablist">';
    strategies.forEach((strategy, index) => {
        const isActive = index === 0 ? 'active' : '';
        tabsHtml += `
            <li class="nav-item" role="presentation">
                <button class="nav-link ${isActive}" id="strategy-${index}-tab"
                        data-bs-toggle="tab" data-bs-target="#strategy-${index}"
                        type="button" role="tab">
                    ${strategy.name || `Strategy ${index + 1}`}
                </button>
            </li>
        `;
    });
    tabsHtml += '</ul>';

    // Create tab content
    tabsHtml += '<div class="tab-content" id="strategy-tabs-content">';
    strategies.forEach((strategy, index) => {
        const isActive = index === 0 ? 'show active' : '';
        tabsHtml += `
            <div class="tab-pane fade ${isActive}" id="strategy-${index}"
                 role="tabpanel" aria-labelledby="strategy-${index}-tab">
                ${generateStrategyContent(strategy, index)}
            </div>
        `;
    });
    tabsHtml += '</div>';

    strategiesTabsDiv.innerHTML = tabsHtml;

    // Initialize namespace fields for all strategies (only if not already set)
    strategies.forEach((strategy, index) => {
        initializeStrategyNamespaces(strategy, index);
    });
}

// Generate content for a strategy tab
function generateStrategyContent(strategy, index) {
    const namespaceBadges = strategy.namespaces.map((ns, nsIndex) =>
        `<span class="badge bg-secondary me-1 d-inline-flex align-items-center">
            ${escapeHtml(ns)}
            <button class="btn btn-sm p-0 ms-2 copy-btn"
                    data-copy-text="${escapeHtml(ns)}"
                    data-copy-label="Namespace"
                    title="Copy namespace"
                    style="border: none; background: none; color: white; font-size: 0.75rem;">
                <i class="bi bi-clipboard"></i>
            </button>
        </span>`
    ).join('');

    return `
        <div class="row">
            <div class="col-md-6">
                <h6>Strategy Information</h6>
                <table class="table table-sm">
                    <tr>
                        <th>ID:</th>
                        <td><code>${strategy.strategyId}</code></td>
                    </tr>
                    <tr>
                        <th>Name:</th>
                        <td>${strategy.name}</td>
                    </tr>
                    <tr>
                        <th>Type:</th>
                        <td><span class="badge bg-primary">${strategy.type}</span></td>
                    </tr>
                    <tr>
                        <th>Status:</th>
                        <td><span class="badge ${getStatusBadgeClass(strategy.status)}">${strategy.status}</span></td>
                    </tr>
                </table>
            </div>
            <div class="col-md-6">
                <h6>Namespaces</h6>
                <div class="mb-3">
                    ${namespaceBadges || '<span class="text-muted">No namespaces</span>'}
                </div>
                <h6>Timestamps</h6>
                <table class="table table-sm">
                    <tr>
                        <th>Created:</th>
                        <td>${formatDate(strategy.createdAt)}</td>
                    </tr>
                    <tr>
                        <th>Updated:</th>
                        <td>${formatDate(strategy.updatedAt)}</td>
                    </tr>
                </table>
            </div>
        </div>
        ${strategy.description ? `
            <div class="row mt-3">
                <div class="col-12">
                    <h6>Description</h6>
                    <div class="alert alert-info">
                        <i class="bi bi-info-circle me-2"></i>
                        ${escapeHtml(strategy.description)}
                    </div>
                </div>
            </div>
        ` : ''}
        <div class="row mt-3">
            <div class="col-12">
                <div class="btn-group" role="group">
                    <button class="btn btn-outline-success btn-sm"
                            onclick="listMemoryRecords(${index})">
                        <i class="bi bi-list-ul me-2"></i>
                        List Memory Records
                    </button>
                    <button class="btn btn-outline-info btn-sm"
                            onclick="retrieveMemoryRecords(${index})">
                        <i class="bi bi-search me-2"></i>
                        Retrieve Memory Records
                    </button>
                </div>
            </div>
        </div>

        <!-- Memory Records Form -->
        <div id="strategy-${index}-memory-records" class="mt-4 d-none">
            <h6>List Memory Records</h6>
            <div class="mb-3">
                <label class="form-label">Namespace</label>
                <input type="text" id="strategy-${index}-namespace" class="form-control" placeholder="Namespace...">
                <small class="form-text text-muted">Namespace is prepopulated from the selected strategy</small>
            </div>
            <div class="mb-3">
                <button class="btn btn-primary" onclick="executeListMemoryRecords(${index})">
                    <i class="bi bi-list-ul me-2"></i>List Memory Records
                </button>
            </div>
            <div id="strategy-${index}-memory-records-results">
                <!-- Memory records results will be loaded here -->
            </div>
        </div>

        <!-- Retrieve Memory Records Form -->
        <div id="strategy-${index}-retrieve" class="mt-4 d-none">
            <h6>Retrieve Memory Records</h6>
            <div class="mb-3">
                <label class="form-label">Search Query</label>
                <input type="text" id="strategy-${index}-search-query" class="form-control" placeholder="Enter search query...">
            </div>
            <div class="mb-3">
                <label class="form-label">Namespace</label>
                <input type="text" id="strategy-${index}-retrieve-namespace" class="form-control" placeholder="Namespace...">
                <small class="form-text text-muted">Namespace is prepopulated from the selected strategy</small>
            </div>
            <div class="mb-3">
                <button class="btn btn-primary" onclick="executeRetrieveMemoryRecords(${index})">
                    <i class="bi bi-search me-2"></i>Retrieve Memory Records
                </button>
            </div>
            <div id="strategy-${index}-retrieve-results">
                <!-- Retrieve results will be loaded here -->
            </div>
        </div>
    `;
}

// Hide memory details
function hideMemoryDetails() {
    const detailsDiv = document.getElementById('memory-details');
    const welcomeDiv = document.getElementById('welcome-message');

    hideElement(detailsDiv);
    showElement(welcomeDiv);
}


// Show JSON data in modal
function showJsonModal(title, data) {
    const modal = new bootstrap.Modal(document.getElementById('json-viewer-modal'));
    const titleElement = document.getElementById('json-field-name');

    titleElement.textContent = title;

    if (jsonEditor) {
        jsonEditor.set(data);
    }

    modal.show();
}

// Copy JSON to clipboard
function copyJsonToClipboard() {
    if (!jsonEditor) {
        console.error('JSON editor not initialized');
        return;
    }

    try {
        const jsonText = JSON.stringify(jsonEditor.get(), null, 2);
        navigator.clipboard.writeText(jsonText).then(() => {
            // Show temporary success message
            const btn = document.querySelector('[onclick="copyJsonToClipboard()"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Copied!';
            btn.classList.add('btn-success');
            btn.classList.remove('btn-primary');

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-success');
            }, 2000);
        });
    } catch (error) {
        console.error('Error copying to clipboard:', error);
    }
}

// Universal copy handler using data attributes
function handleCopyClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.target.closest('.copy-btn');
    if (!button) return;

    let text = '';
    let label = button.dataset.copyLabel || 'content';

    // Check if copying from another element
    if (button.dataset.copySource) {
        const sourceElement = document.getElementById(button.dataset.copySource);
        if (sourceElement) {
            text = sourceElement.textContent || sourceElement.innerText;
        }
    }
    // Or copying direct text
    else if (button.dataset.copyText) {
        text = button.dataset.copyText;
    }

    if (!text) {
        console.error('No text to copy');
        return;
    }

    copyToClipboard(text, label, button);
}

// Universal JSON view handler using data attributes
function handleJsonViewClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.target.closest('.view-json-btn');
    if (!button) return;

    const itemType = button.dataset.itemType;
    const itemId = button.dataset.itemId;

    if (itemType === 'event') {
        showEventJson(itemId);
    } else if (itemType === 'record') {
        showRecordJson(itemId);
    } else {
        console.error('Unknown item type:', itemType);
    }
}

// Universal delete handler using data attributes
function handleDeleteClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const button = event.target.closest('.delete-btn');
    if (!button) return;

    const itemType = button.dataset.itemType;
    const itemId = button.dataset.itemId;

    if (itemType === 'event') {
        confirmDeleteEvent(itemId);
    } else if (itemType === 'record') {
        confirmDeleteRecord(itemId);
    } else {
        console.error('Unknown item type:', itemType);
    }
}

// Confirm and delete an event
function confirmDeleteEvent(eventId) {
    const event = currentEventsData[eventId];
    if (!event) {
        console.error('Event not found:', eventId);
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('delete-confirm-modal'));
    const messageEl = document.getElementById('delete-confirm-message');
    const confirmBtn = document.getElementById('delete-confirm-btn');

    messageEl.textContent = `Are you sure you want to delete event "${eventId}"?`;

    // Remove any existing click handlers and add new one
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async function() {
        modal.hide();
        await executeDeleteEvent(eventId, event.sessionId, event.actorId);
    });

    modal.show();
}

// Execute event deletion
async function executeDeleteEvent(eventId, sessionId, actorId) {
    if (!currentMemory) {
        console.error('No memory selected');
        return;
    }

    try {
        const response = await fetch(
            `/api/memories/${encodeURIComponent(currentMemory.id)}/events/${encodeURIComponent(eventId)}?session_id=${encodeURIComponent(sessionId)}&actor_id=${encodeURIComponent(actorId)}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Event deleted:', result);

        // Remove from in-memory data
        delete currentEventsData[eventId];

        // Remove the row from DOM
        const row = document.querySelector(`tr[data-event-id="${eventId}"]`);
        if (row) {
            // Get references BEFORE removing the row
            const badge = row.closest('.table-responsive')?.previousElementSibling?.querySelector('.badge');

            // Now remove the row
            row.remove();

            // Update the count badge
            if (badge) {
                const currentCount = Object.keys(currentEventsData).length;
                badge.textContent = `${currentCount} event(s)`;
            }
        }

        // Show success message
        showCopySuccess('Event deleted successfully');

    } catch (error) {
        console.error('Error deleting event:', error);
        alert(`Error deleting event: ${error.message}`);
    }
}

// Confirm and delete a memory record
function confirmDeleteRecord(recordId) {
    const record = currentRecordsData[recordId];
    if (!record) {
        console.error('Record not found:', recordId);
        return;
    }

    const modal = new bootstrap.Modal(document.getElementById('delete-confirm-modal'));
    const messageEl = document.getElementById('delete-confirm-message');
    const confirmBtn = document.getElementById('delete-confirm-btn');

    messageEl.textContent = `Are you sure you want to delete memory record "${recordId}"?`;

    // Remove any existing click handlers and add new one
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    newConfirmBtn.addEventListener('click', async function() {
        modal.hide();
        await executeDeleteRecord(recordId, record.namespace);
    });

    modal.show();
}

// Execute memory record deletion
async function executeDeleteRecord(recordId, namespace) {
    if (!currentMemory) {
        console.error('No memory selected');
        return;
    }

    try {
        const response = await fetch(
            `/api/memories/${encodeURIComponent(currentMemory.id)}/records/${encodeURIComponent(recordId)}?namespace=${encodeURIComponent(namespace)}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Memory record deleted:', result);

        // Remove from in-memory data
        delete currentRecordsData[recordId];

        // Remove the row from DOM
        const row = document.querySelector(`tr[data-record-id="${recordId}"]`);
        if (row) {
            // Get references BEFORE removing the row
            const tableContainer = row.closest('.table-responsive');
            const header = tableContainer?.previousElementSibling;
            const countText = header?.querySelector('small');

            // Now remove the row
            row.remove();

            // Update the count in the header
            if (countText) {
                const currentCount = Object.keys(currentRecordsData).length;
                // Extract the namespace from existing text
                const namespaceMatch = countText.textContent.match(/Namespace: <code>([^<]+)<\/code>/);
                const namespace = namespaceMatch ? namespaceMatch[1] : '';
                countText.innerHTML = `Namespace: <code>${namespace}</code> • Found ${currentCount} record(s)`;
            }
        }

        // Show success message
        showCopySuccess('Memory record deleted successfully');

    } catch (error) {
        console.error('Error deleting memory record:', error);
        alert(`Error deleting memory record: ${error.message}`);
    }
}

// Refresh the current records list after deletion
function refreshCurrentRecordsList(namespace) {
    // Find which strategy tab is active and refresh its records
    if (!currentMemory) return;

    // Look for active strategy tabs
    const activeTabs = document.querySelectorAll('.tab-pane.active');
    activeTabs.forEach(tab => {
        const tabId = tab.id;
        const match = tabId.match(/strategy-(\d+)/);
        if (match) {
            const strategyIndex = parseInt(match[1]);

            // Check if memory records results div has content
            const resultsDiv = document.getElementById(`strategy-${strategyIndex}-memory-records-results`);
            if (resultsDiv && resultsDiv.innerHTML.trim() !== '') {
                // Refresh this strategy's records
                executeListMemoryRecords(strategyIndex);
            }

            // Check if retrieve results div has content
            const retrieveDiv = document.getElementById(`strategy-${strategyIndex}-retrieve-results`);
            if (retrieveDiv && retrieveDiv.innerHTML.trim() !== '') {
                // Refresh this strategy's retrieve results
                executeRetrieveMemoryRecords(strategyIndex);
            }
        }
    });
}

// Main copy function
function copyToClipboard(text, label = 'content', button = null) {
    try {
        navigator.clipboard.writeText(text).then(() => {
            showCopySuccess(`Copied ${label} to clipboard!`, button);
        }).catch(error => {
            console.error('Error copying to clipboard:', error);
            // Fallback for older browsers
            fallbackCopyTextToClipboard(text, label, button);
        });
    } catch (error) {
        console.error('Error copying to clipboard:', error);
        fallbackCopyTextToClipboard(text, label, button);
    }
}

// Fallback copy method for older browsers
function fallbackCopyTextToClipboard(text, label = 'content', button = null) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess(`Copied ${label} to clipboard!`, button);
        }
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}

// Show copy success message with optional button feedback
function showCopySuccess(message, button = null) {
    // Show button feedback if button provided
    if (button) {
        const originalHtml = button.innerHTML;
        const originalClasses = button.className;

        button.innerHTML = '<i class="bi bi-check-circle"></i>';
        button.className = button.className.replace('btn-outline-secondary', 'btn-success');

        setTimeout(() => {
            button.innerHTML = originalHtml;
            button.className = originalClasses;
        }, 1500);
    }

    // Create temporary toast-like notification
    const toast = document.createElement('div');
    toast.className = 'alert alert-success position-fixed';
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; opacity: 0; transition: opacity 0.3s;';
    toast.innerHTML = `<i class="bi bi-check-circle me-2"></i>${message}`;

    document.body.appendChild(toast);

    // Fade in
    setTimeout(() => { toast.style.opacity = '1'; }, 10);

    // Fade out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { document.body.removeChild(toast); }, 300);
    }, 2000);
}

// Refresh data by reloading memories
async function refreshData() {
    console.log('Refreshing data...');

    // Reset current memory selection
    currentMemory = null;
    const memorySelect = document.getElementById('memory-select');
    memorySelect.value = '';

    // Hide details and show welcome message
    hideMemoryDetails();
    hideMemoryInfo();

    // Reload memories
    await loadMemories();
}

// API functions for memory operations

// Global storage for current session/actor IDs
let currentSessionId = null;
let currentActorId = null;

// Execute Global List Events (from main section, not strategy-specific)
async function executeGlobalListEvents() {
    if (!currentMemory) {
        console.error('No memory selected');
        return;
    }

    const sessionIdInput = document.getElementById('global-session-id');
    const actorIdInput = document.getElementById('global-actor-id');
    const resultsDiv = document.getElementById('global-events-results');

    await executeApiCall({
        resultsDiv,
        validation: () => {
            const sessionId = sessionIdInput.value.trim();
            const actorId = actorIdInput.value.trim();

            if (!sessionId || !actorId) {
                showWarning(resultsDiv, 'Please enter both Session ID and Actor ID.');
                return false;
            }
            return true;
        },
        apiCall: async () => {
            const sessionId = sessionIdInput.value.trim();
            const actorId = actorIdInput.value.trim();

            // Store for deletion later
            currentSessionId = sessionId;
            currentActorId = actorId;

            const response = await fetch(`/api/memories/${currentMemory.id}/events?session_id=${encodeURIComponent(sessionId)}&actor_id=${encodeURIComponent(actorId)}&max_results=50`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        },
        displayFunction: (container, result) => displayEvents(container, result.events, currentSessionId, currentActorId),
        loadingMessage: "Loading events...",
        errorPrefix: "Error loading events"
    });
}

// List Memory Records
function listMemoryRecords(strategyIndex) {
    if (!currentMemory || !currentMemory.strategies[strategyIndex]) {
        console.error('Strategy not found');
        return;
    }

    const strategy = currentMemory.strategies[strategyIndex];

    // Hide other sections
    hideElement(document.getElementById(`strategy-${strategyIndex}-events`));
    hideElement(document.getElementById(`strategy-${strategyIndex}-retrieve`));

    // Show memory records section
    const memoryRecordsDiv = document.getElementById(`strategy-${strategyIndex}-memory-records`);
    showElement(memoryRecordsDiv);

    // Only prepopulate namespace if it's empty (preserve user edits)
    const namespaceInput = document.getElementById(`strategy-${strategyIndex}-namespace`);
    if (namespaceInput && !namespaceInput.value) {
        const namespace = getSimplifiedNamespace(strategy);
        namespaceInput.value = namespace;
    }
}

// Execute List Memory Records
async function executeListMemoryRecords(strategyIndex) {
    if (!currentMemory || !currentMemory.strategies[strategyIndex]) {
        console.error('Strategy not found');
        return;
    }

    const namespaceInput = document.getElementById(`strategy-${strategyIndex}-namespace`);
    const resultsDiv = document.getElementById(`strategy-${strategyIndex}-memory-records-results`);

    await executeApiCall({
        resultsDiv,
        validation: () => {
            const namespace = namespaceInput.value.trim();
            if (!namespace) {
                showWarning(resultsDiv, 'Please enter a namespace.');
                return false;
            }
            return true;
        },
        apiCall: async () => {
            const namespace = namespaceInput.value.trim();
            const encodedNamespace = encodeURIComponent(namespace);
            const response = await fetch(`/api/memories/${currentMemory.id}/records?namespace=${encodedNamespace}&max_results=50`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        },
        displayFunction: (container, result) => {
            const namespace = namespaceInput.value.trim();
            displayRecords(container, result.records, namespace);
        },
        loadingMessage: "Loading memory records...",
        errorPrefix: "Error loading memory records"
    });
}

// Retrieve Memory Records (search)
function retrieveMemoryRecords(strategyIndex) {
    if (!currentMemory || !currentMemory.strategies[strategyIndex]) {
        console.error('Strategy not found');
        return;
    }

    const strategy = currentMemory.strategies[strategyIndex];

    // Hide other sections
    hideElement(document.getElementById(`strategy-${strategyIndex}-events`));
    hideElement(document.getElementById(`strategy-${strategyIndex}-memory-records`));

    // Show retrieve section
    const retrieveDiv = document.getElementById(`strategy-${strategyIndex}-retrieve`);
    showElement(retrieveDiv);

    // Only prepopulate namespace if it's empty (preserve user edits)
    const namespaceInput = document.getElementById(`strategy-${strategyIndex}-retrieve-namespace`);
    if (namespaceInput && !namespaceInput.value) {
        const namespace = getSimplifiedNamespace(strategy);
        namespaceInput.value = namespace;
    }

    // Focus on search query input
    setTimeout(() => {
        const searchQueryInput = document.getElementById(`strategy-${strategyIndex}-search-query`);
        if (searchQueryInput) searchQueryInput.focus();
    }, 100);
}

// Execute Retrieve Memory Records
async function executeRetrieveMemoryRecords(strategyIndex) {
    if (!currentMemory || !currentMemory.strategies[strategyIndex]) {
        console.error('Strategy not found');
        return;
    }

    const searchQueryInput = document.getElementById(`strategy-${strategyIndex}-search-query`);
    const namespaceInput = document.getElementById(`strategy-${strategyIndex}-retrieve-namespace`);
    const resultsDiv = document.getElementById(`strategy-${strategyIndex}-retrieve-results`);

    await executeApiCall({
        resultsDiv,
        validation: () => {
            const query = searchQueryInput.value.trim();
            const namespace = namespaceInput.value.trim();

            if (!query || !namespace) {
                showWarning(resultsDiv, 'Please enter both search query and namespace.');
                return false;
            }
            return true;
        },
        apiCall: async () => {
            const query = searchQueryInput.value.trim();
            const namespace = namespaceInput.value.trim();

            const response = await fetch(`/api/memories/${currentMemory.id}/retrieve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: query,
                    namespace: namespace,
                    maxResults: 20
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        },
        displayFunction: (container, result) => {
            const query = searchQueryInput.value.trim();
            const namespace = namespaceInput.value.trim();
            displayRecords(container, result.records, namespace, `Search results for "${query}"`);
        },
        loadingMessage: "Retrieving memory records...",
        errorPrefix: "Error retrieving memory records"
    });
}

// Helper function to get namespace from strategy with memoryStrategyId replaced
function getSimplifiedNamespace(strategy) {
    if (!strategy.namespaces || strategy.namespaces.length === 0) {
        return '/default/';
    }

    let namespace = strategy.namespaces[0];

    // Replace {memoryStrategyId} with the actual strategy ID
    if (namespace.includes('{memoryStrategyId}')) {
        namespace = namespace.replace('{memoryStrategyId}', strategy.strategyId);
    }

    return namespace;
}

// Initialize namespace fields for a strategy (only if not already populated)
function initializeStrategyNamespaces(strategy, index) {
    // Wait for the DOM elements to be available
    setTimeout(() => {
        const memoryRecordsNamespaceInput = document.getElementById(`strategy-${index}-namespace`);
        const retrieveNamespaceInput = document.getElementById(`strategy-${index}-retrieve-namespace`);

        if (memoryRecordsNamespaceInput && !memoryRecordsNamespaceInput.value) {
            memoryRecordsNamespaceInput.value = getSimplifiedNamespace(strategy);
        }

        if (retrieveNamespaceInput && !retrieveNamespaceInput.value) {
            retrieveNamespaceInput.value = getSimplifiedNamespace(strategy);
        }
    }, 100);
}

// Store events data for modal display
let currentEventsData = {};

// Store records data for modal display
let currentRecordsData = {};

// --- DRY Helper Functions for API Calls ---

/**
 * Generic API call executor to reduce code duplication
 */
async function executeApiCall(config) {
    const {
        resultsDiv,
        validation,
        apiCall,
        displayFunction,
        loadingMessage = "Loading...",
        errorPrefix = "Error"
    } = config;

    // Validation
    if (!validation()) return;

    // Show loading state
    showLoading(resultsDiv, loadingMessage);

    try {
        const result = await apiCall();
        displayFunction(resultsDiv, result);
    } catch (error) {
        console.error(`${errorPrefix}:`, error);
        showError(resultsDiv, `${errorPrefix}: ${error.message}`);
    }
}

/**
 * Show loading spinner with message
 */
function showLoading(container, message = "Loading...") {
    container.innerHTML = `
        <div class="text-center">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2">${message}</p>
        </div>
    `;
}

/**
 * Show error message with consistent styling
 */
function showError(container, message) {
    container.innerHTML = `
        <div class="alert alert-danger">
            <i class="bi bi-exclamation-triangle me-2"></i>
            ${message}
        </div>
    `;
}

/**
 * Show warning message with consistent styling
 */
function showWarning(container, message) {
    container.innerHTML = `
        <div class="alert alert-warning">
            <i class="bi bi-exclamation-triangle me-2"></i>
            ${message}
        </div>
    `;
}

// Display events in a table
function displayEvents(container, events, sessionId, actorId) {
    if (!events || events.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                No events found.
            </div>
        `;
        return;
    }

    // Store events for modal display and deletion
    currentEventsData = {};
    events.forEach(event => {
        currentEventsData[event.eventId] = {
            ...event,
            sessionId: sessionId,
            actorId: actorId
        };
    });

    const tableHtml = `
        <div class="table-responsive">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Events</h6>
                <span class="badge bg-secondary">${events.length} event(s)</span>
            </div>
            <table class="table table-striped">
                <thead>
                    <tr>
                        <th>Event ID</th>
                        <th>Event Type</th>
                        <th>Created</th>
                        <th>Data</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${events.map(event => `
                        <tr data-event-id="${event.eventId}">
                            <td><code>${event.eventId}</code></td>
                            <td>${event.eventType || 'N/A'}</td>
                            <td>${formatDate(event.eventTimestamp || event.createdAt)}</td>
                            <td>
                                ${generateContentPreview(event.payload || event.data, event.metadata)}
                            </td>
                            <td>
                                <button class="btn btn-outline-primary btn-sm view-json-btn me-1"
                                        data-item-type="event"
                                        data-item-id="${event.eventId}"
                                        title="View details">
                                    <i class="bi bi-eye"></i>
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-btn"
                                        data-item-type="event"
                                        data-item-id="${event.eventId}"
                                        title="Delete event">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = tableHtml;
}

// Show event JSON in modal
function showEventJson(eventId) {
    if (!currentEventsData[eventId]) {
        console.error('Event not found:', eventId);
        return;
    }

    const event = currentEventsData[eventId];
    showJsonModal(`Event: ${eventId}`, event);
}

// Utility functions

function showElement(element) {
    if (element) {
        element.classList.remove('d-none');
    }
}

function hideElement(element) {
    if (element) {
        element.classList.add('d-none');
    }
}

function getStatusBadgeClass(status) {
    switch (status?.toUpperCase()) {
        case 'AVAILABLE':
        case 'ACTIVE':
            return 'bg-success';
        case 'CREATING':
        case 'UPDATING':
            return 'bg-warning';
        case 'DELETING':
        case 'FAILED':
            return 'bg-danger';
        default:
            return 'bg-secondary';
    }
}

function formatDate(dateValue) {
    if (!dateValue) return 'N/A';

    let date;
    if (typeof dateValue === 'number') {
        // Unix timestamp
        date = new Date(dateValue * 1000);
    } else if (typeof dateValue === 'string') {
        date = new Date(dateValue);
    } else if (dateValue instanceof Date) {
        date = dateValue;
    } else {
        return 'Invalid Date';
    }

    return date.toLocaleString();
}

// Generate content preview with expand option
function generateContentPreview(content, metadata) {
    const hasContent = content && Object.keys(content).length > 0;
    const hasMetadata = metadata && Object.keys(metadata).length > 0;

    if (!hasContent && !hasMetadata) {
        return '<span class="badge bg-secondary">No Content</span>';
    }

    let preview = '';
    let fullContent = {};

    // Build full content object
    if (hasContent) fullContent.content = content;
    if (hasMetadata) fullContent.metadata = metadata;

    // Extract text content for preview
    let previewText = extractTextForPreview(fullContent);

    if (previewText) {
        const truncated = previewText.length > 100 ? previewText.substring(0, 100) + '...' : previewText;
        preview = `
            <div class="small text-muted" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${escapeHtml(truncated)}
            </div>
        `;
    } else {
        preview = `
            <div class="text-muted small">
                <em>No preview available</em>
            </div>
        `;
    }

    return preview;
}

// Extract readable text from content for preview
function extractTextForPreview(obj) {
    if (!obj) return '';

    // Convert object to string and look for meaningful text
    const jsonStr = JSON.stringify(obj, null, 2);

    // Try to extract human-readable text
    const textFields = ['text', 'content', 'message', 'description', 'summary', 'value'];
    for (const field of textFields) {
        if (obj[field] && typeof obj[field] === 'string') {
            return obj[field];
        }
        if (obj.content && obj.content[field] && typeof obj.content[field] === 'string') {
            return obj.content[field];
        }
    }

    // If no specific text fields, try to find any string values
    const strings = [];
    function extractStrings(obj, depth = 0) {
        if (depth > 3) return; // Prevent too deep recursion
        if (typeof obj === 'string' && obj.length > 10) {
            strings.push(obj);
        } else if (typeof obj === 'object' && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                extractStrings(value, depth + 1);
            }
        }
    }

    extractStrings(obj);
    return strings.length > 0 ? strings[0] : 'Complex data structure';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Error handling
window.addEventListener('error', function(event) {
    console.error('JavaScript error:', event.error);
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
});

// Display records in a container
function displayRecords(container, records, namespace, title = 'Memory Records') {
    if (!records || records.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-info-circle me-2"></i>
                No records found in namespace: <code>${namespace}</code>
            </div>
        `;
        return;
    }

    // Clear and store records data for modal viewing and deletion
    currentRecordsData = {};
    records.forEach(record => {
        const recordId = record.recordId || record.memoryRecordId;
        if (recordId) {
            currentRecordsData[recordId] = {
                ...record,
                namespace: namespace
            };
        }
    });

    let html = `
        <div class="mb-3">
            <h6>${title}</h6>
            <small class="text-muted">Namespace: <code>${namespace}</code> • Found ${records.length} record(s)</small>
        </div>
        <div class="table-responsive">
            <table class="table table-striped table-sm">
                <thead>
                    <tr>
                        <th>Record ID</th>
                        <th>Strategy</th>
                        <th>Created</th>
                        <th>Content</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    records.forEach((record, index) => {
        const recordId = record.recordId || record.memoryRecordId || 'N/A';
        const strategyId = record.memoryStrategyId || 'N/A';
        const created = formatDate(record.createdAt);
        const hasContent = record.content && Object.keys(record.content).length > 0;
        const hasMetadata = record.metadata && Object.keys(record.metadata).length > 0;

        // Generate content preview
        const contentPreview = generateContentPreview(record.content, record.metadata);

        html += `
            <tr data-record-id="${recordId}">
                <td><code class="small">${recordId}</code></td>
                <td><small>${strategyId}</small></td>
                <td><small>${created}</small></td>
                <td style="max-width: 300px;">
                    ${contentPreview}
                </td>
                <td>
                    <button class="btn btn-outline-primary btn-sm view-json-btn me-1"
                            data-item-type="record"
                            data-item-id="${recordId}"
                            title="View details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm delete-btn"
                            data-item-type="record"
                            data-item-id="${recordId}"
                            title="Delete record">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// Show record JSON in modal
function showRecordJson(recordId) {
    if (!currentRecordsData[recordId]) {
        console.error('Record not found:', recordId);
        return;
    }

    const record = currentRecordsData[recordId];
    showJsonModal(`Memory Record: ${recordId}`, record);
}