// Upload functionality for mushroom images
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const chooseFileBtn = document.getElementById('choose-file-btn');
    
    if (!fileInput || !uploadArea) return;
    
    fileInput.addEventListener('change', handleFileSelect);
    
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    if (chooseFileBtn) {
        chooseFileBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            fileInput.click();
        });
    }
    
    uploadArea.addEventListener('click', function(event) {
        if (!event.target.closest('.upload-btn')) {
            fileInput.click();
        }
    });

    // Initialize the table on load
    loadRecentScans();
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) processFile(file);
}

function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
            document.getElementById('file-input').files = files;
            processFile(file);
        } else {
            showToast('Please select a valid image file', 'error');
        }
    }
}

function processFile(file) {
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
    }
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }
    
    showLoadingState();
    const formData = new FormData();
    formData.append('file', file);
    
    // We pass the original file so we can show a preview immediately
    uploadFile(formData, file);
}

function showLoadingState() {
    const uploadProgress = document.getElementById('upload-progress');
    const loadingOverlay = document.getElementById('loading-overlay');
    if (uploadProgress) {
        uploadProgress.style.display = 'block';
        animateProgress();
    }
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
}

function hideLoadingState() {
    const uploadProgress = document.getElementById('upload-progress');
    const loadingOverlay = document.getElementById('loading-overlay');
    if (uploadProgress) uploadProgress.style.display = 'none';
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}

function animateProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (!progressFill || !progressText) return;
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 90) {
            progress = 90;
            clearInterval(interval);
        }
        progressFill.style.width = progress + '%';
        progressText.textContent = `Processing... ${Math.round(progress)}%`;
    }, 200);
}

function uploadFile(formData, originalFile) {
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        // Pass the original file to use for local preview
        handleUploadSuccess(data, originalFile);
    })
    .catch(error => {
        console.error('Upload error:', error);
        handleUploadError(error);
    })
    .finally(() => {
        hideLoadingState();
        completeProgress();
    });
}

function completeProgress() {
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    if (progressFill && progressText) {
        progressFill.style.width = '100%';
        progressText.textContent = 'Complete!';
    }
}

function handleUploadSuccess(data, originalFile) {
    // 1. Update statistics
    updateStatCard('ready-count', data.ready);
    updateStatCard('not-ready-count', data.notReady);
    updateStatCard('overdue-count', data.overdue);
    
    // 2. Display images (Using the new Base64 key)
    const originalImageUrl = URL.createObjectURL(originalFile);
    const processedImageUrl = data.processed_image; // This matches your Python 'processed_image'
    
    displayImages(originalImageUrl, processedImageUrl);
    
    // 3. Save scan data for history
    const scanData = {
        ready: data.ready,
        notReady: data.notReady,
        overdue: data.overdue,
        totalMushrooms: data.totalMushrooms,
        originalImageUrl: originalImageUrl,
        processedImageUrl: processedImageUrl,
        timestamp: new Date().toLocaleString()
    };
    
    // Logic for saving to localStorage (Assuming these helper functions exist)
    if (typeof saveScan === 'function') saveScan(scanData);
    if (typeof updateStatistics === 'function') updateStatistics(scanData);
    
    loadRecentScans();
    showToast(`Analysis complete! Found ${data.totalMushrooms} mushroom(s)`, 'success');
}

function displayImages(originalUrl, processedUrl) {
    const imageDisplay = document.getElementById('image-display');
    const originalImgElement = document.getElementById('original-image');
    const processedImgElement = document.getElementById('processed-image');
    
    if (!imageDisplay || !originalImgElement || !processedImgElement) return;
    
    originalImgElement.src = originalUrl;
    processedImgElement.src = processedUrl;
    
    imageDisplay.style.display = 'block';
    imageDisplay.classList.add('slide-up');
}

function handleUploadError(error) {
    showToast('Analysis failed. Please try a different image.', 'error');
}

// Helper to update the card numbers
function updateStatCard(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerText = value || 0;
}

// Simple Toast function if not defined elsewhere
function showToast(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // If you have a toast library or UI element, trigger it here
    alert(message); 
}

// Placeholder for History - Replace with your actual local storage logic
function loadRecentScans() {
    const tbody = document.getElementById('recent-scans-body');
    if (!tbody) return;
    // Example logic:
    // const scans = JSON.parse(localStorage.getItem('mushroom_scans') || '[]');
    // render scans...
}
