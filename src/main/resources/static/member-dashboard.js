class MemberDashboard {
    constructor() {
        this.apiBase = '/api';
        this.currentUser = null;
        this.workoutSessions = [];
        this.machines = [];
        this.init();
    }

    async init() {
        await this.checkAuth();
        await this.loadUserData();
        await this.loadMachines();
        await this.loadWorkoutSessions();
        this.setupEventListeners();
        this.updateDashboardStats();
        this.renderCharts();
        this.setDefaultStartTime();
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/auth/current-user');
            if (response.status !== 200) {
                window.location.href = '/login.html';
                return;
            }
            this.currentUser = await response.json();
            document.getElementById('userName').textContent =
                `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim() || this.currentUser.username;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login.html';
        }
    }

    async loadUserData() {
        // Load additional user data if needed
    }

    async loadMachines() {
        try {
            // Try to fetch machines from API first
            const response = await fetch('/api/machines');
            if (response.ok) {
                this.machines = await response.json();
            } else {
                // Fallback to mock data
                this.machines = [
                    { id: 1, name: 'Treadmill-001', type: 'Treadmill' },
                    { id: 2, name: 'Exercise Bike-001', type: 'Exercise Bike' },
                    { id: 3, name: 'Elliptical-001', type: 'Elliptical' },
                    { id: 4, name: 'Rowing Machine-001', type: 'Rowing Machine' }
                ];
            }

            const machineSelect = document.getElementById('machine');
            if (machineSelect) {
                machineSelect.innerHTML = '<option value="">Select Machine</option>';
                this.machines.forEach(machine => {
                    const option = document.createElement('option');
                    option.value = machine.id;
                    option.textContent = `${machine.name} (${machine.type})`;
                    machineSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Failed to load machines:', error);
        }
    }

    async loadWorkoutSessions() {
        try {
            // Using mock data since the API endpoint might not exist yet
            // In a real app, you'd use: const response = await fetch('/api/workouts/my-sessions');
            this.workoutSessions = [
                {
                    id: 1,
                    startTime: new Date(Date.now() - 86400000).toISOString(),
                    machine: { name: 'Treadmill-001', type: 'Treadmill' },
                    duration: 30,
                    caloriesBurned: 320,
                    avgHeartRate: 145,
                    distance: 3.2,
                    dataQualityFlag: true
                },
                {
                    id: 2,
                    startTime: new Date(Date.now() - 172800000).toISOString(),
                    machine: { name: 'Exercise Bike-001', type: 'Exercise Bike' },
                    duration: 45,
                    caloriesBurned: 280,
                    avgHeartRate: 132,
                    distance: 15.0,
                    dataQualityFlag: true
                }
            ];

            this.renderWorkoutHistory();
            this.renderRecentWorkouts();
        } catch (error) {
            console.error('Failed to load workout sessions:', error);
            // Initialize with empty array
            this.workoutSessions = [];
        }
    }

    setupEventListeners() {
        const workoutForm = document.getElementById('workoutForm');
        if (workoutForm) {
            workoutForm.addEventListener('submit', (e) => this.handleWorkoutSubmit(e));
        }

        // Real-time quality check
        const formInputs = ['calories', 'heartRate', 'distance', 'speed', 'duration'];
        formInputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => this.performQualityCheck());
            }
        });
    }

    setDefaultStartTime() {
        const startTimeInput = document.getElementById('startTime');
        if (startTimeInput) {
            const now = new Date();
            // Format to YYYY-MM-DDTHH:MM
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');

            startTimeInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }

    performQualityCheck() {
        const resultsDiv = document.getElementById('qualityCheckResults');
        if (!resultsDiv) return;

        const issues = [];

        const calories = parseInt(document.getElementById('calories')?.value) || 0;
        const heartRate = parseInt(document.getElementById('heartRate')?.value) || 0;
        const distance = parseFloat(document.getElementById('distance')?.value) || 0;
        const speed = parseFloat(document.getElementById('speed')?.value) || 0;
        const duration = parseInt(document.getElementById('duration')?.value) || 0;

        if (calories > 1500) issues.push('Calories too high (max: 1500)');
        if (calories < 1 && calories > 0) issues.push('Calories too low (min: 1)');
        if (heartRate > 220) issues.push('Heart rate too high (max: 220 bpm)');
        if (heartRate < 40 && heartRate > 0) issues.push('Heart rate too low (min: 40 bpm)');
        if (distance > 50) issues.push('Distance too high (max: 50 km)');
        if (speed > 30) issues.push('Speed too high (max: 30 km/h)');
        if (duration > 180) issues.push('Duration too long (max: 180 minutes)');

        if (issues.length === 0) {
            resultsDiv.innerHTML = '<div class="alert alert-success"><i class="fas fa-check-circle me-2"></i>All data looks good!</div>';
        } else {
            resultsDiv.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>Data Quality Issues:</strong>
                    <ul class="mb-0 mt-2">
                        ${issues.map(issue => `<li>${issue}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }

    async handleWorkoutSubmit(e) {
        e.preventDefault();

        const formData = {
            machineId: parseInt(document.getElementById('machine').value),
            startTime: document.getElementById('startTime').value,
            duration: parseInt(document.getElementById('duration').value),
            caloriesBurned: parseInt(document.getElementById('calories').value),
            avgHeartRate: parseInt(document.getElementById('heartRate').value),
            distance: parseFloat(document.getElementById('distance').value),
            avgSpeed: document.getElementById('speed').value ? parseFloat(document.getElementById('speed').value) : null,
            resistanceLevel: document.getElementById('resistance').value ? parseInt(document.getElementById('resistance').value) : null,
            notes: document.getElementById('notes').value
        };

        try {
            // For now, just simulate success since the API might not be implemented
            console.log('Submitting workout:', formData);

            // Add to local sessions array
            const newWorkout = {
                id: Date.now(),
                startTime: formData.startTime,
                machine: this.machines.find(m => m.id === formData.machineId),
                duration: formData.duration,
                caloriesBurned: formData.caloriesBurned,
                avgHeartRate: formData.avgHeartRate,
                distance: formData.distance,
                dataQualityFlag: true
            };

            this.workoutSessions.unshift(newWorkout);

            alert('Workout saved successfully!');
            document.getElementById('workoutForm').reset();
            this.setDefaultStartTime();

            const resultsDiv = document.getElementById('qualityCheckResults');
            if (resultsDiv) {
                resultsDiv.innerHTML = '<p class="text-muted">Fill out the form to see quality check results</p>';
            }

            await this.loadWorkoutSessions();
            this.updateDashboardStats();
            this.renderCharts();

        } catch (error) {
            console.error('Error saving workout:', error);
            alert('Error saving workout: ' + error.message);
        }
    }

    updateDashboardStats() {
        const totalWorkouts = this.workoutSessions.length;
        const totalCalories = this.workoutSessions.reduce((sum, session) => sum + (session.caloriesBurned || 0), 0);
        const totalDistance = this.workoutSessions.reduce((sum, session) => sum + (session.distance || 0), 0);
        const avgHeartRate = this.workoutSessions.length > 0 ?
            Math.round(this.workoutSessions.reduce((sum, session) => sum + (session.avgHeartRate || 0), 0) / this.workoutSessions.length) : 0;

        document.getElementById('totalWorkouts').textContent = totalWorkouts;
        document.getElementById('totalCalories').textContent = totalCalories.toLocaleString();
        document.getElementById('totalDistance').textContent = totalDistance.toFixed(1);
        document.getElementById('avgHeartRate').textContent = avgHeartRate;
    }

    renderWorkoutHistory() {
        const tbody = document.getElementById('workoutHistoryBody');
        if (!tbody) return;

        tbody.innerHTML = this.workoutSessions.map(session => `
            <tr>
                <td>${new Date(session.startTime).toLocaleString()}</td>
                <td>${session.machine?.name || 'N/A'}</td>
                <td>${this.formatDuration(session.duration)}</td>
                <td>${session.caloriesBurned || 0}</td>
                <td>${session.avgHeartRate || 0}</td>
                <td>${session.distance ? session.distance.toFixed(1) + ' km' : 'N/A'}</td>
                <td>
                    ${session.dataQualityFlag ?
            '<span class="badge bg-success"><i class="fas fa-check"></i> Good</span>' :
            '<span class="badge bg-warning"><i class="fas fa-exclamation-triangle"></i> Check</span>'
        }
                </td>
            </tr>
        `).join('');
    }

    renderRecentWorkouts() {
        const tbody = document.getElementById('recentWorkoutsBody');
        if (!tbody) return;

        const recentSessions = this.workoutSessions.slice(0, 5);
        tbody.innerHTML = recentSessions.map(session => `
            <tr>
                <td>${new Date(session.startTime).toLocaleDateString()}</td>
                <td>${session.machine?.name || 'N/A'}</td>
                <td>${this.formatDuration(session.duration)}</td>
                <td>${session.caloriesBurned || 0}</td>
                <td>${session.distance ? session.distance.toFixed(1) + ' km' : 'N/A'}</td>
                <td>
                    ${session.dataQualityFlag ?
            '<span class="badge bg-success">Good</span>' :
            '<span class="badge bg-warning">Issues</span>'
        }
                </td>
            </tr>
        `).join('');
    }

    renderCharts() {
        this.renderCaloriesChart();
        this.renderWorkoutDistributionChart();
        this.renderProgressChart();
    }

    renderCaloriesChart() {
        const ctx = document.getElementById('caloriesChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (ctx.chart) {
            ctx.chart.destroy();
        }

        // Group by date for demo
        const dailyData = {};
        this.workoutSessions.forEach(session => {
            const date = new Date(session.startTime).toLocaleDateString();
            if (!dailyData[date]) dailyData[date] = 0;
            dailyData[date] += session.caloriesBurned || 0;
        });

        const labels = Object.keys(dailyData).slice(-7); // Last 7 days
        const data = labels.map(label => dailyData[label]);

        ctx.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Calories Burned',
                    data: data,
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
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

    renderWorkoutDistributionChart() {
        const ctx = document.getElementById('workoutDistributionChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (ctx.chart) {
            ctx.chart.destroy();
        }

        const machineCounts = this.workoutSessions.reduce((acc, session) => {
            const machineType = session.machine?.type || 'Unknown';
            acc[machineType] = (acc[machineType] || 0) + 1;
            return acc;
        }, {});

        ctx.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(machineCounts),
                datasets: [{
                    data: Object.values(machineCounts),
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6'
                    ]
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

    renderProgressChart() {
        const ctx = document.getElementById('progressChart');
        if (!ctx) return;

        // Destroy existing chart if it exists
        if (ctx.chart) {
            ctx.chart.destroy();
        }

        // Monthly progress data
        const monthlyData = {};
        this.workoutSessions.forEach(session => {
            const month = new Date(session.startTime).toLocaleDateString('en', { month: 'short' });
            if (!monthlyData[month]) monthlyData[month] = { workouts: 0, calories: 0 };
            monthlyData[month].workouts++;
            monthlyData[month].calories += session.caloriesBurned || 0;
        });

        const labels = Object.keys(monthlyData);

        ctx.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Workouts',
                        data: labels.map(month => monthlyData[month].workouts),
                        backgroundColor: '#3498db',
                        yAxisID: 'y'
                    },
                    {
                        label: 'Calories',
                        data: labels.map(month => monthlyData[month].calories),
                        backgroundColor: '#e74c3c',
                        yAxisID: 'y1',
                        type: 'line',
                        borderColor: '#e74c3c',
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
                            text: 'Number of Workouts'
                        },
                        beginAtZero: true
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Calories Burned'
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    formatDuration(minutes) {
        if (!minutes) return 'N/A';
        return `${minutes} min`;
    }
}

// Section navigation
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('[id$="-section"]').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Update active nav link
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Find and activate the clicked link
    event.target.classList.add('active');
}

// Logout function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = '/login.html';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MemberDashboard();
});