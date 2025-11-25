class AdminDashboard {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.machines = [];
        this.users = [];
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadDashboardData();
        this.setupEventListeners();
        this.renderCharts();
    }

    async checkAuth() {
        const response = await fetch('/api/auth/current-user');
        if (response.status !== 200) {
            window.location.href = '/login.html';
            return;
        }
        this.currentUser = await response.json();
        if (this.currentUser.role !== 'ADMIN') {
            window.location.href = '/login.html';
            return;
        }
        document.getElementById('userName').textContent =
            `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }

    async loadDashboardData() {
        await this.loadSystemStats();
        await this.loadMachines();
        await this.loadUsers();
        this.renderSystemActivity();
        this.renderSystemAlerts();
        this.renderMachinesTable();
        this.renderUsersTable();
    }

    async loadSystemStats() {
        try {
            const response = await fetch('/api/admin/dashboard-stats');
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('totalUsers').textContent = stats.totalUsers || 0;
                document.getElementById('totalSessions').textContent = stats.totalSessions || 0;

                // For demo, we'll set some default values
                document.getElementById('activeMachines').textContent = this.machines.filter(m => m.status === 'ACTIVE').length;
                document.getElementById('systemHealth').textContent = '98%';
            }
        } catch (error) {
            console.error('Failed to load system stats:', error);
        }
    }

    async loadMachines() {
        try {
            // In a real app, you'd call an API
            this.machines = [
                {
                    id: 1,
                    name: 'Treadmill-001',
                    type: 'Treadmill',
                    location: 'Main Floor',
                    status: 'ACTIVE',
                    totalSessions: 145,
                    avgCalories: 320,
                    lastMaintenance: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                },
                {
                    id: 2,
                    name: 'Exercise Bike-001',
                    type: 'Exercise Bike',
                    location: 'Cardio Zone',
                    status: 'ACTIVE',
                    totalSessions: 89,
                    avgCalories: 280,
                    lastMaintenance: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
                },
                {
                    id: 3,
                    name: 'Elliptical-001',
                    type: 'Elliptical',
                    location: 'Main Floor',
                    status: 'MAINTENANCE',
                    totalSessions: 67,
                    avgCalories: 310,
                    lastMaintenance: new Date()
                },
                {
                    id: 4,
                    name: 'Rowing Machine-001',
                    type: 'Rowing Machine',
                    location: 'Strength Area',
                    status: 'INACTIVE',
                    totalSessions: 23,
                    avgCalories: 290,
                    lastMaintenance: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
                }
            ];
        } catch (error) {
            console.error('Failed to load machines:', error);
        }
    }

    async loadUsers() {
        try {
            // In a real app, you'd call an API
            this.users = [
                {
                    id: 1,
                    username: 'john_doe',
                    firstName: 'John',
                    lastName: 'Doe',
                    email: 'john.doe@email.com',
                    role: 'MEMBER',
                    status: 'ACTIVE',
                    lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000)
                },
                {
                    id: 2,
                    username: 'jane_smith',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    email: 'jane.smith@email.com',
                    role: 'MEMBER',
                    status: 'ACTIVE',
                    lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000)
                },
                {
                    id: 3,
                    username: 'instructor',
                    firstName: 'Fitness',
                    lastName: 'Instructor',
                    email: 'instructor@fitnesstracker.com',
                    role: 'INSTRUCTOR',
                    status: 'ACTIVE',
                    lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000)
                },
                {
                    id: 4,
                    username: 'mike_j',
                    firstName: 'Mike',
                    lastName: 'Johnson',
                    email: 'mike.j@email.com',
                    role: 'MEMBER',
                    status: 'INACTIVE',
                    lastLogin: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            ];
        } catch (error) {
            console.error('Failed to load users:', error);
        }
    }

    setupEventListeners() {
        const systemSettingsForm = document.getElementById('systemSettingsForm');
        if (systemSettingsForm) {
            systemSettingsForm.addEventListener('submit', (e) => this.saveSystemSettings(e));
        }
    }

    renderSystemActivity() {
        const tbody = document.getElementById('systemActivityBody');
        if (!tbody) return;

        const activities = [
            { time: '2 minutes ago', activity: 'User login', user: 'john_doe', status: 'success' },
            { time: '15 minutes ago', activity: 'Workout logged', user: 'jane_smith', status: 'success' },
            { time: '1 hour ago', activity: 'Machine maintenance', user: 'admin', status: 'warning' },
            { time: '2 hours ago', activity: 'System backup', user: 'system', status: 'success' },
            { time: '4 hours ago', activity: 'New user registration', user: 'system', status: 'success' }
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

        const alerts = [
            { type: 'warning', message: 'Elliptical-001 requires maintenance', time: '2 hours ago' },
            { type: 'info', message: 'System backup completed successfully', time: '3 hours ago' },
            { type: 'success', message: 'All systems operational', time: '1 day ago' }
        ];

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

        tbody.innerHTML = this.machines.map(machine => `
            <tr class="machine-status-${machine.status.toLowerCase()}">
                <td>${machine.name}</td>
                <td>${machine.type}</td>
                <td>${machine.location}</td>
                <td>
                    <span class="badge bg-${this.getStatusBadgeColor(machine.status)}">
                        ${machine.status}
                    </span>
                </td>
                <td>${machine.totalSessions}</td>
                <td>${machine.avgCalories}</td>
                <td>${machine.lastMaintenance.toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="adminDashboard.editMachine(${machine.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="adminDashboard.toggleMachineStatus(${machine.id})">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="adminDashboard.deleteMachine(${machine.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.users.map(user => `
            <tr>
                <td>${user.username}</td>
                <td>${user.firstName} ${user.lastName}</td>
                <td>${user.email}</td>
                <td>
                    <span class="badge bg-${this.getRoleBadgeColor(user.role)}">
                        ${user.role}
                    </span>
                </td>
                <td>
                    <span class="badge bg-${user.status === 'ACTIVE' ? 'success' : 'secondary'}">
                        ${user.status}
                    </span>
                </td>
                <td>${user.lastLogin.toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="adminDashboard.editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="adminDashboard.toggleUserStatus(${user.id})">
                        <i class="fas fa-user-cog"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-info" onclick="adminDashboard.resetPassword(${user.id})">
                        <i class="fas fa-key"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderCharts() {
        this.renderMachineUsageChart();
        this.renderUserActivityChart();
        this.renderPerformanceChart();
        this.renderMachineStatusChart();
    }

    renderMachineUsageChart() {
        const ctx = document.getElementById('machineUsageChart')?.getContext('2d');
        if (!ctx) return;

        const usageData = this.machines.map(machine => machine.totalSessions);
        const machineNames = this.machines.map(machine => machine.name);

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: machineNames,
                datasets: [{
                    label: 'Total Sessions',
                    data: usageData,
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#2ecc71', '#f39c12'
                    ]
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderUserActivityChart() {
        const ctx = document.getElementById('userActivityChart')?.getContext('2d');
        if (!ctx) return;

        // Simulate user activity data for the last 7 days
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const activityData = [45, 52, 38, 61, 55, 68, 72];

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: days,
                datasets: [{
                    label: 'User Activity',
                    data: activityData,
                    borderColor: '#9b59b6',
                    backgroundColor: 'rgba(155, 89, 182, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true
            }
        });
    }

    renderPerformanceChart() {
        const ctx = document.getElementById('performanceChart')?.getContext('2d');
        if (!ctx) return;

        const metrics = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
        const usage = [65, 75, 70, 80, 85];
        const efficiency = [75, 70, 80, 75, 90];
        const satisfaction = [80, 85, 75, 90, 85];

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: metrics,
                datasets: [
                    {
                        label: 'Usage %',
                        data: usage,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Efficiency %',
                        data: efficiency,
                        borderColor: '#2ecc71',
                        backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Satisfaction %',
                        data: satisfaction,
                        borderColor: '#9b59b6',
                        backgroundColor: 'rgba(155, 89, 182, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        min: 50,
                        max: 100
                    }
                }
            }
        });
    }

    renderMachineStatusChart() {
        const ctx = document.getElementById('machineStatusChart')?.getContext('2d');
        if (!ctx) return;

        const statusCounts = this.machines.reduce((acc, machine) => {
            acc[machine.status] = (acc[machine.status] || 0) + 1;
            return acc;
        }, {});

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    // Machine Management Methods
    showAddMachineModal() {
        new bootstrap.Modal(document.getElementById('addMachineModal')).show();
    }

    addMachine() {
        alert('Adding new machine... This would save to database in real application.');
        // Implementation would save the new machine
        bootstrap.Modal.getInstance(document.getElementById('addMachineModal')).hide();
    }

    editMachine(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            alert(`Editing machine: ${machine.name}`);
            // Implementation would open edit modal
        }
    }

    toggleMachineStatus(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine) {
            const newStatus = machine.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
            if (confirm(`Change ${machine.name} status to ${newStatus}?`)) {
                machine.status = newStatus;
                this.renderMachinesTable();
                this.renderMachineStatusChart();
                alert(`Machine status updated to ${newStatus}`);
            }
        }
    }

    deleteMachine(machineId) {
        const machine = this.machines.find(m => m.id === machineId);
        if (machine && confirm(`Are you sure you want to delete ${machine.name}?`)) {
            this.machines = this.machines.filter(m => m.id !== machineId);
            this.renderMachinesTable();
            this.renderMachineStatusChart();
            alert('Machine deleted successfully');
        }
    }

    // User Management Methods
    showAddUserModal() {
        alert('Opening add user modal...');
        // Implementation would show add user modal
    }

    editUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            alert(`Editing user: ${user.username}`);
            // Implementation would open edit modal
        }
    }

    toggleUserStatus(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
            if (confirm(`Change ${user.username} status to ${newStatus}?`)) {
                user.status = newStatus;
                this.renderUsersTable();
                alert(`User status updated to ${newStatus}`);
            }
        }
    }

    resetPassword(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user && confirm(`Reset password for ${user.username}?`)) {
            alert(`Password reset link sent to ${user.email}`);
        }
    }

    // Report Methods
    loadReports() {
        const reportType = document.getElementById('reportType').value;
        this.renderReportChart(reportType);
        this.renderReportTable(reportType);
    }

    renderReportChart(reportType) {
        const ctx = document.getElementById('reportChart')?.getContext('2d');
        const reportTitle = document.getElementById('reportTitle');
        if (!ctx) return;

        let chartData, title;

        switch (reportType) {
            case 'usage':
                title = 'Machine Usage Report';
                chartData = {
                    labels: this.machines.map(m => m.name),
                    datasets: [{
                        label: 'Usage Hours',
                        data: this.machines.map(m => m.totalSessions * 0.5), // Simulate hours
                        backgroundColor: '#3498db'
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
                        fill: true
                    }]
                };
                break;
            case 'maintenance':
                title = 'Maintenance Report';
                chartData = {
                    labels: this.machines.map(m => m.name),
                    datasets: [{
                        label: 'Days Since Maintenance',
                        data: this.machines.map(m => Math.floor((Date.now() - m.lastMaintenance) / (24 * 60 * 60 * 1000))),
                        backgroundColor: '#f39c12'
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
                        fill: true
                    }]
                };
        }

        reportTitle.textContent = title;

        new Chart(ctx, {
            type: reportType === 'performance' || reportType === 'financial' ? 'line' : 'bar',
            data: chartData,
            options: {
                responsive: true
            }
        });
    }

    renderReportTable(reportType) {
        const header = document.getElementById('reportTableHeader');
        const body = document.getElementById('reportTableBody');
        if (!header || !body) return;

        let headerHTML, bodyHTML;

        switch (reportType) {
            case 'usage':
                headerHTML = `
                    <tr>
                        <th>Machine</th>
                        <th>Type</th>
                        <th>Total Sessions</th>
                        <th>Usage Hours</th>
                        <th>Avg Calories</th>
                    </tr>
                `;
                bodyHTML = this.machines.map(machine => `
                    <tr>
                        <td>${machine.name}</td>
                        <td>${machine.type}</td>
                        <td>${machine.totalSessions}</td>
                        <td>${(machine.totalSessions * 0.5).toFixed(1)}</td>
                        <td>${machine.avgCalories}</td>
                    </tr>
                `).join('');
                break;
            case 'performance':
                headerHTML = `
                    <tr>
                        <th>Month</th>
                        <th>Active Users</th>
                        <th>Total Sessions</th>
                        <th>Avg Duration</th>
                        <th>Performance Score</th>
                    </tr>
                `;
                bodyHTML = `
                    <tr><td>January</td><td>45</td><td>320</td><td>38 min</td><td>85%</td></tr>
                    <tr><td>February</td><td>52</td><td>380</td><td>42 min</td><td>78%</td></tr>
                    <tr><td>March</td><td>48</td><td>350</td><td>40 min</td><td>90%</td></tr>
                    <tr><td>April</td><td>61</td><td>450</td><td>45 min</td><td>88%</td></tr>
                    <tr><td>May</td><td>55</td><td>420</td><td>43 min</td><td>92%</td></tr>
                `;
                break;
            default:
                headerHTML = `
                    <tr>
                        <th>Period</th>
                        <th>Revenue</th>
                        <th>Expenses</th>
                        <th>Profit</th>
                        <th>Membership Growth</th>
                    </tr>
                `;
                bodyHTML = `
                    <tr><td>Q1 2024</td><td>$45,000</td><td>$28,000</td><td>$17,000</td><td>+12%</td></tr>
                    <tr><td>Q2 2024</td><td>$52,000</td><td>$30,000</td><td>$22,000</td><td>+8%</td></tr>
                `;
        }

        header.innerHTML = headerHTML;
        body.innerHTML = bodyHTML;
    }

    // System Methods
    saveSystemSettings(e) {
        e.preventDefault();
        alert('System settings saved successfully!');
    }

    downloadSystemReport() {
        alert('Downloading system report... This would generate a PDF in real application.');
    }

    exportReport() {
        alert('Exporting report data... This would download a CSV file in real application.');
    }

    runBackup() {
        if (confirm('Start system backup now?')) {
            alert('System backup started... This may take several minutes.');
            // Implementation would trigger backup process
        }
    }

    clearCache() {
        if (confirm('Clear all system cache?')) {
            alert('System cache cleared successfully.');
            // Implementation would clear cache
        }
    }

    // Utility Methods
    getAlertIcon(type) {
        const icons = {
            warning: 'exclamation-triangle',
            info: 'info-circle',
            success: 'check-circle'
        };
        return icons[type] || 'info-circle';
    }

    getStatusBadgeColor(status) {
        const colors = {
            ACTIVE: 'success',
            MAINTENANCE: 'warning',
            INACTIVE: 'secondary'
        };
        return colors[status] || 'secondary';
    }

    getRoleBadgeColor(role) {
        const colors = {
            ADMIN: 'danger',
            INSTRUCTOR: 'warning',
            MEMBER: 'primary'
        };
        return colors[role] || 'secondary';
    }
}

// Global functions
function showSection(sectionName) {
    document.querySelectorAll('[id$="-section"]').forEach(section => {
        section.style.display = 'none';
    });
    document.getElementById(sectionName + '-section').style.display = 'block';

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    event.target.classList.add('active');

    // Load section-specific data
    if (sectionName === 'reports') {
        adminDashboard.loadReports();
    }
}

// Initialize dashboard
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});