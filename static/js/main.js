// Main JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Update current date
    updateCurrentDate();
    
    // Load saved statistics
    loadStatistics();
    
    // Load recent scans
    loadRecentScans();
});

function updateCurrentDate() {
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        dateElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function loadStatistics() {
    const stats = getSavedStatistics();
    
    // Update stat cards
    updateStatCard('ready-count', stats.ready);
    updateStatCard('not-ready-count', stats.notReady);
    updateStatCard('overdue-count', stats.overdue);
    
    // Update history page stats if on history page
    updateStatCard('total-scans', stats.totalScans);
    updateStatCard('total-mushrooms', stats.totalMushrooms);
    updateStatCard('avg-per-scan', stats.avgPerScan);
}

function updateStatCard(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value || 0;
    }
}

function getSavedStatistics() {
    const defaultStats = {
        ready: 0,
        notReady: 0,
        overdue: 0,
        totalScans: 0,
        totalMushrooms: 0,
        avgPerScan: 0
    };
    
    try {
        const saved = localStorage.getItem('shroomguard_statistics');
        return saved ? JSON.parse(saved) : defaultStats;
    } catch (error) {
        console.error('Error loading statistics:', error);
        return defaultStats;
    }
}

function saveStatistics(stats) {
    try {
        localStorage.setItem('shroomguard_statistics', JSON.stringify(stats));
    } catch (error) {
        console.error('Error saving statistics:', error);
    }
}

function updateStatistics(newData) {
    const currentStats = getSavedStatistics();
    
    // Update current counts
    currentStats.ready = newData.ready || 0;
    currentStats.notReady = newData.notReady || 0;
    currentStats.overdue = newData.overdue || 0;
    
    // Update totals
    currentStats.totalScans += 1;
    currentStats.totalMushrooms = (currentStats.totalMushrooms || 0) + (newData.totalMushrooms || 0);
    currentStats.avgPerScan = currentStats.totalScans > 0 ? 
        Math.round(currentStats.totalMushrooms / currentStats.totalScans * 10) / 10 : 0;
    
    saveStatistics(currentStats);
    loadStatistics();
}

function loadRecentScans() {
    const tableBody = document.getElementById('recent-scans-body');
    if (!tableBody) return;
    
    const scans = getSavedScans();
    const recentScans = scans.slice(-5).reverse(); // Get last 5 scans
    
    tableBody.innerHTML = '';
    
    if (recentScans.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: #6b7280; padding: 40px;">
                    <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                    No scans yet. Upload your first mushroom image to get started!
                </td>
            </tr>
        `;
        return;
    }
    
    recentScans.forEach(scan => {
        const row = createScanTableRow(scan);
        tableBody.appendChild(row);
    });
}

function createScanTableRow(scan) {
    const row = document.createElement('tr');
    const total = scan.ready + scan.notReady + scan.overdue;
    
    row.innerHTML = `
        <td>${formatDateTime(scan.timestamp)}</td>
        <td><span class="count-badge ready">${scan.ready}</span></td>
        <td><span class="count-badge not-ready">${scan.notReady}</span></td>
        <td><span class="count-badge overdue">${scan.overdue}</span></td>
        <td><span class="count-badge total">${total}</span></td>
        <td>
            <button class="action-btn view" onclick="viewScanImages('${scan.id}')">
                <i class="fas fa-eye"></i> View
            </button>
        </td>
    `;
    
    return row;
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getSavedScans() {
    try {
        const saved = localStorage.getItem('shroomguard_scans');
        return saved ? JSON.parse(saved) : [];
    } catch (error) {
        console.error('Error loading scans:', error);
        return [];
    }
}

function saveScan(scanData) {
    try {
        const scans = getSavedScans();
        const newScan = {
            id: 'scan_' + Date.now(),
            timestamp: Date.now(),
            ...scanData
        };
        scans.push(newScan);
        localStorage.setItem('shroomguard_scans', JSON.stringify(scans));
        return newScan;
    } catch (error) {
        console.error('Error saving scan:', error);
        return null;
    }
}

function viewScanImages(scanId) {
    const scans = getSavedScans();
    const scan = scans.find(s => s.id === scanId);
    
    if (!scan) {
        showToast('Scan not found', 'error');
        return;
    }
    
    // If we have a modal on the page, show it
    const modal = document.getElementById('image-modal');
    if (modal) {
        const originalImg = document.getElementById('modal-original');
        const processedImg = document.getElementById('modal-processed');
        
        if (originalImg && processedImg) {
            originalImg.src = scan.originalImageUrl || '';
            processedImg.src = scan.processedImageUrl || '';
            modal.style.display = 'flex';
        }
    }
}

function closeModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function showToast(message, type = 'success') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'exclamation-triangle'}"></i>
        ${message}
    `;
    
    document.body.appendChild(toast);
    
    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('image-modal');
    if (modal && event.target === modal) {
        closeModal();
    }
}

// Add animation classes to elements when they come into view
function addScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, observerOptions);
    
    // Observe all stat cards and major sections
    document.querySelectorAll('.stat-card, .upload-card, .image-card, .recent-scans').forEach(el => {
        observer.observe(el);
    });
}

// Initialize scroll animations when DOM is ready
document.addEventListener('DOMContentLoaded', addScrollAnimations);
