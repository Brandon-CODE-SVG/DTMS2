class InstructorDashboard {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.members = [];
        this.workoutSessions = [];
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
        if (this.currentUser.role !== 'INSTRUCTOR') {
            window.location.href = '/login.html';
            return;
        }
        document.getElementById('userName').textContent =
            `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }

    async loadDashboardData() {
        await this.loadMembers();
        await this.loadAllWorkoutSessions();
        this.updateDashboardStats();
        this.renderRecentActivity();
        this.renderMembersTable();
        this.renderWorkoutSessions();
        this.renderQualityIssues();
    }

    async loadMembers() {
        try {
            // In a real app, you'd call an API to get members
            // For demo, we'll simulate this
            const response = await fetch('/api/admin/dashboard-stats');
            if (response.ok) {
                const stats = await response.json();
                // Simulate member data
                this.members = [
                    {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john.doe@email.com',
                        totalWorkouts: 12,
                        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                        avgCalories: 320
                    },
                    {
                        id: 2,
                        firstName: 'Jane',
                        lastName: 'Smith',
                        email: 'jane.smith@email.com',
                        totalWorkouts: 8,
                        lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                        avgCalories: 280
                    },
                    {
                        id: 3,
                        firstName: 'Mike',
                        lastName: 'Johnson',
                        email: 'mike.johnson@email.com',
                        totalWorkouts: 15,
                        lastActivity: new Date(),
                        avgCalories: 450
                    }
                ];
            }
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    }

    async loadAllWorkoutSessions() {
        try {
            // In a real app, you'd call an API to get all sessions
            // For demo, we'll simulate this data
            this.workoutSessions = [
                {
                    id: 1,
                    user: { firstName: 'John', lastName: 'Doe' },
                    machine: { name: 'Treadmill-001', type: 'Treadmill' },
                    startTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                    duration: { toMinutes: () => 45 },
                    caloriesBurned: 320,
                    avgHeartRate: 145,
                    distance: 5.2,
                    dataQualityFlag: true
                },
                {
                    id: 2,
                    user: { firstName: 'Jane', lastName: 'Smith' },
                    machine: { name: 'Exercise Bike-001', type: 'Exercise Bike' },
                    startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                    duration: { toMinutes: () => 30 },
                    caloriesBurned: 280,
                    avgHeartRate: 135,
                    distance: null,
                    dataQualityFlag: true
                },
                {
                    id: 3,
                    user: { firstName: 'Mike', lastName: 'Johnson' },
                    machine: { name: 'Elliptical-001', type: 'Elliptical' },
                    startTime: new Date(),
                    duration: { toMinutes: () => 60 },
                    caloriesBurned: 450,
                    avgHeartRate: 155,
                    distance: null,
                    dataQualityFlag: false,
                    qualityIssues: 'Calories too high'
                }
            ];
        } catch (error) {
            console.error('Failed to load workout sessions:', error);
        }
    }

    setupEventListeners() {
        // Member search functionality
        const memberSearch = document.getElementById('memberSearch');
        if (memberSearch) {
            memberSearch.addEventListener('input', (e) => this.filterMembers(e.target.value));
        }
    }

    updateDashboardStats() {
        const activeMembers = this.members.length;
        const weeklySessions = this.workoutSessions.filter(session =>
            new Date(session.startTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length;

        const qualitySessions = this.workoutSessions.filter(session => session.dataQualityFlag).length;
        const qualityScore = this.workoutSessions.length > 0 ?
            Math.round((qualitySessions / this.workoutSessions.length) * 100) : 100;

        const avgCalories = this.workoutSessions.length > 0 ?
            Math.round(this.workoutSessions.reduce((sum, session) => sum + (session.caloriesBurned || 0), 0) / this.workoutSessions.length) : 0;

        document.getElementById('activeMembers').textContent = activeMembers;
        document.getElementById('weeklySessions').textContent = weeklySessions;
        document.getElementById('qualityScore').textContent = qualityScore + '%';
        document.getElementById('avgCalories').textContent = avgCalories;
    }

    renderRecentActivity() {
        const tbody = document.getElementById('recentActivityBody');
        if (!tbody) return;

        const recentSessions = this.workoutSessions.slice(0, 5);
        tbody.innerHTML = recentSessions.map(session => `
            <tr>
                <td>${session.user.firstName} ${session.user.lastName}</td>
                <td>${session.machine.name}</td>
                <td>${this.formatDuration(session.duration)}</td>
                <td>${session.caloriesBurned}</td>
                <td>${new Date(session.startTime).toLocaleDateString()}</td>
                <td>
                    ${session.dataQualityFlag ?
            '<span class="badge bg-success">Good</span>' :
            '<span class="badge bg-warning">Check</span>'
        }
                </td>
            </tr>
        `).join('');
    }

    renderMembersTable() {
        const tbody = document.getElementById('membersTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.members.map(member => `
            <tr>
                <td>${member.firstName} ${member.lastName}</td>
                <td>${member.email}</td>
                <td>${member.totalWorkouts}</td>
                <td>${member.lastActivity.toLocaleDateString()}</td>
                <td>${member.avgCalories}</td>
                <td>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" style="width: ${Math.min(member.totalWorkouts * 10, 100)}%"></div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="instructorDashboard.viewMemberDetails(${member.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderWorkoutSessions() {
        const tbody = document.getElementById('workoutSessionsBody');
        if (!tbody) return;

        tbody.innerHTML = this.workoutSessions.map(session => `
            <tr>
                <td>${session.user.firstName} ${session.user.lastName}</td>
                <td>${session.machine.name}</td>
                <td>${new Date(session.startTime).toLocaleString()}</td>
                <td>${this.formatDuration(session.duration)}</td>
                <td>${session.caloriesBurned}</td>
                <td>${session.avgHeartRate}</td>
                <td>${session.distance ? session.distance.toFixed(1) + ' km' : 'N/A'}</td>
                <td>
                    ${session.dataQualityFlag ?
            '<span class="badge bg-success">Good</span>' :
            '<span class="badge bg-warning">Issues</span>'
        }
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info" onclick="instructorDashboard.viewSessionDetails(${session.id})">
                        <i class="fas fa-info-circle"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderQualityIssues() {
        const tbody = document.getElementById('qualityIssuesBody');
        if (!tbody) return;

        const issues = this.workoutSessions.filter(session => !session.dataQualityFlag);
        tbody.innerHTML = issues.map(session => `
            <tr>
                <td>${session.user.firstName} ${session.user.lastName}</td>
                <td>${new Date(session.startTime).toLocaleDateString()}</td>
                <td>${session.machine.name}</td>
                <td>Data Validation</td>
                <td>${session.qualityIssues || 'Data quality issues detected'}</td>
                <td><span class="badge bg-warning">Medium</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-warning" onclick="instructorDashboard.reviewIssue(${session.id})">
                        <i class="fas fa-edit"></i> Review
                    </button>
                </td>
            </tr>
        `).join('');

        // Update common issues list
        const commonIssuesList = document.getElementById('commonIssuesList');
        if (commonIssuesList) {
            const issueCounts = {};
            issues.forEach(session => {
                const issue = session.qualityIssues || 'Unknown Issue';
                issueCounts[issue] = (issueCounts[issue] || 0) + 1;
            });

            commonIssuesList.innerHTML = Object.entries(issueCounts)
                .map(([issue, count]) => `
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <span class="small">${issue}</span>
                        <span class="badge bg-secondary">${count}</span>
                    </div>
                `).join('');
        }
    }

    renderCharts() {
        this.renderMemberActivityChart();
        this.renderWorkoutTypeChart();
        this.renderQualityMetricsChart();
        this.renderProgressOverviewChart();
    }

    renderMemberActivityChart() {
        const ctx = document.getElementById('memberActivityChart')?.getContext('2d');
        if (!ctx) return;

        // Group activity by day for the last 7 days
        const dailyActivity = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString('en', { weekday: 'short' });
            dailyActivity[dateStr] = 0;
        }

        this.workoutSessions.forEach(session => {
            const sessionDate = new Date(session.startTime);
            const today = new Date();
            const diffTime = Math.abs(today - sessionDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 7) {
                const dayStr = sessionDate.toLocaleDateString('en', { weekday: 'short' });
                dailyActivity[dayStr]++;
            }
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(dailyActivity),
                datasets: [{
                    label: 'Workout Sessions',
                    data: Object.values(dailyActivity),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderWorkoutTypeChart() {
        const ctx = document.getElementById('workoutTypeChart')?.getContext('2d');
        if (!ctx) return;

        const typeCounts = this.workoutSessions.reduce((acc, session) => {
            const type = session.machine.type;
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(typeCounts),
                datasets: [{
                    data: Object.values(typeCounts),
                    backgroundColor: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6']
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

    renderQualityMetricsChart() {
        const ctx = document.getElementById('qualityMetricsChart')?.getContext('2d');
        if (!ctx) return;

        const qualitySessions = this.workoutSessions.filter(session => session.dataQualityFlag).length;
        const issueSessions = this.workoutSessions.length - qualitySessions;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Good Data', 'Quality Issues'],
                datasets: [{
                    data: [qualitySessions, issueSessions],
                    backgroundColor: ['#2ecc71', '#e74c3c']
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

    renderProgressOverviewChart() {
        const ctx = document.getElementById('progressOverviewChart')?.getContext('2d');
        if (!ctx) return;

        // Simulate progress data
        const weeks = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
        const avgCalories = [280, 320, 310, 350];
        const avgDuration = [35, 40, 38, 45];

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [
                    {
                        label: 'Avg Calories',
                        data: avgCalories,
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        yAxisID: 'y',
                        tension: 0.4
                    },
                    {
                        label: 'Avg Duration (min)',
                        data: avgDuration,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Calories'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Duration (min)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    filterMembers(searchTerm) {
        const filteredMembers = this.members.filter(member =>
            member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderFilteredMembers(filteredMembers);
    }

    renderFilteredMembers(members) {
        const tbody = document.getElementById('membersTableBody');
        if (!tbody) return;

        tbody.innerHTML = members.map(member => `
            <tr>
                <td>${member.firstName} ${member.lastName}</td>
                <td>${member.email}</td>
                <td>${member.totalWorkouts}</td>
                <td>${member.lastActivity.toLocaleDateString()}</td>
                <td>${member.avgCalories}</td>
                <td>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" style="width: ${Math.min(member.totalWorkouts * 10, 100)}%"></div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="instructorDashboard.viewMemberDetails(${member.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    viewMemberDetails(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;

        const modalTitle = document.getElementById('memberModalTitle');
        const modalContent = document.getElementById('memberModalContent');

        modalTitle.textContent = `${member.firstName} ${member.lastName} - Details`;

        modalContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Personal Information</h6>
                    <p><strong>Email:</strong> ${member.email}</p>
                    <p><strong>Member Since:</strong> ${new Date().toLocaleDateString()}</p>
                </div>
                <div class="col-md-6">
                    <h6>Fitness Statistics</h6>
                    <p><strong>Total Workouts:</strong> ${member.totalWorkouts}</p>
                    <p><strong>Average Calories:</strong> ${member.avgCalories}</p>
                    <p><strong>Last Activity:</strong> ${member.lastActivity.toLocaleDateString()}</p>
                </div>
            </div>
            <div class="mt-4">
                <h6>Recent Workouts</h6>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Machine</th>
                                <th>Duration</th>
                                <th>Calories</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${this.workoutSessions
            .filter(session => session.user.id === memberId)
            .slice(0, 5)
            .map(session => `
                                    <tr>
                                        <td>${new Date(session.startTime).toLocaleDateString()}</td>
                                        <td>${session.machine.name}</td>
                                        <td>${this.formatDuration(session.duration)}</td>
                                        <td>${session.caloriesBurned}</td>
                                    </tr>
                                `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        new bootstrap.Modal(document.getElementById('memberModal')).show();
    }

    viewSessionDetails(sessionId) {
        const session = this.workoutSessions.find(s => s.id === sessionId);
        if (!session) return;

        alert(`Session Details:\n
Member: ${session.user.firstName} ${session.user.lastName}
Machine: ${session.machine.name}
Date: ${new Date(session.startTime).toLocaleString()}
Duration: ${this.formatDuration(session.duration)}
Calories: ${session.caloriesBurned}
Heart Rate: ${session.avgHeartRate} bpm
Distance: ${session.distance ? session.distance.toFixed(1) + ' km' : 'N/A'}
Quality: ${session.dataQualityFlag ? 'Good' : 'Issues - ' + session.qualityIssues}`);
    }

    reviewIssue(sessionId) {
        const session = this.workoutSessions.find(s => s.id === sessionId);
        if (!session) return;

        if (confirm(`Review data quality issue for ${session.user.firstName}'s workout?\n\nIssue: ${session.qualityIssues}\n\nMark as reviewed?`)) {
            // In a real app, you'd call an API to update the session
            session.dataQualityFlag = true;
            session.qualityIssues = null;
            this.renderQualityIssues();
            this.updateDashboardStats();
            alert('Issue marked as reviewed and resolved.');
        }
    }

    formatDuration(duration) {
        if (!duration) return 'N/A';
        const minutes = Math.floor(duration.toMinutes());
        return `${minutes} min`;
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
}

function filterWorkouts() {
    const dateFilter = document.getElementById('workoutDateFilter').value;
    if (dateFilter) {
        alert(`Filtering workouts for: ${dateFilter}`);
        // Implementation would filter the workout sessions
    }
}

function generateReport() {
    alert('Generating report... This would download a PDF report in a real application.');
}

function loadProgressReports() {
    const period = document.getElementById('reportPeriod').value;
    instructorDashboard.renderProgressOverviewChart();
}

// Initialize dashboard
let instructorDashboard;
document.addEventListener('DOMContentLoaded', () => {
    instructorDashboard = new InstructorDashboard();
});