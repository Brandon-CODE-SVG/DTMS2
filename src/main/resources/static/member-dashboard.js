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
                const result = await response.json();
                this.machines = result.machines || [];
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
            const response = await fetch('/api/workouts/my-sessions');
            if (response.ok) {
                const sessions = await response.json();
                console.log('Loaded sessions:', sessions);

                // Ensure sessions is an array
                this.workoutSessions = Array.isArray(sessions) ? sessions : [];

                this.renderWorkoutHistory();
                this.renderRecentWorkouts();
                this.updateDashboardStats();
                this.renderCharts();
            } else {
                console.error('Failed to load workout sessions:', response.status);
                this.workoutSessions = [];
            }
        } catch (error) {
            console.error('Failed to load workout sessions:', error);
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

        console.log('Submitting workout data:', formData);

        try {
            const response = await fetch('/api/workouts/simple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                alert('Workout saved successfully!');
                document.getElementById('workoutForm').reset();
                this.setDefaultStartTime();

                const resultsDiv = document.getElementById('qualityCheckResults');
                if (resultsDiv) {
                    resultsDiv.innerHTML = '<p class="text-muted">Fill out the form to see quality check results</p>';
                }

                // Reload the sessions from the server
                await this.loadWorkoutSessions();

                // Show dashboard section after successful save - FIXED: use this.showSection
                this.showSection('dashboard');
            } else {
                alert('Error saving workout: ' + result.message);
            }

        } catch (error) {
            console.error('Error saving workout:', error);
            alert('Error saving workout: ' + error.message);
        }
    }

    updateDashboardStats() {
        console.log('Updating stats with sessions:', this.workoutSessions);

        const totalWorkouts = this.workoutSessions.length;
        const totalCalories = this.workoutSessions.reduce((sum, session) => sum + (session.caloriesBurned || 0), 0);
        const totalDistance = this.workoutSessions.reduce((sum, session) => sum + (session.distance || 0), 0);

        // Calculate average heart rate safely
        const validHeartRates = this.workoutSessions
            .filter(session => session.avgHeartRate && session.avgHeartRate > 0)
            .map(session => session.avgHeartRate);

        const avgHeartRate = validHeartRates.length > 0 ?
            Math.round(validHeartRates.reduce((sum, rate) => sum + rate, 0) / validHeartRates.length) : 0;

        // Update DOM elements
        const totalWorkoutsEl = document.getElementById('totalWorkouts');
        const totalCaloriesEl = document.getElementById('totalCalories');
        const totalDistanceEl = document.getElementById('totalDistance');
        const avgHeartRateEl = document.getElementById('avgHeartRate');

        if (totalWorkoutsEl) totalWorkoutsEl.textContent = totalWorkouts;
        if (totalCaloriesEl) totalCaloriesEl.textContent = totalCalories.toLocaleString();
        if (totalDistanceEl) totalDistanceEl.textContent = totalDistance.toFixed(1);
        if (avgHeartRateEl) avgHeartRateEl.textContent = avgHeartRate;

        console.log('Stats updated:', { totalWorkouts, totalCalories, totalDistance, avgHeartRate });
    }

    renderWorkoutHistory() {
        const tbody = document.getElementById('workoutHistoryBody');
        if (!tbody) return;

        if (this.workoutSessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No workout sessions found</td></tr>';
            return;
        }

        tbody.innerHTML = this.workoutSessions.map(session => {
            // Safely handle the data
            const startTime = session.startTime ? new Date(session.startTime) : new Date();
            const machineName = session.machine ? (session.machine.name || 'N/A') : 'N/A';
            const duration = this.formatDuration(session.duration);
            const calories = session.caloriesBurned || 0;
            const heartRate = session.avgHeartRate || 0;
            const distance = session.distance ? session.distance.toFixed(1) + ' km' : 'N/A';
            const qualityStatus = session.dataQualityFlag !== false;

            return `
                <tr>
                    <td>${startTime.toLocaleString()}</td>
                    <td>${machineName}</td>
                    <td>${duration}</td>
                    <td>${calories}</td>
                    <td>${heartRate}</td>
                    <td>${distance}</td>
                    <td>
                        ${qualityStatus ?
                '<span class="badge bg-success"><i class="fas fa-check"></i> Good</span>' :
                '<span class="badge bg-warning"><i class="fas fa-exclamation-triangle"></i> Check</span>'
            }
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderRecentWorkouts() {
        const tbody = document.getElementById('recentWorkoutsBody');
        if (!tbody) return;

        if (this.workoutSessions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No recent workouts</td></tr>';
            return;
        }

        const recentSessions = this.workoutSessions.slice(0, 5);
        tbody.innerHTML = recentSessions.map(session => {
            const startTime = session.startTime ? new Date(session.startTime) : new Date();
            const machineName = session.machine ? (session.machine.name || 'N/A') : 'N/A';
            const duration = this.formatDuration(session.duration);
            const calories = session.caloriesBurned || 0;
            const distance = session.distance ? session.distance.toFixed(1) + ' km' : 'N/A';
            const qualityStatus = session.dataQualityFlag !== false;

            return `
                <tr>
                    <td>${startTime.toLocaleDateString()}</td>
                    <td>${machineName}</td>
                    <td>${duration}</td>
                    <td>${calories}</td>
                    <td>${distance}</td>
                    <td>
                        ${qualityStatus ?
                '<span class="badge bg-success">Good</span>' :
                '<span class="badge bg-warning">Issues</span>'
            }
                    </td>
                </tr>
            `;
        }).join('');
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

        // Group by date
        const dailyData = {};
        this.workoutSessions.forEach(session => {
            if (session.startTime && session.caloriesBurned) {
                const date = new Date(session.startTime).toLocaleDateString();
                dailyData[date] = (dailyData[date] || 0) + session.caloriesBurned;
            }
        });

        const labels = Object.keys(dailyData).slice(-7); // Last 7 days
        const data = labels.map(label => dailyData[label]);

        // Only create chart if we have data
        if (labels.length > 0 && data.length > 0) {
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

        const labels = Object.keys(machineCounts);
        const data = Object.values(machineCounts);

        // Only create chart if we have data
        if (labels.length > 0 && data.length > 0) {
            ctx.chart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
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
            if (session.startTime) {
                const month = new Date(session.startTime).toLocaleDateString('en', { month: 'short', year: 'numeric' });
                if (!monthlyData[month]) monthlyData[month] = { workouts: 0, calories: 0 };
                monthlyData[month].workouts++;
                monthlyData[month].calories += session.caloriesBurned || 0;
            }
        });

        const labels = Object.keys(monthlyData);
        const workoutData = labels.map(month => monthlyData[month].workouts);
        const calorieData = labels.map(month => monthlyData[month].calories);

        // Only create chart if we have data
        if (labels.length > 0 && workoutData.length > 0) {
            ctx.chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Workouts',
                            data: workoutData,
                            backgroundColor: '#3498db',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Calories',
                            data: calorieData,
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
    }

    formatDuration(duration) {
        if (!duration) return 'N/A';

        // Handle Duration object (if it's from Java)
        if (typeof duration === 'object' && duration.seconds !== undefined) {
            const minutes = Math.floor(duration.seconds / 60);
            return `${minutes} min`;
        }

        // Handle number (minutes)
        if (typeof duration === 'number') {
            return `${duration} min`;
        }

        // Handle string
        if (typeof duration === 'string') {
            return duration;
        }

        return 'N/A';
    }

    // FIXED: Add showSection method to the class
    showSection(sectionName) {
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

        // Find and activate the clicked link - safely
        const clickedLink = document.querySelector(`[onclick*="${sectionName}"]`);
        if (clickedLink) {
            clickedLink.classList.add('active');
        }
    }
}

// FIXED: Update the global showSection function to handle the event properly
function showSection(sectionName, event) {
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

    // Find and activate the clicked link - safely handle event
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: find link by section name
        const clickedLink = document.querySelector(`[onclick*="${sectionName}"]`);
        if (clickedLink) {
            clickedLink.classList.add('active');
        }
    }
}

// Logout function
async function logout() {
    try {
        console.log('Attempting logout...');

        // Try API logout first
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            if (response.ok) {
                console.log('API logout successful');
            }
        } catch (apiError) {
            console.log('API logout failed, using direct logout:', apiError);
        }

        // Clear local storage
        localStorage.clear();
        sessionStorage.clear();

        // Always redirect to logout endpoint
        window.location.href = '/logout';

    } catch (error) {
        console.error('Logout error:', error);
        // Fallback: redirect to login
        window.location.href = '/login';
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new MemberDashboard();
});