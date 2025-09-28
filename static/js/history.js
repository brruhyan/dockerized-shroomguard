// History page functionality
document.addEventListener('DOMContentLoaded', function() {
    loadHistoryData();
    setupHistoryFilters();
});

function loadHistoryData() {
    const scans = getSavedScans();
    
    // Update summary statistics
    updateHistoryStatistics(scans);
    
    // Populate history table
    populateHistoryTable(scans);
}

function updateHistoryStatistics(scans) {
    const totalScans = scans.length;
    const totalMushrooms = scans.reduce((sum, scan) => sum + (scan.ready + scan.notReady + scan.overdue), 0);
    const avgPerScan = totalScans > 0 ? Math.round((totalMushrooms / totalScans) * 10) / 10 : 0;
    
    updateStatCard('total-scans', totalScans);
    updateStatCard('total-mushrooms', totalMushrooms);
    updateStatCard('avg-per-scan', avgPerScan);
}

function populateHistoryTable(scans) {
    const tableBody = document.getElementById('history-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (scans.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #6b7280; padding: 40px;">
                    <i class="fas fa-history" style="font-size: 48px; margin-bottom: 10px; display: block;"></i>
                    No scan history available. Start by uploading your first mushroom image!
                </td>
            </tr>
        `;
        return;
    }
    
    // Sort scans by timestamp (newest first)
    const sortedScans = [...scans].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedScans.forEach(scan => {
        const row = createHistoryTableRow(scan);
        tableBody.appendChild(row);
    });
}

function createHistoryTableRow(scan) {
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
                <i class="fas fa-eye"></i>
            </button>
        </td>
        <td>
            <button class="action-btn view" onclick="viewScanImages('${scan.id}')">
                <i class="fas fa-images"></i> View
            </button>
            <button class="action-btn delete" onclick="deleteScan('${scan.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </td>
    `;
    
    // Add data attributes for filtering
    row.setAttribute('data-timestamp', scan.timestamp);
    row.setAttribute('data-ready', scan.ready);
    row.setAttribute('data-not-ready', scan.notReady);
    row.setAttribute('data-overdue', scan.overdue);
    row.setAttribute('data-total', total);
    
    return row;
}

function setupHistoryFilters() {
    const dateFilter = document.getElementById('date-filter');
    const classFilter = document.getElementById('class-filter');
    const searchInput = document.getElementById('search-input');
    
    if (dateFilter) {
        dateFilter.addEventListener('change', filterHistory);
    }
    
    if (classFilter) {
        classFilter.addEventListener('change', filterHistory);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', filterHistory);
    }
}

function filterHistory() {
    const dateFilter = document.getElementById('date-filter');
    const classFilter = document.getElementById('class-filter');
    const searchInput = document.getElementById('search-input');
    const tableRows = document.querySelectorAll('#history-table-body tr');
    
    const selectedDate = dateFilter ? dateFilter.value : '';
    const selectedClass = classFilter ? classFilter.value : '';
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    tableRows.forEach(row => {
        if (row.children.length === 1) return; // Skip empty state row
        
        let show = true;
        
        // Date filter
        if (selectedDate && show) {
            const rowTimestamp = parseInt(row.getAttribute('data-timestamp'));
            const rowDate = new Date(rowTimestamp);
            const filterDate = new Date(selectedDate);
            
            // Compare dates (ignoring time)
            const rowDateString = rowDate.toISOString().split('T')[0];
            const filterDateString = filterDate.toISOString().split('T')[0];
            
            show = rowDateString === filterDateString;
        }
        
        // Class filter
        if (selectedClass && show) {
            const ready = parseInt(row.getAttribute('data-ready'));
            const notReady = parseInt(row.getAttribute('data-not-ready'));
            const overdue = parseInt(row.getAttribute('data-overdue'));
            
            switch (selectedClass) {
                case 'ready':
                    show = ready > 0;
                    break;
                case 'not-ready':
                    show = notReady > 0;
                    break;
                case 'overdue':
                    show = overdue > 0;
                    break;
            }
        }
        
        // Search filter
        if (searchTerm && show) {
            const rowText = row.textContent.toLowerCase();
            show = rowText.includes(searchTerm);
        }
        
        row.style.display = show ? '' : 'none';
    });
}

function sortTable(columnIndex) {
    const table = document.getElementById('history-table-body').parentElement;
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr')).filter(row => row.children.length > 1);
    
    // Determine sort direction
    const header = table.querySelectorAll('th')[columnIndex];
    const currentDirection = header.getAttribute('data-sort-direction') || 'asc';
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    
    // Clear all sort indicators
    table.querySelectorAll('th').forEach(th => {
        th.removeAttribute('data-sort-direction');
        const icon = th.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-sort';
        }
    });
    
    // Set new sort indicator
    header.setAttribute('data-sort-direction', newDirection);
    const icon = header.querySelector('i');
    if (icon) {
        icon.className = `fas fa-sort-${newDirection === 'asc' ? 'up' : 'down'}`;
    }
    
    // Sort rows
    rows.sort((a, b) => {
        let aVal, bVal;
        
        switch (columnIndex) {
            case 0: // Date
                aVal = parseInt(a.getAttribute('data-timestamp'));
                bVal = parseInt(b.getAttribute('data-timestamp'));
                break;
            case 1: // Ready
                aVal = parseInt(a.getAttribute('data-ready'));
                bVal = parseInt(b.getAttribute('data-ready'));
                break;
            case 2: // Not Ready
                aVal = parseInt(a.getAttribute('data-not-ready'));
                bVal = parseInt(b.getAttribute('data-not-ready'));
                break;
            case 3: // Overdue
                aVal = parseInt(a.getAttribute('data-overdue'));
                bVal = parseInt(b.getAttribute('data-overdue'));
                break;
            case 4: // Total
                aVal = parseInt(a.getAttribute('data-total'));
                bVal = parseInt(b.getAttribute('data-total'));
                break;
            default:
                return 0;
        }
        
        if (newDirection === 'asc') {
            return aVal - bVal;
        } else {
            return bVal - aVal;
        }
    });
    
    // Re-append sorted rows
    rows.forEach(row => tbody.appendChild(row));
}

function deleteScan(scanId) {
    if (!confirm('Are you sure you want to delete this scan? This action cannot be undone.')) {
        return;
    }
    
    try {
        const scans = getSavedScans();
        const filteredScans = scans.filter(scan => scan.id !== scanId);
        localStorage.setItem('shroomguard_scans', JSON.stringify(filteredScans));
        
        // Reload the page data
        loadHistoryData();
        
        // Update main statistics
        const stats = getSavedStatistics();
        stats.totalScans = filteredScans.length;
        stats.totalMushrooms = filteredScans.reduce((sum, scan) => sum + (scan.ready + scan.notReady + scan.overdue), 0);
        stats.avgPerScan = stats.totalScans > 0 ? Math.round((stats.totalMushrooms / stats.totalScans) * 10) / 10 : 0;
        saveStatistics(stats);
        
        showToast('Scan deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting scan:', error);
        showToast('Failed to delete scan', 'error');
    }
}

function exportHistory() {
    const scans = getSavedScans();
    
    if (scans.length === 0) {
        showToast('No scan history to export', 'warning');
        return;
    }
    
    // Create CSV content
    const csvHeader = 'Date,Time,Ready,Not Ready,Overdue,Total\n';
    const csvRows = scans.map(scan => {
        const date = new Date(scan.timestamp);
        const dateStr = date.toLocaleDateString('en-US');
        const timeStr = date.toLocaleTimeString('en-US');
        const total = scan.ready + scan.notReady + scan.overdue;
        
        return `"${dateStr}","${timeStr}",${scan.ready},${scan.notReady},${scan.overdue},${total}`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `shroomguard_history_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('History exported successfully', 'success');
}

function clearHistory() {
    if (!confirm('Are you sure you want to clear all scan history? This action cannot be undone.')) {
        return;
    }
    
    try {
        localStorage.removeItem('shroomguard_scans');
        
        // Reset statistics
        const defaultStats = {
            ready: 0,
            notReady: 0,
            overdue: 0,
            totalScans: 0,
            totalMushrooms: 0,
            avgPerScan: 0
        };
        saveStatistics(defaultStats);
        
        // Reload the page
        loadHistoryData();
        
        showToast('History cleared successfully', 'success');
    } catch (error) {
        console.error('Error clearing history:', error);
        showToast('Failed to clear history', 'error');
    }
}

// Initialize table sorting
document.addEventListener('DOMContentLoaded', function() {
    // Add sort indicators to table headers
    const headers = document.querySelectorAll('.history-table th[onclick]');
    headers.forEach(header => {
        const icon = header.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-sort';
        }
    });
});
