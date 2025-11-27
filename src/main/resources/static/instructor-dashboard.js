class InstructorDashboard {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.members = [];
        this.workoutSessions = [];
        this.dashboardStats = {};
        this.chartData = {};
        this.charts = {};
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadDashboardData();
        this.setupEventListeners();
        this.renderCharts();
        this.setupAutoRefresh();
        this.setupRealTimeUpdates();
        this.showNotification('Dashboard loaded successfully!', 'success');
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/current-user');
            if (!response.ok) {
                throw new Error('Not authenticated');
            }

            const data = await response.json();
            this.currentUser = data.user || data;

            if (!this.currentUser || (this.currentUser.role !== 'INSTRUCTOR' && this.currentUser.role !== 'ADMIN')) {
                window.location.href = '/login';
                return;
            }

            document.getElementById('userName').textContent =
                `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim() || 'Instructor';

        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login';
        }
    }

    async loadDashboardData() {
        try {
            this.showLoadingState(true);

            // Load all data in parallel for better performance
            const [stats, members, sessions, chartData] = await Promise.all([
                this.fetchData('/api/instructor/dashboard-stats'),
                this.fetchData('/api/instructor/members'),
                this.fetchData('/api/instructor/workout-sessions'),
                this.fetchData('/api/instructor/chart-data')
            ]);

            this.dashboardStats = stats || {};
            this.members = Array.isArray(members) ? members : [];
            this.workoutSessions = sessions && sessions.success ? sessions.sessions : [];
            this.chartData = chartData || {};

            // Process session data to handle DTO structure
            this.processSessionsData();

            // Enhance members with additional data
            await this.enhanceMembersData();

            this.updateDashboardStats();
            this.renderRecentActivity();
            this.renderMembersTable();
            this.renderWorkoutSessions();
            this.renderQualityIssues();
            this.renderProgressReports();

            this.showLoadingState(false);
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showNotification('Failed to load dashboard data: ' + error.message, 'error');
            this.showLoadingState(false);
        }
    }

    async fetchData(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    }

    processSessionsData() {
        this.workoutSessions.forEach(session => {
            // Convert date strings to Date objects
            if (typeof session.startTime === 'string') {
                session.startTime = new Date(session.startTime);
            }
            if (session.endTime && typeof session.endTime === 'string') {
                session.endTime = new Date(session.endTime);
            }

            // Handle DTO structure - session may have userName or user object
            if (!session.userName && session.user) {
                session.userName = `${session.user.firstName || ''} ${session.user.lastName || ''}`.trim();
            }

            // Handle machine data from DTO
            if (!session.machineName && session.machine) {
                session.machineName = session.machine.name;
                session.machineType = session.machine.type;
            }
        });

        // Sort by start time descending
        this.workoutSessions.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
    }

    async enhanceMembersData() {
        for (let member of this.members) {
            try {
                const sessionsData = await this.fetchData(`/api/workouts/user/${member.id}`);
                const sessions = sessionsData.sessions || sessionsData;

                member.totalWorkouts = Array.isArray(sessions) ? sessions.length : 0;
                member.lastActivity = Array.isArray(sessions) && sessions.length > 0 ?
                    new Date(sessions[0].startTime) : new Date(member.createdAt);
                member.avgCalories = Array.isArray(sessions) && sessions.length > 0 ?
                    Math.round(sessions.reduce((sum, session) => sum + (session.caloriesBurned || 0), 0) / sessions.length) : 0;

                // Calculate member progress metrics
                member.totalCalories = Array.isArray(sessions) ?
                    sessions.reduce((sum, session) => sum + (session.caloriesBurned || 0), 0) : 0;
                member.avgDuration = Array.isArray(sessions) && sessions.length > 0 ?
                    Math.round(sessions.reduce((sum, session) => sum + (this.getDurationInMinutes(session.duration) || 0), 0) / sessions.length) : 0;
                member.avgHeartRate = Array.isArray(sessions) && sessions.length > 0 ?
                    Math.round(sessions.reduce((sum, session) => sum + (session.avgHeartRate || 0), 0) / sessions.length) : 0;

            } catch (error) {
                console.error(`Failed to load sessions for member ${member.id}:`, error);
                member.totalWorkouts = 0;
                member.avgCalories = 0;
                member.totalCalories = 0;
                member.avgDuration = 0;
                member.avgHeartRate = 0;
                member.lastActivity = new Date(member.createdAt);
            }
        }
    }

    setupEventListeners() {
        // Member search functionality
        const memberSearch = document.getElementById('memberSearch');
        if (memberSearch) {
            memberSearch.addEventListener('input', (e) => this.filterMembers(e.target.value));
        }

        // Refresh button
        const refreshBtn = document.querySelector('button[onclick="refreshDashboard()"]');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshDashboard());
        }

        // Date filter for workouts
        const dateFilter = document.getElementById('workoutDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => this.filterWorkoutsByDate(e.target.value));
        }

        // Report period selector
        const reportPeriod = document.getElementById('reportPeriod');
        if (reportPeriod) {
            reportPeriod.addEventListener('change', (e) => this.loadProgressReports());
        }

        // Quick report buttons
        const quickReportButtons = document.querySelectorAll('button[onclick*="generateReport"]');
        quickReportButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const match = e.target.getAttribute('onclick').match(/generateReport\('([^']+)'\)/);
                if (match) {
                    this.generateReport(match[1]);
                }
            });
        });
    }

    setupAutoRefresh() {
        // Refresh dashboard every 30 seconds
        setInterval(() => {
            this.loadDashboardData().then(() => {
                this.renderCharts();
                console.log('Dashboard auto-refreshed');
            });
        }, 30000);
    }

    setupRealTimeUpdates() {
        // Check for new members every 45 seconds
        setInterval(async () => {
            try {
                const oldCount = this.members.length;
                const membersResponse = await this.fetchData('/api/instructor/members');
                const newMembers = Array.isArray(membersResponse) ? membersResponse : [];

                if (newMembers.length > oldCount) {
                    this.members = newMembers;
                    await this.enhanceMembersData();
                    this.renderMembersTable();
                    this.showNotification(`New member registered! Total members: ${this.members.length}`, 'info');
                }
            } catch (error) {
                console.error('Failed to check for new members:', error);
            }
        }, 45000);

        // Refresh charts data every 2 minutes
        setInterval(() => {
            this.loadChartData().then(() => {
                this.renderCharts();
                console.log('Charts data refreshed');
            });
        }, 120000);
    }

    async loadChartData() {
        try {
            const chartData = await this.fetchData('/api/instructor/chart-data');
            this.chartData = chartData || {};
        } catch (error) {
            console.error('Failed to load chart data:', error);
        }
    }

    showLoadingState(show) {
        const loadingElement = document.getElementById('loadingState');
        const contentElement = document.getElementById('dashboardContent');

        if (loadingElement && contentElement) {
            if (show) {
                loadingElement.style.display = 'block';
                contentElement.style.display = 'none';
            } else {
                loadingElement.style.display = 'none';
                contentElement.style.display = 'block';
            }
        }
    }

    updateDashboardStats() {
        // Update main stats cards
        const statsElements = {
            'activeMembers': 'totalMembers',
            'weeklySessions': 'sessionsThisWeek',
            'qualityScore': 'dataQualityScore',
            'avgCalories': 'avgCalories',
            'totalSessions': 'totalSessions',
            'avgWorkoutsPerMember': 'avgWorkoutsPerMember'
        };

        Object.entries(statsElements).forEach(([elementId, statKey]) => {
            const element = document.getElementById(elementId);
            if (element) {
                const value = this.dashboardStats[statKey] || 0;
                if (elementId === 'qualityScore') {
                    element.textContent = value + '%';
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    renderRecentActivity() {
        const tbody = document.getElementById('recentActivityBody');
        if (!tbody) return;

        const recentSessions = this.workoutSessions.slice(0, 5);
        tbody.innerHTML = recentSessions.map(session => `
            <tr>
                <td>${session.userName || 'N/A'}</td>
                <td>${session.machineName || session.machine?.name || 'N/A'}</td>
                <td>${this.formatDuration(session.duration)}</td>
                <td>${session.caloriesBurned || 0}</td>
                <td>${new Date(session.startTime).toLocaleDateString()}</td>
                <td>
                    ${session.dataQualityFlag ?
            '<span class="badge bg-success">Good</span>' :
            '<span class="badge bg-warning">Check</span>'
        }
                </td>
            </tr>
        `).join('');

        if (recentSessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No recent activity</td></tr>';
        }
    }

    renderMembersTable() {
        const tbody = document.getElementById('membersTableBody');
        if (!tbody) return;

        tbody.innerHTML = this.members.map(member => `
            <tr>
                <td>${member.firstName} ${member.lastName}</td>
                <td>${member.email}</td>
                <td>${member.totalWorkouts || 0}</td>
                <td>${member.lastActivity ? member.lastActivity.toLocaleDateString() : 'No activity'}</td>
                <td>${member.avgCalories || 0}</td>
                <td>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" style="width: ${Math.min((member.totalWorkouts || 0) * 10, 100)}%"></div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="instructorDashboard.viewMemberDetails(${member.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="instructorDashboard.generateMemberReport(${member.id})">
                        <i class="fas fa-download"></i> Report
                    </button>
                </td>
            </tr>
        `).join('');

        if (this.members.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No members found</td></tr>';
        }
    }

    renderWorkoutSessions() {
        const tbody = document.getElementById('workoutSessionsBody');
        if (!tbody) return;

        tbody.innerHTML = this.workoutSessions.map(session => `
            <tr>
                <td>${session.userName || 'N/A'}</td>
                <td>${session.machineName || session.machine?.name || 'N/A'}</td>
                <td>${new Date(session.startTime).toLocaleString()}</td>
                <td>${this.formatDuration(session.duration)}</td>
                <td>${session.caloriesBurned || 0}</td>
                <td>${session.avgHeartRate || 'N/A'}</td>
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
                    ${!session.dataQualityFlag ? `
                    <button class="btn btn-sm btn-outline-warning" onclick="instructorDashboard.reviewIssue(${session.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        if (this.workoutSessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No workout sessions found</td></tr>';
        }
    }

    renderQualityIssues() {
        const tbody = document.getElementById('qualityIssuesBody');
        if (!tbody) return;

        const issues = this.workoutSessions.filter(session => !session.dataQualityFlag);
        tbody.innerHTML = issues.map(session => `
            <tr>
                <td>${session.userName || 'N/A'}</td>
                <td>${new Date(session.startTime).toLocaleDateString()}</td>
                <td>${session.machineName || session.machine?.name || 'N/A'}</td>
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
                        <span class="small text-truncate" style="max-width: 200px;" title="${issue}">${issue}</span>
                        <span class="badge bg-secondary">${count}</span>
                    </div>
                `).join('');
        }

        // Update quality issues count
        const issuesCountElement = document.getElementById('qualityIssuesCount');
        if (issuesCountElement) {
            issuesCountElement.textContent = issues.length;
        }

        // Show message if no issues
        if (issues.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No quality issues found</td></tr>';
            if (commonIssuesList) {
                commonIssuesList.innerHTML = '<div class="text-center text-muted">No common issues</div>';
            }
        }
    }

    renderProgressReports() {
        const tbody = document.getElementById('progressReportBody');
        if (!tbody) return;

        // Calculate improvement metrics for each member
        const membersWithProgress = this.members.map(member => {
            const improvement = this.calculateMemberImprovement(member.id);
            return { ...member, improvement };
        });

        tbody.innerHTML = membersWithProgress.map(member => `
            <tr>
                <td>${member.firstName} ${member.lastName}</td>
                <td>${member.totalWorkouts || 0}</td>
                <td>${member.totalCalories || 0}</td>
                <td>${member.avgDuration || 0} min</td>
                <td>${member.avgHeartRate || 'N/A'} bpm</td>
                <td>
                    ${member.improvement > 0 ?
            `<span class="text-success"><i class="fas fa-arrow-up"></i> ${member.improvement}%</span>` :
            member.improvement < 0 ?
                `<span class="text-danger"><i class="fas fa-arrow-down"></i> ${Math.abs(member.improvement)}%</span>` :
                `<span class="text-muted">0%</span>`
        }
                </td>
                <td>
                    ${member.totalWorkouts > 10 ?
            '<span class="badge bg-success">Active</span>' :
            member.totalWorkouts > 5 ?
                '<span class="badge bg-warning">Moderate</span>' :
                '<span class="badge bg-secondary">Beginner</span>'
        }
                </td>
            </tr>
        `).join('');

        if (membersWithProgress.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No progress data available</td></tr>';
        }
    }

    calculateMemberImprovement(memberId) {
        // Simple improvement calculation based on recent activity vs older activity
        // In a real app, this would compare specific time periods
        const member = this.members.find(m => m.id === memberId);
        if (!member || member.totalWorkouts < 2) return 0;

        // Random improvement for demo purposes (-10% to +20%)
        return Math.floor(Math.random() * 30) - 10;
    }

    renderCharts() {
        this.renderMemberActivityChart();
        this.renderWorkoutTypeChart();
        this.renderQualityMetricsChart();
        this.renderProgressOverviewChart();
        this.renderDetailedProgressChart();
    }

    renderMemberActivityChart() {
        const ctx = document.getElementById('memberActivityChart');
        if (!ctx) return;

        if (this.charts.memberActivity) {
            this.charts.memberActivity.destroy();
        }

        const chartCtx = ctx.getContext('2d');
        const weeklyActivity = this.chartData.weeklyActivity || this.calculateWeeklyActivity();

        this.charts.memberActivity = new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(weeklyActivity),
                datasets: [{
                    label: 'Workout Sessions',
                    data: Object.values(weeklyActivity),
                    backgroundColor: '#3498db',
                    borderColor: '#2980b9',
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    title: {
                        display: true,
                        text: 'Weekly Activity',
                        font: {
                            size: 14
                        }
                    }
                },
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
        const ctx = document.getElementById('workoutTypeChart');
        if (!ctx) return;

        if (this.charts.workoutType) {
            this.charts.workoutType.destroy();
        }

        const chartCtx = ctx.getContext('2d');
        const workoutTypes = this.chartData.workoutTypes || this.calculateWorkoutTypes();

        this.charts.workoutType = new Chart(chartCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(workoutTypes),
                datasets: [{
                    data: Object.values(workoutTypes),
                    backgroundColor: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Workout Type Distribution'
                    }
                }
            }
        });
    }

    renderQualityMetricsChart() {
        const ctx = document.getElementById('qualityMetricsChart');
        if (!ctx) return;

        if (this.charts.qualityMetrics) {
            this.charts.qualityMetrics.destroy();
        }

        const chartCtx = ctx.getContext('2d');
        const qualitySessions = this.workoutSessions.filter(session => session.dataQualityFlag).length;
        const issueSessions = this.workoutSessions.length - qualitySessions;

        this.charts.qualityMetrics = new Chart(chartCtx, {
            type: 'doughnut',
            data: {
                labels: ['Good Data', 'Quality Issues'],
                datasets: [{
                    data: [qualitySessions, issueSessions],
                    backgroundColor: ['#2ecc71', '#e74c3c'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Data Quality Overview'
                    }
                },
                cutout: '60%'
            }
        });
    }

    renderProgressOverviewChart() {
        const ctx = document.getElementById('progressOverviewChart');
        if (!ctx) return;

        if (this.charts.progressOverview) {
            this.charts.progressOverview.destroy();
        }

        const chartCtx = ctx.getContext('2d');
        const progressData = this.chartData.progressData || this.calculateProgressData();
        const weeks = Object.keys(progressData);
        const avgCalories = weeks.map(week => progressData[week].avgCalories);
        const avgDuration = weeks.map(week => progressData[week].avgDuration);

        this.charts.progressOverview = new Chart(chartCtx, {
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
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Avg Duration (min)',
                        data: avgDuration,
                        borderColor: '#3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.1)',
                        yAxisID: 'y1',
                        tension: 0.4,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Progress Overview (Last 4 Weeks)'
                    }
                },
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

    renderDetailedProgressChart() {
        const ctx = document.getElementById('detailedProgressChart');
        if (!ctx) return;

        if (this.charts.detailedProgress) {
            this.charts.detailedProgress.destroy();
        }

        const chartCtx = ctx.getContext('2d');

        // Sample data for detailed progress
        const members = this.members.slice(0, 5); // Show top 5 members
        const memberNames = members.map(m => `${m.firstName} ${m.lastName.charAt(0)}.`);
        const workoutCounts = members.map(m => m.totalWorkouts || 0);
        const avgCalories = members.map(m => m.avgCalories || 0);

        this.charts.detailedProgress = new Chart(chartCtx, {
            type: 'bar',
            data: {
                labels: memberNames,
                datasets: [
                    {
                        label: 'Total Workouts',
                        data: workoutCounts,
                        backgroundColor: '#3498db',
                        order: 2
                    },
                    {
                        label: 'Avg Calories',
                        data: avgCalories,
                        type: 'line',
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        fill: true,
                        order: 1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Top Members Performance'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Helper methods for chart data calculation
    calculateWeeklyActivity() {
        const dailyActivity = {};
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        days.forEach(day => dailyActivity[day] = 0);

        this.workoutSessions.forEach(session => {
            const sessionDate = new Date(session.startTime);
            const today = new Date();
            const diffTime = Math.abs(today - sessionDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= 7) {
                const dayStr = sessionDate.toLocaleDateString('en', { weekday: 'short' });
                dailyActivity[dayStr] = (dailyActivity[dayStr] || 0) + 1;
            }
        });

        return dailyActivity;
    }

    calculateWorkoutTypes() {
        const typeCounts = {};
        this.workoutSessions.forEach(session => {
            const type = session.machineType || session.machine?.type || 'Unknown';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        return typeCounts;
    }

    calculateProgressData() {
        const progressData = {};
        for (let i = 3; i >= 0; i--) {
            const weekStart = new Date();
            weekStart.setDate(weekStart.getDate() - (i * 7));
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);

            const weekSessions = this.workoutSessions.filter(session => {
                const sessionDate = new Date(session.startTime);
                return sessionDate >= weekStart && sessionDate < weekEnd;
            });

            const avgCalories = weekSessions.length > 0 ?
                weekSessions.reduce((sum, session) => sum + (session.caloriesBurned || 0), 0) / weekSessions.length : 0;

            const avgDuration = weekSessions.length > 0 ?
                weekSessions.reduce((sum, session) => sum + (this.getDurationInMinutes(session.duration) || 0), 0) / weekSessions.length : 0;

            progressData[`Week ${4-i}`] = {
                avgCalories: Math.round(avgCalories),
                avgDuration: Math.round(avgDuration)
            };
        }
        return progressData;
    }

    getDurationInMinutes(duration) {
        if (!duration) return 0;
        if (typeof duration === 'object' && duration.toMinutes) {
            return duration.toMinutes();
        }
        if (typeof duration === 'number') {
            return duration;
        }
        // Handle string duration like "PT30M"
        if (typeof duration === 'string' && duration.startsWith('PT')) {
            const match = duration.match(/PT(\d+)M/);
            return match ? parseInt(match[1]) : 0;
        }
        return 0;
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
                <td>${member.totalWorkouts || 0}</td>
                <td>${member.lastActivity ? member.lastActivity.toLocaleDateString() : 'No activity'}</td>
                <td>${member.avgCalories || 0}</td>
                <td>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar" style="width: ${Math.min((member.totalWorkouts || 0) * 10, 100)}%"></div>
                    </div>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="instructorDashboard.viewMemberDetails(${member.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn btn-sm btn-outline-success" onclick="instructorDashboard.generateMemberReport(${member.id})">
                        <i class="fas fa-download"></i> Report
                    </button>
                </td>
            </tr>
        `).join('');

        if (members.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No members found matching your search</td></tr>';
        }
    }

    filterWorkoutsByDate(dateFilter) {
        if (!dateFilter) {
            this.renderWorkoutSessions();
            return;
        }

        const filterDate = new Date(dateFilter);
        const filteredSessions = this.workoutSessions.filter(session => {
            const sessionDate = new Date(session.startTime);
            return sessionDate.toDateString() === filterDate.toDateString();
        });

        this.renderFilteredWorkouts(filteredSessions);
    }

    renderFilteredWorkouts(sessions) {
        const tbody = document.getElementById('workoutSessionsBody');
        if (!tbody) return;

        tbody.innerHTML = sessions.map(session => `
            <tr>
                <td>${session.userName || 'N/A'}</td>
                <td>${session.machineName || session.machine?.name || 'N/A'}</td>
                <td>${new Date(session.startTime).toLocaleString()}</td>
                <td>${this.formatDuration(session.duration)}</td>
                <td>${session.caloriesBurned || 0}</td>
                <td>${session.avgHeartRate || 'N/A'}</td>
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
                    ${!session.dataQualityFlag ? `
                    <button class="btn btn-sm btn-outline-warning" onclick="instructorDashboard.reviewIssue(${session.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        if (sessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center">No workout sessions found for selected date</td></tr>';
        }
    }

    async viewMemberDetails(memberId) {
        const member = this.members.find(m => m.id === memberId);
        if (!member) return;

        // Load member sessions
        let memberSessions = [];
        try {
            const sessionsData = await this.fetchData(`/api/workouts/user/${memberId}`);
            memberSessions = sessionsData.sessions || sessionsData;
        } catch (error) {
            console.error('Failed to load member sessions:', error);
        }

        const modalTitle = document.getElementById('memberModalTitle');
        const modalContent = document.getElementById('memberModalContent');

        modalTitle.textContent = `${member.firstName} ${member.lastName} - Details`;

        // Calculate additional stats
        const totalDuration = memberSessions.reduce((sum, session) => sum + this.getDurationInMinutes(session.duration), 0);
        const avgSessionDuration = memberSessions.length > 0 ? Math.round(totalDuration / memberSessions.length) : 0;

        modalContent.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Personal Information</h6>
                    <p><strong>Email:</strong> ${member.email}</p>
                    <p><strong>Username:</strong> ${member.username}</p>
                    <p><strong>Member Since:</strong> ${new Date(member.createdAt).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> <span class="badge bg-success">${member.status || 'ACTIVE'}</span></p>
                </div>
                <div class="col-md-6">
                    <h6>Fitness Statistics</h6>
                    <p><strong>Total Workouts:</strong> ${member.totalWorkouts || 0}</p>
                    <p><strong>Total Calories:</strong> ${member.totalCalories || 0}</p>
                    <p><strong>Average Calories/Session:</strong> ${member.avgCalories || 0}</p>
                    <p><strong>Average Duration:</strong> ${avgSessionDuration} min</p>
                    <p><strong>Last Activity:</strong> ${member.lastActivity ? member.lastActivity.toLocaleDateString() : 'No activity'}</p>
                </div>
            </div>
            <div class="mt-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="mb-0">Recent Workouts</h6>
                    <button class="btn btn-sm btn-outline-primary" onclick="instructorDashboard.generateMemberReport(${member.id})">
                        <i class="fas fa-download me-1"></i>Download Full Report
                    </button>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Machine</th>
                                <th>Duration</th>
                                <th>Calories</th>
                                <th>Heart Rate</th>
                                <th>Quality</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${memberSessions.slice(0, 10).map(session => `
                                <tr>
                                    <td>${new Date(session.startTime).toLocaleDateString()}</td>
                                    <td>${session.machine?.name || 'N/A'}</td>
                                    <td>${this.formatDuration(session.duration)}</td>
                                    <td>${session.caloriesBurned || 0}</td>
                                    <td>${session.avgHeartRate || 'N/A'}</td>
                                    <td>${session.dataQualityFlag ?
            '<span class="badge bg-success">Good</span>' :
            '<span class="badge bg-warning">Issues</span>'}</td>
                                </tr>
                            `).join('')}
                            ${memberSessions.length === 0 ?
            '<tr><td colspan="6" class="text-center">No workout sessions found</td></tr>' : ''}
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

        const details = `
Session Details:

Member: ${session.userName || 'N/A'}
Machine: ${session.machineName || session.machine?.name || 'N/A'}
Date: ${new Date(session.startTime).toLocaleString()}
Duration: ${this.formatDuration(session.duration)}
Calories: ${session.caloriesBurned || 0}
Heart Rate: ${session.avgHeartRate || 'N/A'} bpm
Distance: ${session.distance ? session.distance.toFixed(1) + ' km' : 'N/A'}
Speed: ${session.avgSpeed ? session.avgSpeed.toFixed(1) + ' km/h' : 'N/A'}
Resistance Level: ${session.resistanceLevel || 'N/A'}
Incline Level: ${session.inclineLevel || 'N/A'}
Notes: ${session.notes || 'None'}
Quality: ${session.dataQualityFlag ? 'Good' : 'Issues - ' + (session.qualityIssues || 'Unknown issues')}
        `;

        alert(details);
    }

    async reviewIssue(sessionId) {
        const session = this.workoutSessions.find(s => s.id === sessionId);
        if (!session) return;

        if (confirm(`Review data quality issue for ${session.userName || 'Unknown'}'s workout?\n\nIssue: ${session.qualityIssues}\n\nMark as reviewed?`)) {
            try {
                const response = await fetch(`/api/instructor/sessions/${sessionId}/quality-review`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        dataQualityFlag: true,
                        qualityIssues: 'Manually reviewed and approved'
                    })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        session.dataQualityFlag = true;
                        session.qualityIssues = 'Manually reviewed and approved';
                        this.renderQualityIssues();
                        this.updateDashboardStats();
                        this.renderCharts();
                        this.showNotification('Issue marked as reviewed and resolved.', 'success');
                    } else {
                        this.showNotification('Failed to update session: ' + result.message, 'error');
                    }
                } else {
                    this.showNotification('Failed to update session.', 'error');
                }
            } catch (error) {
                console.error('Failed to update session:', error);
                this.showNotification('Failed to update session.', 'error');
            }
        }
    }

    formatDuration(duration) {
        if (!duration) return 'N/A';

        let minutes = 0;
        if (typeof duration === 'object' && duration.toMinutes) {
            minutes = Math.floor(duration.toMinutes());
        } else if (typeof duration === 'number') {
            minutes = Math.floor(duration);
        } else if (typeof duration === 'string' && duration.startsWith('PT')) {
            const match = duration.match(/PT(\d+)M/);
            minutes = match ? parseInt(match[1]) : 0;
        }

        return minutes > 0 ? `${minutes} min` : 'N/A';
    }

    async refreshDashboard() {
        this.showNotification('Refreshing dashboard...', 'info');
        await this.loadDashboardData();
        this.renderCharts();
        this.showNotification('Dashboard refreshed successfully!', 'success');
    }

    async loadProgressReports() {
        try {
            const period = document.getElementById('reportPeriod').value;
            // In a real implementation, you would fetch progress data based on the period
            this.renderProgressReports();
            this.renderDetailedProgressChart();
            this.showNotification(`Progress reports updated for ${period} days`, 'info');
        } catch (error) {
            console.error('Failed to load progress reports:', error);
            this.showNotification('Failed to load progress reports', 'error');
        }
    }

    // REPORT GENERATION METHODS
    async generateReport(type = 'usage', options = {}) {
        try {
            this.showNotification(`Generating ${type} report...`, 'info');

            let url = '/api/reports/';
            let filename = 'report.csv';
            const params = new URLSearchParams();

            switch (type) {
                case 'usage':
                    url += 'usage/csv';
                    filename = `usage_report_${options.startDate || 'all'}_to_${options.endDate || 'all'}.csv`;
                    if (options.startDate && options.endDate) {
                        params.append('startDate', options.startDate);
                        params.append('endDate', options.endDate);
                    }
                    break;
                case 'member-progress':
                    if (!options.userId) {
                        this.showNotification('User ID is required for member progress report', 'error');
                        return;
                    }
                    url += 'member-progress/csv';
                    filename = `member_progress_${options.userId}.csv`;
                    params.append('userId', options.userId);
                    if (options.startDate && options.endDate) {
                        params.append('startDate', options.startDate);
                        params.append('endDate', options.endDate);
                    }
                    break;
                case 'data-quality':
                    url += 'data-quality/csv';
                    filename = 'data_quality_report.csv';
                    break;
                default:
                    this.showNotification('Invalid report type', 'error');
                    return;
            }

            const fullUrl = params.toString() ? `${url}?${params.toString()}` : url;

            const response = await fetch(fullUrl);
            if (response.ok) {
                const blob = await response.blob();
                this.downloadBlob(blob, filename);
                this.showNotification(`${type} report downloaded successfully!`, 'success');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to generate report');
            }
        } catch (error) {
            console.error('Failed to generate report:', error);
            this.showNotification('Failed to generate report: ' + error.message, 'error');
        }
    }

    async generateMemberReport(memberId) {
        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const startDate = thirtyDaysAgo.toISOString().split('T')[0];

        await this.generateReport('member-progress', {
            userId: memberId,
            startDate: startDate,
            endDate: today
        });
    }

    downloadBlob(blob, filename) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    showReportModal() {
        // Create modal if it doesn't exist
        if (!document.getElementById('reportModal')) {
            this.createReportModal();
        }

        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const startDateDefault = sevenDaysAgo.toISOString().split('T')[0];

        const modalContent = `
            <div class="mb-3">
                <label class="form-label">Report Type</label>
                <select class="form-select" id="reportType">
                    <option value="usage">Usage Report</option>
                    <option value="member-progress">Member Progress</option>
                    <option value="data-quality">Data Quality</option>
                </select>
            </div>
            <div class="mb-3" id="dateRangeSection">
                <label class="form-label">Date Range</label>
                <div class="row">
                    <div class="col">
                        <input type="date" class="form-control" id="startDate" value="${startDateDefault}">
                    </div>
                    <div class="col">
                        <input type="date" class="form-control" id="endDate" value="${today}">
                    </div>
                </div>
            </div>
            <div class="mb-3" id="memberIdSection" style="display: none;">
                <label class="form-label">Member</label>
                <select class="form-select" id="memberId">
                    <option value="">Select a member</option>
                    ${this.members.map(member => `
                        <option value="${member.id}">${member.firstName} ${member.lastName}</option>
                    `).join('')}
                </select>
            </div>
        `;

        const modal = new bootstrap.Modal(document.getElementById('reportModal'));
        document.getElementById('reportModalContent').innerHTML = modalContent;

        // Add event listener for report type change
        document.getElementById('reportType').addEventListener('change', (e) => {
            const showMemberId = e.target.value === 'member-progress';
            document.getElementById('memberIdSection').style.display = showMemberId ? 'block' : 'none';
        });

        modal.show();
    }

    createReportModal() {
        const modalHTML = `
            <div class="modal fade" id="reportModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Generate Report</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="reportModalContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" onclick="instructorDashboard.generateAdvancedReport()">Generate Report</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    generateAdvancedReport() {
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const memberId = document.getElementById('memberId').value;

        const options = {};
        if (startDate && endDate) {
            options.startDate = startDate;
            options.endDate = endDate;
        }
        if (memberId) {
            options.userId = memberId;
        }

        this.generateReport(reportType, options);
        bootstrap.Modal.getInstance(document.getElementById('reportModal')).hide();
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingAlerts = document.querySelectorAll('.alert-dismissible');
        existingAlerts.forEach(alert => alert.remove());

        const alertClass = type === 'success' ? 'alert-success' :
            type === 'error' ? 'alert-danger' :
                type === 'warning' ? 'alert-warning' : 'alert-info';

        const notification = document.createElement('div');
        notification.className = `alert ${alertClass} alert-dismissible fade show`;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.zIndex = '9999';
        notification.style.minWidth = '300px';
        notification.style.maxWidth = '500px';
        notification.innerHTML = `
            <div class="d-flex align-items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' :
            type === 'error' ? 'fa-exclamation-circle' :
                type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} 
                    me-2"></i>
                <div>${message}</div>
            </div>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
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

    // Refresh section-specific data
    if (sectionName === 'progress') {
        instructorDashboard.loadProgressReports();
    }
}

function filterWorkouts() {
    const dateFilter = document.getElementById('workoutDateFilter').value;
    if (dateFilter) {
        instructorDashboard.filterWorkoutsByDate(dateFilter);
    } else {
        instructorDashboard.renderWorkoutSessions();
    }
}

function generateReport() {
    instructorDashboard.showReportModal();
}

function loadProgressReports() {
    instructorDashboard.loadProgressReports();
}

function refreshDashboard() {
    instructorDashboard.refreshDashboard();
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

// Initialize dashboard when DOM is loaded
let instructorDashboard;
document.addEventListener('DOMContentLoaded', () => {
    instructorDashboard = new InstructorDashboard();
});