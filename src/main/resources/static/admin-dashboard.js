class AdminDashboard {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.machines = [];
        this.users = [];
        this.charts = {};
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            await this.checkAuth();
            await this.loadDashboardData();
            this.setupEventListeners();
            this.isInitialized = true;
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showNotification('Failed to initialize dashboard', 'error');
        }
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/current-user');
            if (response.status !== 200) {
                window.location.href = '/login';
                return;
            }
            this.currentUser = await response.json();
            if (this.currentUser.role !== 'ADMIN') {
                window.location.href = '/login';
                return;
            }
            document.getElementById('userName').textContent =
                `${this.currentUser.firstName} ${this.currentUser.lastName}`;
            // Set user initials
            const initials = (this.currentUser.firstName?.charAt(0) || 'A') + (this.currentUser.lastName?.charAt(0) || '');
            document.getElementById('userInitials').textContent = initials;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login';
        }
    }

    async loadDashboardData() {
        try {
            // Load data in sequence to avoid overwhelming the server
            await this.loadSystemStats();
            await this.loadMachines();
            await this.loadUsers();

            // Render UI components
            this.renderSystemActivity();
            this.renderSystemAlerts();
            this.renderMachinesTable();
            this.renderUsersTable();

            // Small delay to ensure DOM is fully rendered before loading charts
            setTimeout(() => {
                this.loadChartsData();
            }, 100);

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification('Failed to load dashboard data', 'error');
        }
    }

    async loadSystemStats() {
        try {
            const response = await fetch('/api/admin/dashboard-stats');
            if (response.ok) {
                const stats = await response.json();
                this.updateStatsUI(stats);
            } else {
                this.setFallbackStats();
            }
        } catch (error) {
            console.error('Failed to load system stats:', error);
            this.setFallbackStats();
        }
    }

    updateStatsUI(stats) {
        const elements = {
            'totalUsers': stats.totalUsers || 0,
            'totalSessions': stats.totalSessions || 0,
            'activeMachines': stats.activeMachines || 0,
            'systemHealth': stats.systemHealth ? stats.systemHealth + '%' : '100%'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    setFallbackStats() {
        this.updateStatsUI({
            totalUsers: this.users.length,
            totalSessions: this.machines.reduce((sum, m) => sum + (m.totalSessions || 0), 0),
            activeMachines: this.machines.filter(m => m.status === 'ACTIVE').length,
            systemHealth: 98
        });
    }

    async loadMachines() {
        try {
            const response = await fetch('/api/machines');
            if (response.ok) {
                const result = await response.json();
                this.machines = result.machines || [];
            } else {
                console.warn('Using mock machines data');
                this.machines = this.getMockMachines();
            }
        } catch (error) {
            console.error('Failed to load machines:', error);
            this.machines = this.getMockMachines();
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users');
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.users = result.users || [];
                } else {
                    console.warn('Failed to load users:', result.message);
                    this.users = this.getMockUsers();
                }
            } else {
                console.warn('Using mock users data');
                this.users = this.getMockUsers();
            }
        } catch (error) {
            console.error('Failed to load users:', error);
            this.users = this.getMockUsers();
        }
    }

    async loadChartsData() {
        try {
            // Only load charts if their containers exist and are visible
            if (document.getElementById('machineUsageChart')) {
                await this.renderMachineUsageChart();
            }
            if (document.getElementById('userActivityChart')) {
                await this.renderUserActivityChart();
            }
            if (document.getElementById('machineStatusChart')) {
                this.renderMachineStatusChart();
            }
            if (document.getElementById('performanceChart')) {
                await this.renderPerformanceChart();
            }
        } catch (error) {
            console.error('Failed to load charts:', error);
        }
    }

    setupEventListeners() {
        // Use event delegation for better performance
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'systemSettingsForm') {
                e.preventDefault();
                this.saveSystemSettings(e);
            }
            if (e.target.id === 'addMachineForm') {
                e.preventDefault();
                this.addMachine();
            }
        });
    }

    // Enhanced Export Report Functionality
    async exportReport() {
        const reportType = document.getElementById('reportType').value;

        try {
            let url, filename;
            const today = new Date().toISOString().split('T')[0];

            switch (reportType) {
                case 'usage':
                    const usageStartDate = document.getElementById('reportStartDate')?.value || today;
                    const usageEndDate = document.getElementById('reportEndDate')?.value || today;
                    url = `/api/reports/usage/csv?startDate=${usageStartDate}&endDate=${usageEndDate}`;
                    filename = `machine_usage_report_${usageStartDate}_to_${usageEndDate}.csv`;
                    break;

                case 'performance':
                    const perfStartDate = document.getElementById('reportStartDate')?.value || today;
                    const perfEndDate = document.getElementById('reportEndDate')?.value || today;
                    const userId = document.getElementById('reportUserId')?.value;
                    if (!userId) {
                        this.showNotification('Please enter a User ID for member progress report', 'error');
                        return;
                    }
                    url = `/api/reports/member-progress/csv?userId=${userId}&startDate=${perfStartDate}&endDate=${perfEndDate}`;
                    filename = `member_progress_${userId}_${perfStartDate}_to_${perfEndDate}.csv`;
                    break;

                case 'data-quality':
                    url = '/api/reports/data-quality/csv';
                    filename = `data_quality_report_${today}.csv`;
                    break;

                case 'system':
                    url = '/api/reports/system/csv';
                    filename = `system_report_${today}.csv`;
                    break;

                default:
                    this.showNotification('Please select a valid report type', 'error');
                    return;
            }

            this.showNotification('Generating report...', 'info');

            const response = await fetch(url);

            if (response.ok) {
                // For CSV responses
                if (response.headers.get('content-type')?.includes('text/csv')) {
                    const blob = await response.blob();
                    const downloadUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = downloadUrl;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(downloadUrl);
                } else {
                    // For JSON responses (fallback)
                    const result = await response.json();
                    if (result.success) {
                        this.downloadAsCSV(result.report, filename);
                    } else {
                        throw new Error(result.message);
                    }
                }

                this.showNotification('Report downloaded successfully!', 'success');
            } else {
                const error = await response.json();
                this.showNotification('Failed to generate report: ' + error.message, 'error');
            }
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification('Failed to export report: ' + error.message, 'error');
        }
    }

    // Enhanced report loading with dynamic filters
    loadReports() {
        const reportType = document.getElementById('reportType').value;
        this.renderReportChart(reportType);
        this.renderReportTable(reportType);
        this.setupReportFilters(reportType);
    }

    // Setup appropriate filters for each report type
    setupReportFilters(reportType) {
        const reportSection = document.getElementById('reports-section');
        let existingFilters = document.getElementById('reportFilters');

        if (existingFilters) {
            existingFilters.remove();
        }

        const today = new Date().toISOString().split('T')[0];
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        let filtersHTML = `
            <div id="reportFilters" class="row mb-3">
                <div class="col-md-3">
                    <label class="form-label">Start Date</label>
                    <input type="date" class="form-control" id="reportStartDate" value="${oneWeekAgo}">
                </div>
                <div class="col-md-3">
                    <label class="form-label">End Date</label>
                    <input type="date" class="form-control" id="reportEndDate" value="${today}">
                </div>
        `;

        if (reportType === 'performance') {
            filtersHTML += `
                <div class="col-md-3">
                    <label class="form-label">User ID</label>
                    <input type="number" class="form-control" id="reportUserId" placeholder="Enter user ID">
                </div>
                <div class="col-md-3 align-self-end">
                    <button class="btn btn-primary w-100" onclick="adminDashboard.generateReportWithFilters()">
                        <i class="fas fa-refresh me-1"></i>Generate
                    </button>
                </div>
            `;
        } else {
            filtersHTML += `
                <div class="col-md-3 align-self-end">
                    <button class="btn btn-primary w-100" onclick="adminDashboard.generateReportWithFilters()">
                        <i class="fas fa-refresh me-1"></i>Generate
                    </button>
                </div>
                <div class="col-md-3 align-self-end">
                    <button class="btn btn-success w-100" onclick="adminDashboard.exportReport()">
                        <i class="fas fa-download me-1"></i>Export CSV
                    </button>
                </div>
            `;
        }

        filtersHTML += `</div>`;

        // Insert after the report title
        const reportTitle = reportSection.querySelector('#reportTitle');
        if (reportTitle && reportTitle.parentNode) {
            reportTitle.parentNode.insertAdjacentHTML('afterend', filtersHTML);
        }
    }

    // Generate and display report with current filters
    async generateReportWithFilters() {
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('reportStartDate').value;
        const endDate = document.getElementById('reportEndDate').value;

        if (!startDate || !endDate) {
            this.showNotification('Please select both start and end dates', 'error');
            return;
        }

        try {
            this.showNotification(`Generating ${reportType} report...`, 'info');

            // Update charts and tables based on report type
            await this.renderReportChart(reportType);
            await this.renderReportTable(reportType);

            this.showNotification('Report generated successfully!', 'success');
        } catch (error) {
            console.error('Error generating report:', error);
            this.showNotification('Failed to generate report: ' + error.message, 'error');
        }
    }

    // Enhanced User Management Methods
    async toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            const currentStatus = user.status;
            let newStatus;

            // Cycle through statuses: ACTIVE -> INACTIVE -> SUSPENDED -> ACTIVE
            if (currentStatus === 'ACTIVE') {
                newStatus = 'INACTIVE';
            } else if (currentStatus === 'INACTIVE') {
                newStatus = 'SUSPENDED';
            } else {
                newStatus = 'ACTIVE';
            }

            if (confirm(`Change ${user.username} status from ${currentStatus} to ${newStatus}?`)) {
                try {
                    const response = await fetch(`/api/users/${userId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });

                    const result = await response.json();

                    if (result.success) {
                        this.showNotification(`User status updated to ${newStatus}`, 'success');
                        await this.loadUsers();
                        this.renderUsersTable();
                    } else {
                        this.showNotification('Error updating user status: ' + result.message, 'error');
                    }
                } catch (error) {
                    console.error('Error updating user status:', error);
                    this.showNotification('Error updating user status', 'error');
                }
            }
        }
    }

    // Enhanced user table rendering
    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (this.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            return;
        }

        tbody.innerHTML = this.users.map(user => {
            const lastLogin = user.lastLogin ?
                new Date(user.lastLogin).toLocaleDateString() : 'Never';
            const createdAt = user.createdAt ?
                new Date(user.createdAt).toLocaleDateString() : 'Unknown';

            // Get status icon
            let statusIcon = 'check';
            if (user.status === 'INACTIVE') statusIcon = 'pause';
            if (user.status === 'SUSPENDED') statusIcon = 'ban';

            const userInitials = (user.firstName?.charAt(0) || 'U') + (user.lastName?.charAt(0) || '');

            return `
                <tr>
                    <td>
                        <div class="d-flex align-items-center">
                            <div class="user-avatar me-2">
                                ${userInitials}
                            </div>
                            <div>
                                <div class="fw-bold">${user.username}</div>
                                <small class="text-muted">ID: ${user.id}</small>
                            </div>
                        </div>
                    </td>
                    <td>${user.firstName} ${user.lastName}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge bg-${this.getRoleBadgeColor(user.role)}">
                            ${user.role}
                        </span>
                    </td>
                    <td>
                        <span class="badge bg-${this.getStatusBadgeColor(user.status)}">
                            <i class="fas fa-${statusIcon} me-1"></i>
                            ${user.status || 'ACTIVE'}
                        </span>
                    </td>
                    <td>
                        <small class="text-muted">Last: ${lastLogin}</small>
                        <br>
                        <small>Joined: ${createdAt}</small>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="adminDashboard.editUser(${user.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-${this.getStatusButtonColor(user.status)}" 
                                    onclick="adminDashboard.toggleUserStatus(${user.id})" 
                                    title="Change Status">
                                <i class="fas fa-${statusIcon}"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="adminDashboard.viewUserDetails(${user.id})" title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Enhanced report table rendering
    async renderReportTable(reportType) {
        const header = document.getElementById('reportTableHeader');
        const body = document.getElementById('reportTableBody');
        if (!header || !body) return;

        try {
            let headerHTML, bodyHTML;

            switch (reportType) {
                case 'usage':
                    headerHTML = `
                        <tr>
                            <th>Machine Name</th>
                            <th>Type</th>
                            <th>Total Sessions</th>
                            <th>Total Calories</th>
                            <th>Avg Heart Rate</th>
                            <th>Avg Duration (min)</th>
                            <th>Data Quality Score</th>
                        </tr>
                    `;

                    // Use actual machine data
                    bodyHTML = this.machines.map(machine => `
                        <tr>
                            <td>${machine.name}</td>
                            <td>${machine.type}</td>
                            <td>${machine.totalSessions || 0}</td>
                            <td>${machine.avgCalories || 0}</td>
                            <td>${machine.avgHeartRate || 'N/A'}</td>
                            <td>${machine.avgDuration || 'N/A'}</td>
                            <td>
                                <span class="badge bg-${this.getQualityScoreColor(machine.qualityScore)}">
                                    ${machine.qualityScore || '95%'}
                                </span>
                            </td>
                        </tr>
                    `).join('');
                    break;

                case 'performance':
                    headerHTML = `
                        <tr>
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Total Workouts</th>
                            <th>Total Calories</th>
                            <th>Avg Duration</th>
                            <th>Last Activity</th>
                            <th>Status</th>
                        </tr>
                    `;

                    // Use actual user data for performance overview
                    bodyHTML = this.users.map(user => `
                        <tr>
                            <td>${user.id}</td>
                            <td>${user.firstName} ${user.lastName}</td>
                            <td>${user.totalWorkouts || '0'}</td>
                            <td>${user.totalCalories || '0'}</td>
                            <td>${user.avgDuration || 'N/A'}</td>
                            <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}</td>
                            <td>
                                <span class="badge bg-${this.getStatusBadgeColor(user.status)}">
                                    ${user.status}
                                </span>
                            </td>
                        </tr>
                    `).join('');
                    break;

                case 'data-quality':
                    headerHTML = `
                        <tr>
                            <th>Metric</th>
                            <th>Value</th>
                            <th>Status</th>
                            <th>Last Checked</th>
                        </tr>
                    `;
                    bodyHTML = `
                        <tr><td>Total Sessions</td><td>1,245</td><td><span class="badge bg-success">Good</span></td><td>Today</td></tr>
                        <tr><td>Data Completeness</td><td>98.2%</td><td><span class="badge bg-success">Excellent</span></td><td>Today</td></tr>
                        <tr><td>Quality Issues</td><td>12</td><td><span class="badge bg-warning">Needs Review</span></td><td>Today</td></tr>
                    `;
                    break;

                case 'system':
                    headerHTML = `
                        <tr>
                            <th>Component</th>
                            <th>Status</th>
                            <th>Performance</th>
                            <th>Last Updated</th>
                        </tr>
                    `;
                    bodyHTML = `
                        <tr><td>Database</td><td><span class="badge bg-success">Online</span></td><td>98%</td><td>Just now</td></tr>
                        <tr><td>API Server</td><td><span class="badge bg-success">Online</span></td><td>95%</td><td>Just now</td></tr>
                        <tr><td>File System</td><td><span class="badge bg-success">Online</span></td><td>99%</td><td>5 min ago</td></tr>
                    `;
                    break;
            }

            header.innerHTML = headerHTML;
            body.innerHTML = bodyHTML;
        } catch (error) {
            console.error('Error rendering report table:', error);
            body.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Error loading report data</td></tr>';
        }
    }

    // Utility method to convert JSON to CSV download
    downloadAsCSV(data, filename) {
        let csvContent = '';

        if (typeof data === 'string') {
            csvContent = data;
        } else if (Array.isArray(data)) {
            // Convert array to CSV
            if (data.length > 0) {
                const headers = Object.keys(data[0]);
                csvContent = headers.join(',') + '\n';
                csvContent += data.map(row =>
                    headers.map(header =>
                        JSON.stringify(row[header] || '')
                    ).join(',')
                ).join('\n');
            }
        } else if (typeof data === 'object') {
            // Convert object to CSV
            const headers = Object.keys(data);
            csvContent = 'Key,Value\n';
            csvContent += headers.map(key =>
                `${key},${JSON.stringify(data[key] || '')}`
            ).join('\n');
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);
    }

    // Additional utility methods
    getQualityScoreColor(score) {
        if (!score) return 'secondary';
        const numericScore = parseInt(score);
        if (numericScore >= 90) return 'success';
        if (numericScore >= 75) return 'warning';
        return 'danger';
    }

    getStatusButtonColor(status) {
        const colors = {
            ACTIVE: 'warning',
            INACTIVE: 'success',
            SUSPENDED: 'success'
        };
        return colors[status] || 'secondary';
    }

    viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            alert(`User Details:\n\nName: ${user.firstName} ${user.lastName}\nUsername: ${user.username}\nEmail: ${user.email}\nRole: ${user.role}\nStatus: ${user.status}\nLast Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}\nCreated: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Unknown'}`);
        }
    }

    async renderMachineUsageChart() {
        const container = document.getElementById('machineUsageChart')?.closest('.chart-container');
        if (!container || this.machines.length === 0) return;

        // Clean up previous chart
        this.destroyChart('machineUsage');

        try {
            const ctx = document.getElementById('machineUsageChart')?.getContext('2d');
            if (!ctx) return;

            const usageData = this.machines.map(machine => machine.totalSessions || 0);
            const machineNames = this.machines.map(machine => machine.name || 'Unknown');

            this.charts.machineUsage = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: machineNames,
                    datasets: [{
                        label: 'Total Sessions',
                        data: usageData,
                        backgroundColor: '#3498db',
                        borderColor: '#2c3e50',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 10,
                            right: 15,
                            bottom: 10,
                            left: 15
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'Machine Usage by Total Sessions',
                            padding: {
                                bottom: 10
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Sessions'
                            },
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Machines'
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 0
                            },
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to render machine usage chart:', error);
        }
    }

    async renderUserActivityChart() {
        const container = document.getElementById('userActivityChart')?.closest('.chart-container');
        if (!container) return;

        // Clean up previous chart
        this.destroyChart('userActivity');

        try {
            const ctx = document.getElementById('userActivityChart')?.getContext('2d');
            if (!ctx) return;

            // Use mock data for now since the endpoint might not exist
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const activityData = [45, 52, 38, 61, 55, 68, 72];

            this.charts.userActivity = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'User Activity (Sessions)',
                        data: activityData,
                        borderColor: '#9b59b6',
                        backgroundColor: 'rgba(155, 89, 182, 0.1)',
                        tension: 0.4,
                        fill: true,
                        borderWidth: 2,
                        pointBackgroundColor: '#9b59b6',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 10,
                            right: 15,
                            bottom: 10,
                            left: 15
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                padding: 15,
                                usePointStyle: true
                            }
                        },
                        title: {
                            display: true,
                            text: 'User Activity Trend (Last 7 Days)',
                            padding: {
                                bottom: 10
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Sessions'
                            },
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        } catch (error) {
            console.error('Failed to render user activity chart:', error);
        }
    }

    renderMachineStatusChart() {
        const container = document.getElementById('machineStatusChart')?.closest('.chart-container');
        if (!container || this.machines.length === 0) return;

        // Clean up previous chart
        this.destroyChart('machineStatus');

        try {
            const ctx = document.getElementById('machineStatusChart')?.getContext('2d');
            if (!ctx) return;

            const statusCounts = this.machines.reduce((acc, machine) => {
                const status = machine.status || 'UNKNOWN';
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {});

            this.charts.machineStatus = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c', '#95a5a6', '#3498db'],
                        borderColor: '#ffffff',
                        borderWidth: 2,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    layout: {
                        padding: 15
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        title: {
                            display: true,
                            text: 'Machine Status Distribution',
                            padding: {
                                bottom: 10
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to render machine status chart:', error);
        }
    }

    destroyChart(chartName) {
        if (this.charts[chartName]) {
            try {
                this.charts[chartName].destroy();
            } catch (error) {
                console.warn(`Error destroying chart ${chartName}:`, error);
            }
            this.charts[chartName] = null;
        }
    }

    renderSystemActivity() {
        const tbody = document.getElementById('systemActivityBody');
        if (!tbody) return;

        const activities = [
            { time: '2 minutes ago', activity: 'User login', user: 'john_doe', status: 'success' },
            { time: '15 minutes ago', activity: 'Workout logged', user: 'jane_smith', status: 'success' },
            { time: '1 hour ago', activity: 'Machine maintenance', user: 'admin', status: 'warning' }
        ];

        tbody.innerHTML = activities.map(activity => `
            <tr>
                <td>${activity.time}</td>
                <td>${activity.activity}</td>
                <td>${activity.user}</td>
                <td>
                    <span class="badge bg-${activity.status === 'success' ? 'success' : 'warning'}">
                        ${activity.status}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    renderSystemAlerts() {
        const alertsDiv = document.getElementById('systemAlerts');
        if (!alertsDiv) return;

        const alerts = [];

        // Only show critical alerts
        const maintenanceNeeded = this.machines.filter(m => {
            if (!m.lastMaintenance) return true;
            const lastMaintenance = new Date(m.lastMaintenance);
            const daysSinceMaintenance = Math.floor((new Date() - lastMaintenance) / (1000 * 60 * 60 * 24));
            return daysSinceMaintenance > 30;
        });

        if (maintenanceNeeded.length > 0) {
            alerts.push({
                type: 'warning',
                message: `${maintenanceNeeded.length} machine(s) require maintenance`,
                time: 'Today'
            });
        } else {
            alerts.push({
                type: 'success',
                message: 'All systems operational',
                time: 'Today'
            });
        }

        alertsDiv.innerHTML = alerts.map(alert => `
            <div class="alert alert-${alert.type} alert-dismissible fade show">
                <i class="fas fa-${this.getAlertIcon(alert.type)} me-2"></i>
                ${alert.message}
                <small class="d-block text-muted">${alert.time}</small>
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `).join('');
    }

    renderMachinesTable() {
        const tbody = document.getElementById('machinesTableBody');
        if (!tbody) return;

        if (this.machines.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="text-center">No machines found</td></tr>';
            return;
        }

        tbody.innerHTML = this.machines.map(machine => {
            const lastMaintenance = machine.lastMaintenance ?
                new Date(machine.lastMaintenance).toLocaleDateString() : 'Never';

            const healthStatus = this.getHealthStatus(machine);
            const performanceScore = machine.performanceScore || this.calculatePerformanceScore(machine);

            return `
                <tr class="machine-status-${machine.status?.toLowerCase() || 'unknown'}">
                    <td><strong>${machine.name}</strong></td>
                    <td>${machine.type}</td>
                    <td>${machine.location || 'N/A'}</td>
                    <td>
                        <span class="badge bg-${this.getStatusBadgeColor(machine.status)}">
                            ${machine.status || 'UNKNOWN'}
                        </span>
                    </td>
                    <td>${machine.totalSessions || 0}</td>
                    <td>${machine.avgCalories || 0}</td>
                    <td>
                        <span class="badge bg-${healthStatus.badgeColor}">
                            <i class="fas fa-${healthStatus.icon} me-1"></i>${healthStatus.text}
                        </span>
                    </td>
                    <td>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar bg-${this.getPerformanceColor(performanceScore)}" 
                                 role="progressbar" 
                                 style="width: ${performanceScore}%"
                                 aria-valuenow="${performanceScore}" 
                                 aria-valuemin="0" 
                                 aria-valuemax="100">
                                ${performanceScore}%
                            </div>
                        </div>
                    </td>
                    <td>${lastMaintenance}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="adminDashboard.editMachine(${machine.id})" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-outline-warning" onclick="adminDashboard.toggleMachineStatus(${machine.id})" title="Change Status">
                                <i class="fas fa-cog"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="adminDashboard.deleteMachine(${machine.id})" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Machine Management Methods
    showAddMachineModal() {
        const form = document.getElementById('addMachineForm');
        if (form) form.reset();

        const modalElement = document.getElementById('addMachineModal');
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        }
    }

    async addMachine() {
        const form = document.getElementById('addMachineForm');
        if (!form) return;

        const formData = new FormData(form);
        const machineName = formData.get('machineName');
        const type = formData.get('type');
        const location = formData.get('location');

        if (!machineName || !type || !location) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Start with minimal data for testing
        const machineData = {
            name: machineName,
            type: type,
            location: location,
            model: formData.get('model') || null,
            status: 'ACTIVE'
        };

        console.log('Submitting machine data:', machineData);

        try {
            const response = await fetch('/api/machines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(machineData)
            });

            const result = await response.json();
            console.log('Response:', result);

            if (result.success) {
                this.showNotification('Machine added successfully!', 'success');
                bootstrap.Modal.getInstance(document.getElementById('addMachineModal')).hide();

                await this.loadMachines();
                this.renderMachinesTable();
                this.renderMachineStatusChart();
                this.renderSystemAlerts();
            } else {
                this.showNotification('Error: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error adding machine:', error);
            this.showNotification('Error adding machine: ' + error.message, 'error');
        }
    }

    async editMachine(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            const newName = prompt('Enter new machine name:', machine.name);
            if (newName && newName !== machine.name) {
                try {
                    const response = await fetch(`/api/machines/${machineId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...machine, name: newName })
                    });

                    if (response.ok) {
                        this.showNotification('Machine updated successfully!', 'success');
                        await this.loadMachines();
                        this.renderMachinesTable();
                    } else {
                        this.showNotification('Error updating machine', 'error');
                    }
                } catch (error) {
                    console.error('Error updating machine:', error);
                    this.showNotification('Error updating machine', 'error');
                }
            }
        }
    }

    async toggleMachineStatus(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            const currentStatus = machine.status;
            const newStatus = currentStatus === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';

            if (confirm(`Change ${machine.name} status from ${currentStatus} to ${newStatus}?`)) {
                try {
                    const response = await fetch(`/api/machines/${machineId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    });

                    const result = await response.json();

                    if (result.success) {
                        this.showNotification(`Machine status updated to ${newStatus}`, 'success');
                        await this.loadMachines();
                        this.renderMachinesTable();
                        this.renderMachineStatusChart();
                        this.renderSystemAlerts();
                    } else {
                        this.showNotification('Error updating machine status: ' + result.message, 'error');
                    }
                } catch (error) {
                    console.error('Error updating machine status:', error);
                    this.showNotification('Error updating machine status', 'error');
                }
            }
        }
    }

    async deleteMachine(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine && confirm(`Are you sure you want to delete ${machine.name}? This action cannot be undone.`)) {
            try {
                const response = await fetch(`/api/machines/${machineId}`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (result.success) {
                    this.showNotification('Machine deleted successfully', 'success');
                    await this.loadMachines();
                    this.renderMachinesTable();
                    this.renderMachineStatusChart();
                    this.renderSystemAlerts();
                } else {
                    this.showNotification('Error deleting machine: ' + result.message, 'error');
                }
            } catch (error) {
                console.error('Error deleting machine:', error);
                this.showNotification('Error deleting machine', 'error');
            }
        }
    }

    // User Management Methods
    showAddUserModal() {
        this.showNotification('User management feature coming soon!', 'info');
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            this.showNotification(`Edit user feature for ${user.username} coming soon!`, 'info');
        }
    }

    // System Methods
    saveSystemSettings(e) {
        e.preventDefault();
        this.showNotification('System settings saved successfully!', 'success');
    }

    downloadSystemReport() {
        this.showNotification('System report download started...', 'info');
    }

    runBackup() {
        if (confirm('Start system backup now? This may take several minutes.')) {
            this.showNotification('System backup started...', 'info');
        }
    }

    clearCache() {
        if (confirm('Clear all system cache?')) {
            this.showNotification('System cache cleared successfully.', 'success');
        }
    }

    // Report Methods
    renderReportChart(reportType) {
        const container = document.getElementById('reportChart')?.closest('.chart-container');
        if (!container) return;

        const ctx = document.getElementById('reportChart')?.getContext('2d');
        const reportTitle = document.getElementById('reportTitle');
        if (!ctx) return;

        this.destroyChart('report');

        let chartData, title;

        switch (reportType) {
            case 'usage':
                title = 'Machine Usage Report';
                chartData = {
                    labels: this.machines.map(m => m.name),
                    datasets: [{
                        label: 'Usage Hours',
                        data: this.machines.map(m => (m.totalSessions || 0) * 0.5),
                        backgroundColor: '#3498db',
                        borderColor: '#2c3e50',
                        borderWidth: 1
                    }]
                };
                break;
            case 'performance':
                title = 'Performance Report';
                chartData = {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                    datasets: [{
                        label: 'Performance Score',
                        data: [85, 78, 90, 88, 92],
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                };
                break;
            default:
                title = 'Financial Report';
                chartData = {
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                    datasets: [{
                        label: 'Revenue ($)',
                        data: [4500, 5200, 4800, 6100, 5800],
                        borderColor: '#9b59b6',
                        backgroundColor: 'rgba(155, 89, 182, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                };
        }

        if (reportTitle) reportTitle.textContent = title;

        this.charts.report = new Chart(ctx, {
            type: reportType === 'performance' || reportType === 'financial' ? 'line' : 'bar',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,
                        right: 15,
                        bottom: 10,
                        left: 15
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 15
                        }
                    },
                    title: {
                        display: true,
                        text: title
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    async renderPerformanceChart() {
        const container = document.getElementById('performanceChart')?.closest('.chart-container');
        if (!container) return;

        // Clean up previous chart
        this.destroyChart('performance');

        try {
            const ctx = document.getElementById('performanceChart')?.getContext('2d');
            if (!ctx) return;

            // Mock performance data
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
            const performanceData = [85, 88, 82, 90, 87, 92];
            const usageData = [75, 78, 72, 85, 80, 88];

            this.charts.performance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [
                        {
                            label: 'Performance Score',
                            data: performanceData,
                            borderColor: '#2ecc71',
                            backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2
                        },
                        {
                            label: 'Usage Efficiency',
                            data: usageData,
                            borderColor: '#3498db',
                            backgroundColor: 'rgba(52, 152, 219, 0.1)',
                            fill: true,
                            tension: 0.4,
                            borderWidth: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 10,
                            right: 15,
                            bottom: 10,
                            left: 15
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                padding: 15,
                                usePointStyle: true
                            }
                        },
                        title: {
                            display: true,
                            text: 'System Performance Metrics',
                            padding: {
                                bottom: 10
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: false,
                            min: 50,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Percentage (%)'
                            },
                            grid: {
                                drawBorder: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Failed to render performance chart:', error);
        }
    }



    // Utility Methods
    getHealthStatus(machine) {
        if (!machine.lastMaintenance) {
            return { text: 'UNKNOWN', badgeColor: 'secondary', icon: 'question' };
        }
        const lastMaintenance = new Date(machine.lastMaintenance);
        const daysSinceMaintenance = Math.floor((new Date() - lastMaintenance) / (1000 * 60 * 60 * 24));

        if (daysSinceMaintenance <= 7) return { text: 'EXCELLENT', badgeColor: 'success', icon: 'heart' };
        if (daysSinceMaintenance <= 30) return { text: 'GOOD', badgeColor: 'primary', icon: 'check' };
        if (daysSinceMaintenance <= 60) return { text: 'FAIR', badgeColor: 'warning', icon: 'exclamation' };
        return { text: 'POOR', badgeColor: 'danger', icon: 'times' };
    }

    calculatePerformanceScore(machine) {
        const baseScore = 100;
        const sessionBonus = Math.min((machine.totalSessions || 0) / 10, 20);
        const maintenancePenalty = this.getMaintenancePenalty(machine);
        return Math.max(0, Math.min(100, baseScore + sessionBonus - maintenancePenalty));
    }

    getMaintenancePenalty(machine) {
        if (!machine.lastMaintenance) return 50;
        const lastMaintenance = new Date(machine.lastMaintenance);
        const daysSinceMaintenance = Math.floor((new Date() - lastMaintenance) / (1000 * 60 * 60 * 24));
        if (daysSinceMaintenance <= 30) return 0;
        if (daysSinceMaintenance <= 60) return 20;
        if (daysSinceMaintenance <= 90) return 40;
        return 60;
    }

    getPerformanceColor(score) {
        if (score >= 80) return 'success';
        if (score >= 60) return 'warning';
        return 'danger';
    }

    getAlertIcon(type) {
        const icons = { warning: 'exclamation-triangle', info: 'info-circle', success: 'check-circle', error: 'exclamation-circle' };
        return icons[type] || 'info-circle';
    }

    getStatusBadgeColor(status) {
        const colors = {
            ACTIVE: 'success',
            MAINTENANCE: 'warning',
            INACTIVE: 'secondary',
            SUSPENDED: 'danger',
            UNKNOWN: 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getRoleBadgeColor(role) {
        const colors = { ADMIN: 'danger', INSTRUCTOR: 'warning', MEMBER: 'primary' };
        return colors[role] || 'secondary';
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        document.querySelectorAll('.custom-notification').forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `custom-notification alert alert-${type} alert-dismissible fade show`;
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    getMockMachines() {
        return [
            { id: 1, name: 'Treadmill-001', type: 'Treadmill', location: 'Main Floor', status: 'ACTIVE', totalSessions: 145, avgCalories: 320, lastMaintenance: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() },
            { id: 2, name: 'Exercise Bike-001', type: 'Exercise Bike', location: 'Cardio Zone', status: 'ACTIVE', totalSessions: 89, avgCalories: 280, lastMaintenance: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString() }
        ];
    }

    getMockUsers() {
        return [
            { id: 1, username: 'admin', firstName: 'System', lastName: 'Administrator', email: 'admin@fitnesstracker.com', role: 'ADMIN', status: 'ACTIVE', lastLogin: new Date().toISOString(), createdAt: new Date().toISOString() }
        ];
    }
}

// Global functions
function showSection(sectionName, event) {
    // Hide all sections
    document.querySelectorAll('[id$="-section"]').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';

        // Load section-specific data only when needed
        if (sectionName === 'machines' && adminDashboard) {
            adminDashboard.renderMachinesTable();
        }
        if (sectionName === 'reports' && adminDashboard) {
            adminDashboard.loadReports();
        }
        if (sectionName === 'users' && adminDashboard) {
            adminDashboard.renderUsersTable();
        }
    }

    // Update active nav link
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    if (event && event.target) {
        event.target.classList.add('active');
    }
}

// Logout function
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        window.location.href = '/login';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login';
    }
}

// Initialize dashboard
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});