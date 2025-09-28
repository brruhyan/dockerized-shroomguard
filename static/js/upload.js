// Upload functionality for mushroom images
document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('file-input');
    const uploadArea = document.getElementById('upload-area');
    const chooseFileBtn = document.getElementById('choose-file-btn');
    const uploadProgress = document.getElementById('upload-progress');
    const imageDisplay = document.getElementById('image-display');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (!fileInput || !uploadArea) return;
    
    // File input change handler
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop handlers
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Click handler for the choose file button
    if (chooseFileBtn) {
        chooseFileBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            fileInput.click();
        });
    }
    
    // Click handler for upload area (but not on the button)
    uploadArea.addEventListener('click', function(event) {
        // Only trigger if we didn't click on the button
        if (!event.target.closest('.upload-btn')) {
            fileInput.click();
        }
    });
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processFile(file);
    }
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
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('Please select a valid image file', 'error');
        return;
    }
    
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showToast('File size must be less than 10MB', 'error');
        return;
    }
    
    // Show loading state
    showLoadingState();
    
    // Create FormData and upload
    const formData = new FormData();
    formData.append('file', file);
    
    // Simulate progress and upload
    uploadFile(formData);
}

function showLoadingState() {
    const uploadProgress = document.getElementById('upload-progress');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (uploadProgress) {
        uploadProgress.style.display = 'block';
        animateProgress();
    }
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

function hideLoadingState() {
    const uploadProgress = document.getElementById('upload-progress');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if (uploadProgress) {
        uploadProgress.style.display = 'none';
    }
    
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
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

function uploadFile(formData) {
    fetch('/upload', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        handleUploadSuccess(data);
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
        
        setTimeout(() => {
            const uploadProgress = document.getElementById('upload-progress');
            if (uploadProgress) {
                uploadProgress.style.display = 'none';
            }
        }, 1000);
    }
}

function handleUploadSuccess(data) {
    // Update statistics in the UI
    updateStatCard('ready-count', data.ready);
    updateStatCard('not-ready-count', data.notReady);
    updateStatCard('overdue-count', data.overdue);
    
    // Display images
    displayImages(data);
    
    // Save scan data
    const scanData = {
        ready: data.ready,
        notReady: data.notReady,
        overdue: data.overdue,
        totalMushrooms: data.totalMushrooms,
        originalImageUrl: data.original_image_url,
        processedImageUrl: data.processed_image_url
    };
    
    // Save to localStorage and update statistics
    const savedScan = saveScan(scanData);
    updateStatistics(scanData);
    
    // Reload recent scans table
    loadRecentScans();
    
    // Show success message
    showToast(`Analysis complete! Found ${data.totalMushrooms} mushroom(s)`, 'success');
    
    // Add slide-up animation to new content
    const imageDisplay = document.getElementById('image-display');
    if (imageDisplay) {
        imageDisplay.classList.add('slide-up');
    }
}

function handleUploadError(error) {
    console.error('Upload failed:', error);
    showToast('Upload failed. Please try again.', 'error');
    
    // Reset file input
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.value = '';
    }
}

function displayImages(data) {
    const imageDisplay = document.getElementById('image-display');
    const originalImage = document.getElementById('original-image');
    const processedImage = document.getElementById('processed-image');
    
    if (!imageDisplay || !originalImage || !processedImage) return;
    
    // Set image sources
    originalImage.src = data.original_image_url;
    originalImage.alt = 'Original uploaded image';
    
    processedImage.src = data.processed_image_url;
    processedImage.alt = 'Processed image with predictions';
    
    // Show the image display section
    imageDisplay.style.display = 'block';
    
    // Add error handlers for images
    originalImage.onerror = function() {
        this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="200" y="150" text-anchor="middle" fill="%23666">Image not available</text></svg>';
    };
    
    processedImage.onerror = function() {
        this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23f3f4f6"/><text x="200" y="150" text-anchor="middle" fill="%23666">Processed image not available</text></svg>';
    };
}

// Helper function to reset upload area
function resetUploadArea() {
    const fileInput = document.getElementById('file-input');
    const imageDisplay = document.getElementById('image-display');
    const uploadProgress = document.getElementById('upload-progress');
    
    if (fileInput) {
        fileInput.value = '';
    }
    
    if (imageDisplay) {
        imageDisplay.style.display = 'none';
    }
    
    if (uploadProgress) {
        uploadProgress.style.display = 'none';
    }
}

// Add keyboard support for accessibility
document.addEventListener('keydown', function(event) {
    const uploadArea = document.getElementById('upload-area');
    if (event.target === uploadArea && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        document.getElementById('file-input').click();
    }
});

// Make upload area focusable for accessibility
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('upload-area');
    if (uploadArea) {
        uploadArea.setAttribute('tabindex', '0');
        uploadArea.setAttribute('role', 'button');
        uploadArea.setAttribute('aria-label', 'Click to upload mushroom image');
    }
});
