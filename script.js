// Add at the beginning of your script.js
console.log("Bootstrap available:", typeof bootstrap !== 'undefined');
console.log("FullCalendar available:", typeof FullCalendar !== 'undefined');
console.log("Chart.js available:", typeof Chart !== 'undefined');

// Load and display dashboard data
function loadDashboardData() {
    console.log("Loading dashboard data...");
    
    // Update dashboard statistics
    updateDashboardStats();
    
    // Display room overview
    displayRoomsOverview();
    
    // Display today's bookings
    displayTodayBookings();
}

// Update dashboard statistics
function updateDashboardStats() {
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    
    // Get current date and time
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Count today's bookings
    const todayBookings = bookings.filter(booking => booking.date === todayStr);
    document.querySelector('#totalBookingsToday').textContent = todayBookings.length;
    document.querySelector('#todayBookingsCount').textContent = todayBookings.length;
    
    // Count available rooms (not currently booked)
    let availableCount = 0;
    rooms.forEach(room => {
        const isBooked = todayBookings.some(booking => 
            booking.roomId === room.id && 
            booking.startTime <= currentTime && 
            booking.endTime > currentTime
        );
        if (!isBooked && room.status === 'active') {
            availableCount++;
        }
    });
    document.querySelector('#availableRoomsCount').textContent = availableCount;
    
    // Calculate total capacity
    const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
    document.querySelector('#totalCapacity').textContent = totalCapacity;
    
    // Calculate current utilization rate
    const activeRooms = rooms.filter(room => room.status === 'active');
    const bookedRooms = activeRooms.filter(room => 
        todayBookings.some(booking => 
            booking.roomId === room.id && 
            booking.startTime <= currentTime && 
            booking.endTime > currentTime
        )
    );
    
    const utilizationRate = activeRooms.length > 0 
        ? Math.round((bookedRooms.length / activeRooms.length) * 100) 
        : 0;
    
    document.querySelector('#utilizationRate').textContent = `${utilizationRate}%`;
}

// Display rooms overview
function displayRoomsOverview() {
    const roomsOverviewContainer = document.querySelector('#roomsOverview');
    roomsOverviewContainer.innerHTML = '';
    
    // Get rooms from localStorage
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    // Get current bookings to determine room status
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    const todayBookings = bookings.filter(booking => booking.date === todayStr);
    
    // Create room cards
    rooms.forEach(room => {
        // Skip inactive rooms
        if (room.status !== 'active') return;
        
        // Check if room is currently occupied
        const currentBooking = todayBookings.find(booking => 
            booking.roomId === room.id && 
            booking.startTime <= currentTime && 
            booking.endTime > currentTime
        );
        
        // Determine status and style
        let statusClass = 'status-available';
        let statusText = 'Available';
        let statusIcon = 'fas fa-check-circle';
        
        if (currentBooking) {
            statusClass = 'status-occupied';
            statusText = 'Occupied';
            statusIcon = 'fas fa-user-clock';
        } else {
            // Check if room will be occupied within the next hour
            const upcomingBooking = todayBookings.find(booking => 
                booking.roomId === room.id && 
                booking.startTime > currentTime && 
                booking.startTime <= addMinutesToTime(currentTime, 60)
            );
            
            if (upcomingBooking) {
                statusClass = 'status-soon';
                statusText = 'Available (Booked Soon)';
                statusIcon = 'fas fa-clock';
            }
        }
        
        // Create room features markup
        const featuresHTML = room.features.map(feature => {
            let featureIcon = 'fas fa-check';
            
            // Assign appropriate icons for common features
            if (feature.includes('Projector')) featureIcon = 'fas fa-video';
            if (feature.includes('Whiteboard')) featureIcon = 'fas fa-chalkboard';
            if (feature.includes('TV')) featureIcon = 'fas fa-tv';
            if (feature.includes('Phone')) featureIcon = 'fas fa-phone-alt';
            if (feature.includes('Video')) featureIcon = 'fas fa-video-camera';
            
            return `<span class="room-feature"><i class="${featureIcon}"></i> ${feature}</span>`;
        }).join('');
        
        // Calculate utilization percentage for capacity bar
        let utilizationPercent = 0;
        if (currentBooking) {
            utilizationPercent = Math.min(100, Math.round((currentBooking.attendees / room.capacity) * 100));
        }
        
        // Create room card
        const roomCard = document.createElement('div');
        roomCard.className = 'col-lg-6 col-xl-4 mb-4';
        roomCard.innerHTML = `
            <div class="card room-card ${room.isEmergency ? 'emergency-room' : ''}">
                <div class="card-header">
                    <h5 class="card-title"><i class="fas fa-door-open"></i> ${room.name}</h5>
                    <span class="room-status ${statusClass}"><i class="${statusIcon}"></i> ${statusText}</span>
                </div>
                <div class="card-body">
                    <div class="capacity-indicator">
                        <i class="fas fa-users capacity-icon"></i>
                        <div class="capacity-bar">
                            <div class="capacity-fill" style="width: ${utilizationPercent}%"></div>
                        </div>
                        <span class="capacity-text">${currentBooking ? currentBooking.attendees : '0'}/${room.capacity}</span>
                    </div>
                    
                    <div class="room-features">
                        ${featuresHTML}
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        ${currentBooking ? 
                            `<small class="text-muted"><i class="far fa-clock"></i> Until ${currentBooking.endTime}</small>` : 
                            upcomingBooking ? 
                            `<small class="text-muted"><i class="far fa-clock"></i> Booked at ${upcomingBooking.startTime}</small>` : 
                            '<small class="text-muted"><i class="far fa-check-circle"></i> Available all day</small>'}
                            
                        <button class="btn btn-sm btn-outline-info" data-room-id="${room.id}" data-bs-toggle="tooltip" data-bs-title="View Room Details" onclick="showRoomDetails(${room.id})">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-primary btn-book-now" data-room-id="${room.id}">
                        <i class="fas fa-calendar-plus"></i> Book Now
                    </button>
                </div>
            </div>
        `;
        
        roomsOverviewContainer.appendChild(roomCard);
        
        // Add event listener to the Book Now button
        const bookNowBtn = roomCard.querySelector('.btn-book-now');
        bookNowBtn.addEventListener('click', function() {
            // Set the booking date to today
            document.querySelector('#bookingDate').value = todayStr;
            
            // Scroll to quick booking form
            document.querySelector('#quickBookingForm').scrollIntoView({ behavior: 'smooth' });
        });
    });
    
    // Show a message if no active rooms
    if (roomsOverviewContainer.children.length === 0) {
        roomsOverviewContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> No active rooms found. Please add rooms in the Admin Panel.
                </div>
            </div>
        `;
    }
}

// Display today's bookings
function displayTodayBookings() {
    const todayBookingsContainer = document.querySelector('#todayBookings');
    todayBookingsContainer.innerHTML = '';
    
    // Get today's date
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Get bookings from localStorage
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    const todayBookings = bookings.filter(booking => booking.date === todayStr);
    
    // Sort bookings by start time
    todayBookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Get rooms for reference
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    if (todayBookings.length === 0) {
        todayBookingsContainer.innerHTML = '<p class="text-muted text-center py-4"><i class="far fa-calendar-alt fa-2x mb-3"></i><br>No bookings for today.</p>';
        return;
    }
    
    // Get current time
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Create booking items
    todayBookings.forEach(booking => {
        const room = rooms.find(r => r.id === booking.roomId);
        
        // Determine booking status
        let statusBadge = '';
        if (booking.startTime <= currentTime && booking.endTime > currentTime) {
            statusBadge = '<span class="booking-badge bg-success">In Progress</span>';
        } else if (booking.startTime > currentTime) {
            statusBadge = '<span class="booking-badge bg-info">Upcoming</span>';
        } else {
            statusBadge = '<span class="booking-badge bg-secondary">Completed</span>';
        }
        
        const bookingItem = document.createElement('div');
        bookingItem.className = 'booking-item fade-in';
        bookingItem.style.borderColor = booking.color || '#4361ee';
        bookingItem.innerHTML = `
            ${statusBadge}
            <div class="booking-header">
                <h6>${booking.title}</h6>
                <span class="booking-time"><i class="far fa-clock"></i> ${booking.startTime} - ${booking.endTime}</span>
            </div>
            <p><strong>Room:</strong> ${room ? room.name : 'Unknown'}</p>
            <p><span class="badge bg-secondary"><i class="fas fa-users"></i> ${booking.attendees} attendees</span>
               ${booking.isRecurring ? '<span class="badge bg-info ms-2"><i class="fas fa-repeat"></i> Recurring</span>' : ''}
            </p>
            <p class="text-truncate">${booking.description || 'No description provided.'}</p>
            <div class="booking-actions">
                <button class="btn btn-sm btn-soft-primary" onclick="showBookingDetails(${booking.id})">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </div>
        `;
        
        todayBookingsContainer.appendChild(bookingItem);
    });
}

// Show room details modal
function showRoomDetails(roomId) {
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    const room = rooms.find(r => r.id === roomId);
    
    if (room) {
        const detailsContent = document.querySelector('#roomDetailsContent');
        
        // Format features with icons
        const featuresHTML = room.features.map(feature => {
            let featureIcon = 'fas fa-check';
            
            // Assign appropriate icons for common features
            if (feature.includes('Projector')) featureIcon = 'fas fa-video';
            if (feature.includes('Whiteboard')) featureIcon = 'fas fa-chalkboard';
            if (feature.includes('TV')) featureIcon = 'fas fa-tv';
            if (feature.includes('Phone')) featureIcon = 'fas fa-phone-alt';
            if (feature.includes('Video')) featureIcon = 'fas fa-video-camera';
            
            return `<li><i class="${featureIcon}"></i> ${feature}</li>`;
        }).join('');
        
        detailsContent.innerHTML = `
            <div class="text-center mb-4">
                <h4 class="fw-bold">${room.name}</h4>
                <span class="badge ${room.isEmergency ? 'bg-danger' : 'bg-primary'} mb-2">
                    ${room.isEmergency ? 'Emergency Room' : 'Standard Room'}
                </span>
            </div>
            
            <div class="row mb-3">
                <div class="col-6">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-users fa-2x text-primary me-3"></i>
                        <div>
                            <h6 class="mb-0">Capacity</h6>
                            <p class="mb-0 fs-5 fw-bold">${room.capacity} people</p>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-wrench fa-2x text-primary me-3"></i>
                        <div>
                            <h6 class="mb-0">Last Maintenance</h6>
                            <p class="mb-0">${formatDate(room.lastMaintenance)}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <h6 class="fw-bold mb-2">Features:</h6>
            <ul class="list-unstyled">
                ${featuresHTML}
            </ul>
            
            <div class="d-grid gap-2 mt-4">
                <button class="btn btn-primary" onclick="document.querySelector('[data-room-id=\\'${room.id}\\'].btn-book-now').click();">
                    <i class="fas fa-calendar-plus"></i> Book This Room
                </button>
            </div>
        `;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('roomDetailsModal'));
        modal.show();
    }
}

// Show booking details modal
function showBookingDetails(bookingId) {
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    const booking = bookings.find(b => b.id === bookingId);
    
    if (booking) {
        const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
        const room = rooms.find(r => r.id === booking.roomId);
        
        const detailsContent = document.querySelector('#bookingDetailsContent');
        
        // Determine booking status
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        
        let statusBadge = '';
        let statusText = '';
        
        if (booking.date < todayStr || (booking.date === todayStr && booking.endTime <= currentTime)) {
            statusBadge = 'bg-secondary';
            statusText = 'Completed';
        } else if (booking.date === todayStr && booking.startTime <= currentTime && booking.endTime > currentTime) {
            statusBadge = 'bg-success';
            statusText = 'In Progress';
        } else {
            statusBadge = 'bg-info';
            statusText = 'Upcoming';
        }
        
        detailsContent.innerHTML = `
            <div class="text-center mb-4">
                <h4 class="fw-bold">${booking.title}</h4>
                <span class="badge ${statusBadge} mb-2">${statusText}</span>
            </div>
            
            <div class="row mb-3">
                <div class="col-6">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-door-open fa-2x text-primary me-3"></i>
                        <div>
                            <h6 class="mb-0">Room</h6>
                            <p class="mb-0 fs-5 fw-bold">${room ? room.name : 'Unknown'}</p>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-users fa-2x text-primary me-3"></i>
                        <div>
                            <h6 class="mb-0">Attendees</h6>
                            <p class="mb-0 fs-5 fw-bold">${booking.attendees}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-6">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-calendar-day fa-2x text-primary me-3"></i>
                        <div>
                            <h6 class="mb-0">Date</h6>
                            <p class="mb-0">${formatDate(booking.date)}</p>
                        </div>
                    </div>
                </div>
                <div class="col-6">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-clock fa-2x text-primary me-3"></i>
                        <div>
                            <h6 class="mb-0">Time</h6>
                            <p class="mb-0">${booking.startTime} - ${booking.endTime}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            ${booking.isRecurring ? `
            <div class="alert alert-info">
                <i class="fas fa-repeat"></i> This is a recurring booking (${booking.recurringType}) until ${formatDate(booking.recurringUntil)}
            </div>
            ` : ''}
            
            <h6 class="fw-bold mb-2">Description:</h6>
            <p>${booking.description || 'No description provided.'}</p>
            
            <p class="text-muted mt-3">
                <small>Created by ${booking.createdBy} on ${new Date(booking.createdAt).toLocaleString()}</small>
            </p>
        `;
        
        // Set the booking ID for the action buttons
        document.querySelector('#cancelBookingBtn').setAttribute('data-booking-id', booking.id);
        document.querySelector('#editBookingBtn').setAttribute('data-booking-id', booking.id);
        
        // Show or hide action buttons based on booking status
        const modalFooter = document.querySelector('#bookingDetailsModal .modal-footer');
        if (statusText === 'Completed') {
            // For completed bookings, only show close button
            document.querySelector('#cancelBookingBtn').classList.add('d-none');
            document.querySelector('#editBookingBtn').classList.add('d-none');
        } else {
            // For upcoming or in-progress bookings, show all buttons
            document.querySelector('#cancelBookingBtn').classList.remove('d-none');
            document.querySelector('#editBookingBtn').classList.remove('d-none');
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('bookingDetailsModal'));
        modal.show();
    }
}

// Add or replace the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded - initializing app...");
    
    try {
        // Initialize the data store
        initializeDataStore();
        
        // Setup UI elements and event listeners
        setupUI();
        
        // Load and display initial data
        loadDashboardData();
        
        // Initialize tooltips
        initializeTooltips();
        
        // Initialize dark mode
        initializeDarkMode();
        
        console.log("App initialization complete!");
    } catch (error) {
        console.error("Error during app initialization:", error);
    }
});

// Data store keys for localStorage
const ROOMS_STORAGE_KEY = 'meeting_rooms';
const BOOKINGS_STORAGE_KEY = 'room_bookings';
const SETTINGS_STORAGE_KEY = 'system_settings';
const USER_SETTINGS_KEY = 'user_settings';

// Add this debugging code to verify data is properly initialized
console.log("Rooms initialized:", JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY)));
console.log("Bookings initialized:", JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY)));

// Initialize the data store with sample data if empty
function initializeDataStore() {
    // Check if rooms exist in localStorage
    if (!localStorage.getItem(ROOMS_STORAGE_KEY)) {
        // Sample meeting rooms with more detailed features
        const sampleRooms = [
            { 
                id: 1, 
                name: 'Chrome', 
                capacity: 10, 
                features: ['Projector', 'Whiteboard', 'Video Conferencing'], 
                status: 'active',
                lastMaintenance: '2025-02-15',
                image: 'chrome-room.jpg'
            },
            { 
                id: 2, 
                name: 'Firefox', 
                capacity: 6, 
                features: ['TV Screen', 'Conference Phone', 'Whiteboard'], 
                status: 'active',
                lastMaintenance: '2025-02-20',
                image: 'firefox-room.jpg'
            },
            { 
                id: 3, 
                name: 'Edge', 
                capacity: 4, 
                features: ['Whiteboard', 'Video Conferencing'], 
                status: 'active',
                lastMaintenance: '2025-02-18',
                image: 'edge-room.jpg'
            },
            { 
                id: 4, 
                name: 'Safari', 
                capacity: 8, 
                features: ['Projector', 'Conference Phone', 'TV Screen'],
                status: 'active',
                lastMaintenance: '2025-02-22',
                image: 'safari-room.jpg'
            },
            { 
                id: 5, 
                name: 'Opera', 
                capacity: 2, 
                features: ['TV Screen', 'Conference Phone'],
                status: 'active',
                lastMaintenance: '2025-02-25',
                image: 'opera-room.jpg'
            },
            { 
                id: 6, 
                name: 'Emergency Room', 
                capacity: 3, 
                features: ['Whiteboard', 'TV Screen'], 
                isEmergency: true,
                status: 'active',
                lastMaintenance: '2025-03-01',
                image: 'emergency-room.jpg'
            }
        ];
        
        // Save sample rooms to localStorage
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(sampleRooms));
    }
    
    // Check if bookings exist in localStorage
    if (!localStorage.getItem(BOOKINGS_STORAGE_KEY)) {
        // Sample bookings (set to today's date)
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        const sampleBookings = [
            {
                id: 1,
                roomId: 1,
                title: 'Team Meeting',
                date: today,
                startTime: '09:00',
                endTime: '10:00',
                attendees: 8,
                description: 'Weekly team sync-up',
                color: '#4361ee',
                isRecurring: true,
                recurringType: 'weekly',
                recurringUntil: '2025-04-30',
                status: 'confirmed',
                createdBy: 'User',
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                roomId: 3,
                title: 'Client Call',
                date: today,
                startTime: '11:00',
                endTime: '12:00',
                attendees: 3,
                description: 'Project status update',
                color: '#f72585',
                isRecurring: false,
                status: 'confirmed',
                createdBy: 'User',
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                roomId: 2,
                title: 'Product Demo',
                date: today,
                startTime: '14:00',
                endTime: '15:00',
                attendees: 5,
                description: 'New feature showcase',
                color: '#4cc9f0',
                isRecurring: false,
                status: 'confirmed',
                createdBy: 'User',
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                roomId: 4,
                title: 'Design Review',
                date: tomorrow,
                startTime: '10:00',
                endTime: '11:30',
                attendees: 6,
                description: 'Review UI/UX design proposals',
                color: '#f9c74f',
                isRecurring: false,
                status: 'confirmed',
                createdBy: 'User',
                createdAt: new Date().toISOString()
            }
        ];
        
        // Save sample bookings to localStorage
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(sampleBookings));
    }
    
    // Check if system settings exist in localStorage
    if (!localStorage.getItem(SETTINGS_STORAGE_KEY)) {
        // Sample system settings
        const systemSettings = {
            companyName: 'Your Company',
            systemTitle: 'Enterprise Meeting Manager',
            workingHoursStart: '09:00',
            workingHoursEnd: '18:00',
            timeSlotDuration: 30,
            maxBookingDuration: 180,
            allowOverlap: true,
            requireApproval: false,
            enableEmailNotifications: false,
            darkModeDefault: false
        };
        
        // Save system settings to localStorage
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
    }
    
    // Check if user settings exist in localStorage
    if (!localStorage.getItem(USER_SETTINGS_KEY)) {
        // Sample user settings
        const userSettings = {
            userName: 'User',
            userEmail: 'user@example.com',
            defaultDuration: 30,
            reminderTime: 15,
            enableNotifications: true,
            darkMode: false,
            emailNotifications: {
                newBooking: true,
                bookingReminder: true,
                bookingCancellation: true,
                adminChanges: false
            },
            browserNotifications: {
                newBooking: true,
                bookingReminder: true,
                roomAvailable: false
            }
        };
        
        // Save user settings to localStorage
        localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(userSettings));
    }
}

// Setup UI elements and event listeners
function setupUI() {
    // Sidebar toggle functionality
    document.querySelector('#sidebarCollapse').addEventListener('click', function() {
        document.querySelector('#sidebar').classList.toggle('active');
    });
    
    document.querySelector('#sidebarCollapseBtn').addEventListener('click', function() {
        document.querySelector('#sidebar').classList.toggle('active');
    });
    
    // Navigation menu event listeners
    document.querySelector('#viewRoomsBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('dashboardView');
    });
    
    document.querySelector('#bookRoomBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('dashboardView');
        // Focus on the quick booking form
        document.querySelector('#bookingDate').focus();
    });
    
    document.querySelector('#calendarViewBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('calendarView');
        initializeCalendar();
    });
    
    document.querySelector('#roomStatusBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('roomStatusView');
        loadRoomStatusData();
    });
    
    document.querySelector('#manageBookingsBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('myBookingsView');
        loadMyBookingsData();
    });
    
    document.querySelector('#adminPanelBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('adminPanelView');
        loadAdminPanelData();
    });
    
    document.querySelector('#analyticsBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('analyticsView');
        loadAnalyticsData();
    });
    
    document.querySelector('#settingsBtn').addEventListener('click', function(e) {
        e.preventDefault();
        showSection('settingsView');
        loadUserSettings();
    });
    
    // Form event listeners
    document.querySelector('#quickBookingForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleQuickBookingSubmit();
    });
    
    document.querySelector('#addRoomForm').addEventListener('submit', function(e) {
        e.preventDefault();
        handleAddRoomSubmit();
    });
    
    document.querySelector('#confirmBookingBtn').addEventListener('click', function() {
        handleBookingConfirmation();
    });
    
    document.querySelector('#cancelBookingBtn').addEventListener('click', function() {
        const bookingId = parseInt(this.getAttribute('data-booking-id'), 10);
        if (bookingId && confirm('Are you sure you want to cancel this booking?')) {
            cancelBooking(bookingId);
            const modal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
            modal.hide();
            showNotification('Booking Cancelled', 'The booking has been successfully cancelled', 'danger');
        }
    });
    
    document.querySelector('#editBookingBtn').addEventListener('click', function() {
        const bookingId = parseInt(this.getAttribute('data-booking-id'), 10);
        if (bookingId) {
            // Hide the details modal
            const detailsModal = bootstrap.Modal.getInstance(document.getElementById('bookingDetailsModal'));
            detailsModal.hide();
            
            // Populate and show the booking modal for editing
            populateBookingModalForEdit(bookingId);
        }
    });
    
    // Recurring booking checkbox toggle
    document.querySelector('#bookingRecurring').addEventListener('change', function() {
        document.querySelector('#recurringOptions').classList.toggle('d-none', !this.checked);
    });
    
    // Refresh buttons
    document.querySelector('#refreshRoomsBtn').addEventListener('click', function() {
        loadDashboardData();
        showNotification('Refreshed', 'Room data has been refreshed', 'info');
    });
    
    document.querySelector('#refreshStatusBtn').addEventListener('click', function() {
        loadRoomStatusData();
        showNotification('Refreshed', 'Room status has been refreshed', 'info');
    });
    
    // Create booking button
    document.querySelector('#createBookingBtn').addEventListener('click', function() {
        showSection('dashboardView');
        document.querySelector('#quickBookingForm').scrollIntoView({ behavior: 'smooth' });
        document.querySelector('#bookingDate').focus();
    });
    
    // Settings form submission
    document.querySelector('#systemSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveSystemSettings();
    });
    
    document.querySelector('#userSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveUserSettings();
    });
    
    document.querySelector('#notificationSettingsForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveNotificationSettings();
    });
    
    // Dark mode toggle
    document.querySelector('#darkModeToggle').addEventListener('click', function() {
        toggleDarkMode();
    });
    
    // Set default date to today for booking
    const today = new Date().toISOString().split('T')[0];
    document.querySelector('#bookingDate').value = today;
    
    // Set minimum date for recurring booking to today
    document.querySelector('#recurringUntil').min = today;
    
    // Set default recurring until date to 1 month from now
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    document.querySelector('#recurringUntil').value = nextMonth.toISOString().split('T')[0];
    
    // Update current date and time
    updateDateTime();
    setInterval(updateDateTime, 60000); // Update every minute
    
    // Bootstrap tooltip initialization for dynamically added elements
    document.body.addEventListener('mouseover', function(e) {
        if (e.target.dataset.bsToggle === 'tooltip' && !e.target._tippy) {
            tippy(e.target, {
                content: e.target.getAttribute('title') || e.target.getAttribute('data-bs-title'),
                placement: e.target.getAttribute('data-bs-placement') || 'top',
                allowHTML: true
            });
        }
    });
}

// Show active section and hide others
function showSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelector(`#${sectionId}`).classList.add('active');
    
    // Update the active sidebar item
    document.querySelectorAll('#sidebar li').forEach(item => {
        item.classList.remove('active');
    });
    
    // Highlight the corresponding sidebar item
    switch (sectionId) {
        case 'dashboardView':
            document.querySelector('#viewRoomsBtn').closest('li').classList.add('active');
            break;
        case 'calendarView':
            document.querySelector('#calendarViewBtn').closest('li').classList.add('active');
            break;
        case 'roomStatusView':
            document.querySelector('#roomStatusBtn').closest('li').classList.add('active');
            break;
        case 'myBookingsView':
            document.querySelector('#manageBookingsBtn').closest('li').classList.add('active');
            break;
        case 'adminPanelView':
            document.querySelector('#adminPanelBtn').closest('li').classList.add('active');
            break;
        case 'analyticsView':
            document.querySelector('#analyticsBtn').closest('li').classList.add('active');
            break;
        case 'settingsView':
            document.querySelector('#settingsBtn').closest('li').classList.add('active');
            break;
    }
    
    // Collapse sidebar on mobile after selection
    if (window.innerWidth < 992) {
        document.querySelector('#sidebar').classList.add('active');
    }
}

// Initialize tooltips
function initializeTooltips() {
    document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => {
        tippy(el, {
            content: el.getAttribute('title') || el.getAttribute('data-bs-title'),
            placement: el.getAttribute('data-bs-placement') || 'top',
            allowHTML: true
        });
    });
}

// Initialize dark mode
function initializeDarkMode() {
    const userSettings = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || '{"darkMode": false}');
    if (userSettings.darkMode) {
        document.body.classList.add('dark-mode');
        document.querySelector('#darkMode').checked = true;
        document.querySelector('#darkModeToggle i').classList.remove('fa-moon');
        document.querySelector('#darkModeToggle i').classList.add('fa-sun');
    }
}

// Toggle dark mode
function toggleDarkMode() {
    const isDarkMode = document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode');
    
    // Update icon
    const icon = document.querySelector('#darkModeToggle i');
    if (isDarkMode) {
        icon.classList.remove('fa-sun');
        icon.classList.add('fa-moon');
    } else {
        icon.classList.remove('fa-moon');
        icon.classList.add('fa-sun');
    }
    
    // Update settings checkbox
    const darkModeCheckbox = document.querySelector('#darkMode');
    if (darkModeCheckbox) {
        darkModeCheckbox.checked = !isDarkMode;
    }
    
    // Save preference to user settings
    const userSettings = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || '{}');
    userSettings.darkMode = !isDarkMode;
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(userSettings));
    
    // Show notification
    showNotification(
        'Display Mode Changed', 
        `Switched to ${!isDarkMode ? 'dark' : 'light'} mode`, 
        'info'
    );
}

// Update date and time in the header
function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    document.querySelector('#currentDateTime').innerHTML = `<i class="far fa-clock"></i> ${now.toLocaleDateString('en-US', options)}`;
}

// Load and display dashboard data
function loadDashboardData() {
    // Display room overview
    displayRoomsOverview();
    
    // Display today's bookings
    displayTodayBookings();
}

// Display rooms overview
function displayRoomsOverview() {
    console.log("Displaying room overview...");
    const roomsOverviewContainer = document.querySelector('#roomsOverview');

    // Make sure the container exists
    if (!roomsOverviewContainer) {
        console.error("Room overview container not found!");
        return;
    }
    
    roomsOverviewContainer.innerHTML = '';
    
    // Get rooms from localStorage
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY) || '[]');
    console.log("Rooms loaded for display:", rooms);
    
    if (rooms.length === 0) {
        roomsOverviewContainer.innerHTML = '<div class="col-12"><div class="alert alert-warning">No rooms found. Please add rooms in the Admin Panel.</div></div>';
        return;
    }
    
    // Get current bookings to determine room status
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    const todayBookings = bookings.filter(booking => booking.date === todayStr);
    
    // Create room cards
    rooms.forEach(room => {
        // Check if room is currently occupied
        const currentBooking = todayBookings.find(booking => 
            booking.roomId === room.id && 
            booking.startTime <= currentTime && 
            booking.endTime > currentTime
        );
        
        // Determine status and style
        let statusClass = 'status-available';
        let statusText = 'Available';
        
        if (currentBooking) {
            statusClass = 'status-occupied';
            statusText = 'Occupied';
        } else {
            // Check if room will be occupied within the next hour
            const upcomingBooking = todayBookings.find(booking => 
                booking.roomId === room.id && 
                booking.startTime > currentTime && 
                booking.startTime <= addMinutesToTime(currentTime, 60)
            );
            
            if (upcomingBooking) {
                statusClass = 'status-soon';
                statusText = 'Available (Booked Soon)';
            }
        }
        
        // Create room card
        const roomCard = document.createElement('div');
        roomCard.className = 'col-md-6 col-xl-4 mb-3';
        roomCard.innerHTML = `
            <div class="card room-card h-100">
                <div class="card-header bg-light">
                    <h5 class="card-title mb-0">${room.name}</h5>
                </div>
                <div class="card-body">
                    <p class="card-text"><strong>Capacity:</strong> ${room.capacity} people</p>
                    <p class="card-text"><strong>Features:</strong> ${room.features.join(', ')}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="room-status ${statusClass}">${statusText}</span>
                        ${currentBooking ? 
                            `<small>Until ${currentBooking.endTime}</small>` : 
                            upcomingBooking ? 
                            `<small>Next: ${upcomingBooking.startTime}</small>` : 
                            ''}
                    </div>
                </div>
                <div class="card-footer text-center">
                    <button class="btn btn-sm btn-primary btn-book-now" data-room-id="${room.id}">Book Now</button>
                </div>
            </div>
        `;
        
        roomsOverviewContainer.appendChild(roomCard);
        
        // Add event listener to the Book Now button
        const bookNowBtn = roomCard.querySelector('.btn-book-now');
        bookNowBtn.addEventListener('click', function() {
            // Set the booking date to today
            document.querySelector('#bookingDate').value = todayStr;
            
            // Scroll to quick booking form
            document.querySelector('#quickBookingForm').scrollIntoView({ behavior: 'smooth' });
        });
    });
}

// Display today's bookings
function displayTodayBookings() {
    console.log("Displaying today's bookings...");
    const todayBookingsContainer = document.querySelector('#todayBookings');
    // Make sure the container exists
    if (!todayBookingsContainer) {
        console.error("Today's bookings container not found!");
        return;
    }
    
    todayBookingsContainer.innerHTML = '';
    
    // Get today's date
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Get bookings from localStorage
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY) || '[]');
    const todayBookings = bookings.filter(booking => booking.date === todayStr);

    console.log("Today's bookings:", todayBookings);
    
    // Sort bookings by start time
    todayBookings.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    // Get rooms for reference
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    if (todayBookings.length === 0) {
        todayBookingsContainer.innerHTML = '<p class="text-muted">No bookings for today.</p>';
        return;
    }
    
    // Create booking items
    todayBookings.forEach(booking => {
        const room = rooms.find(r => r.id === booking.roomId);
        
        const bookingItem = document.createElement('div');
        bookingItem.className = 'booking-item fade-in';
        bookingItem.innerHTML = `
            <h6>${booking.title}</h6>
            <p><strong>Room:</strong> ${room ? room.name : 'Unknown'}</p>
            <p><span class="booking-time">${booking.startTime} - ${booking.endTime}</span> <span class="badge bg-secondary">${booking.attendees} attendees</span></p>
            <p>${booking.description || 'No description provided.'}</p>
        `;
        
        todayBookingsContainer.appendChild(bookingItem);
    });
}

// Handle quick booking form submission
function handleQuickBookingSubmit() {
    const date = document.querySelector('#bookingDate').value;
    const startTime = document.querySelector('#startTime').value;
    const endTime = document.querySelector('#endTime').value;
    const attendees = parseInt(document.querySelector('#attendees').value, 10);
    
    // Validate times
    if (startTime >= endTime) {
        alert('End time must be after start time.');
        return;
    }
    
    // Find available rooms
    const availableRooms = findAvailableRooms(date, startTime, endTime, attendees);
    
    // Display available rooms
    displayAvailableRooms(availableRooms, date, startTime, endTime, attendees);
}

// Find available rooms for the given criteria
function findAvailableRooms(date, startTime, endTime, attendees) {
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    
    const availableRooms = [];
    
    // Filter bookings for the selected date
    const dateBookings = bookings.filter(booking => booking.date === date);
    
    // Check each room
    rooms.forEach(room => {
        // Skip rooms with insufficient capacity
        if (room.capacity < attendees) {
            return;
        }
        
        // Check if the room is available during the requested time slot
        const roomBookings = dateBookings.filter(booking => booking.roomId === room.id);
        
        const isAvailable = !roomBookings.some(booking => {
            // Check for time slot overlap
            return (startTime < booking.endTime && endTime > booking.startTime);
        });
        
        if (isAvailable) {
            availableRooms.push(room);
        }
    });
    
    // Sort rooms by capacity (ascending, to get closest match first)
    return availableRooms.sort((a, b) => a.capacity - b.capacity);
}

// Display available rooms
function displayAvailableRooms(availableRooms, date, startTime, endTime, attendees) {
    const availableRoomsSection = document.querySelector('#availableRoomsSection');
    const availableRoomsContainer = document.querySelector('#availableRooms');
    
    // Show the section
    availableRoomsSection.classList.remove('d-none');
    
    // Clear container
    availableRoomsContainer.innerHTML = '';
    
    if (availableRooms.length === 0) {
        availableRoomsContainer.innerHTML = `
            <div class="col-12">
                <div class="alert alert-warning" role="alert">
                    No rooms available for the selected criteria. Please try a different time or reduce the number of attendees.
                </div>
            </div>
        `;
        return;
    }
    
    // Create room cards
    availableRooms.forEach(room => {
        const roomCard = document.createElement('div');
        roomCard.className = 'col-md-4 mb-3';
        
        // Add special class for emergency room
        const emergencyClass = room.isEmergency ? 'emergency-room' : '';
        
        roomCard.innerHTML = `
            <div class="card room-card ${emergencyClass}">
                <div class="card-header">
                    <h5 class="card-title mb-0">${room.name}</h5>
                </div>
                <div class="card-body">
                    <p class="card-text"><strong>Capacity:</strong> ${room.capacity} people</p>
                    <p class="card-text"><strong>Features:</strong> ${room.features.join(', ')}</p>
                    <p class="card-text"><small class="text-muted">${room.isEmergency ? 'Emergency Room' : 'Regular Room'}</small></p>
                </div>
                <div class="card-footer text-center">
                    <button class="btn btn-success btn-book-room" data-room-id="${room.id}">Select Room</button>
                </div>
            </div>
        `;
        
        availableRoomsContainer.appendChild(roomCard);
        
        // Add event listener to the Book Room button
        const bookRoomBtn = roomCard.querySelector('.btn-book-room');
        bookRoomBtn.addEventListener('click', function() {
            showBookingModal(room.id, date, startTime, endTime, attendees);
        });
    });
    
    // Scroll to the available rooms section
    availableRoomsSection.scrollIntoView({ behavior: 'smooth' });
}

// Show booking confirmation modal
function showBookingModal(roomId, date, startTime, endTime, attendees) {
    const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
    
    // Set modal values
    document.querySelector('#modalRoomId').value = roomId;
    document.querySelector('#modalBookingDate').value = date;
    document.querySelector('#modalStartTime').value = startTime;
    document.querySelector('#modalEndTime').value = endTime;
    document.querySelector('#modalAttendees').value = attendees;
    
    // Clear previous input
    document.querySelector('#bookingTitle').value = '';
    document.querySelector('#bookingDescription').value = '';
    
    // Show modal
    modal.show();
}

// Handle booking confirmation
function handleBookingConfirmation() {
    const roomId = parseInt(document.querySelector('#modalRoomId').value, 10);
    const date = document.querySelector('#modalBookingDate').value;
    const startTime = document.querySelector('#modalStartTime').value;
    const endTime = document.querySelector('#modalEndTime').value;
    const attendees = parseInt(document.querySelector('#modalAttendees').value, 10);
    const title = document.querySelector('#bookingTitle').value;
    const description = document.querySelector('#bookingDescription').value;
    
    // Get current bookings
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    
    // Create new booking
    const newBooking = {
        id: generateBookingId(bookings),
        roomId: roomId,
        title: title,
        date: date,
        startTime: startTime,
        endTime: endTime,
        attendees: attendees,
        description: description,
        createdAt: new Date().toISOString()
    };
    
    // Add new booking
    bookings.push(newBooking);
    
    // Save to localStorage
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('bookingModal'));
    modal.hide();
    
    // Show success message
    alert('Booking confirmed successfully!');
    
    // Refresh dashboard data
    loadDashboardData();
    
    // Hide available rooms section
    document.querySelector('#availableRoomsSection').classList.add('d-none');
    
    // Reset booking form
    document.querySelector('#quickBookingForm').reset();
    document.querySelector('#bookingDate').value = new Date().toISOString().split('T')[0];
}

// Load room status data
function loadRoomStatusData() {
    const roomStatusTableBody = document.querySelector('#roomStatusTableBody');
    roomStatusTableBody.innerHTML = '';
    
    // Get rooms and bookings
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    
    // Get current date and time
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Filter today's bookings
    const todayBookings = bookings.filter(booking => booking.date === todayStr);
    
    // Create table rows for each room
    rooms.forEach(room => {
        // Find current booking
        const currentBooking = todayBookings.find(booking => 
            booking.roomId === room.id && 
            booking.startTime <= currentTime && 
            booking.endTime > currentTime
        );
        
        // Find next booking
        const futureBookings = todayBookings.filter(booking => 
            booking.roomId === room.id && 
            booking.startTime > currentTime
        ).sort((a, b) => a.startTime.localeCompare(b.startTime));
        
        const nextBooking = futureBookings.length > 0 ? futureBookings[0] : null;
        
        // Create row
        const row = document.createElement('tr');
        
        // Set row class based on status
        if (currentBooking) {
            row.className = 'table-danger';
        } else if (nextBooking && nextBooking.startTime <= addMinutesToTime(currentTime, 30)) {
            row.className = 'table-warning';
        } else {
            row.className = 'table-success';
        }
        
        row.innerHTML = `
            <td>${room.name}</td>
            <td>${room.capacity} people</td>
            <td>${currentBooking ? 'Occupied' : 'Available'}</td>
            <td>${currentBooking ? `${currentBooking.title} (until ${currentBooking.endTime})` : 'None'}</td>
            <td>${nextBooking ? `${nextBooking.startTime} - ${nextBooking.endTime}` : 'Rest of day'}</td>
        `;
        
        roomStatusTableBody.appendChild(row);
    });
}

// Load my bookings data
function loadMyBookingsData() {
    const myBookingsTableBody = document.querySelector('#myBookingsTableBody');
    myBookingsTableBody.innerHTML = '';
    
    // Get bookings and rooms
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    // Sort bookings by date and time
    const sortedBookings = [...bookings].sort((a, b) => {
        if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
        }
        return a.startTime.localeCompare(b.startTime);
    });
    
    // Get current date and time
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Create table rows for each booking
    sortedBookings.forEach(booking => {
        const room = rooms.find(r => r.id === booking.roomId);
        
        // Determine booking status
        let status = 'Upcoming';
        let statusClass = 'bg-info';
        
        if (booking.date < todayStr || (booking.date === todayStr && booking.endTime <= currentTime)) {
            status = 'Completed';
            statusClass = 'bg-secondary';
        } else if (booking.date === todayStr && booking.startTime <= currentTime && booking.endTime > currentTime) {
            status = 'In Progress';
            statusClass = 'bg-success';
        }
        
        // Create row
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(booking.date)}</td>
            <td>${room ? room.name : 'Unknown'}</td>
            <td>${booking.startTime} - ${booking.endTime}</td>
            <td>${booking.attendees}</td>
            <td><span class="badge ${statusClass}">${status}</span></td>
            <td>
                <button class="btn btn-sm btn-outline-info view-booking-btn" data-booking-id="${booking.id}">
                    <i class="fas fa-eye"></i>
                </button>
                ${status === 'Upcoming' ? `
                <button class="btn btn-sm btn-outline-danger cancel-booking-btn" data-booking-id="${booking.id}">
                    <i class="fas fa-times"></i>
                </button>
                ` : ''}
            </td>
        `;
        
        myBookingsTableBody.appendChild(row);
        
        // Add event listeners to buttons
        const viewBtn = row.querySelector('.view-booking-btn');
        viewBtn.addEventListener('click', function() {
            alert(`Booking Details:\nTitle: ${booking.title}\nDate: ${formatDate(booking.date)}\nTime: ${booking.startTime} - ${booking.endTime}\nRoom: ${room ? room.name : 'Unknown'}\nAttendees: ${booking.attendees}\nDescription: ${booking.description || 'None'}`);
        });
        
        if (status === 'Upcoming') {
            const cancelBtn = row.querySelector('.cancel-booking-btn');
            cancelBtn.addEventListener('click', function() {
                if (confirm('Are you sure you want to cancel this booking?')) {
                    cancelBooking(booking.id);
                }
            });
        }
    });
    
    // Display message if no bookings
    if (sortedBookings.length === 0) {
        myBookingsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No bookings found.</td>
            </tr>
        `;
    }
}

// Cancel a booking
function cancelBooking(bookingId) {
    let bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    
    // Filter out the booking to cancel
    bookings = bookings.filter(booking => booking.id !== bookingId);
    
    // Save updated bookings
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(bookings));
    
    // Refresh bookings data
    loadMyBookingsData();
    
    // Refresh dashboard if it's active
    if (document.querySelector('#dashboardView').classList.contains('active')) {
        loadDashboardData();
    }
}

// Load admin panel data
function loadAdminPanelData() {
    // Load rooms table
    loadRoomsTable();
    
    // Load all bookings table
    loadAllBookingsTable();
}

// Load rooms table in admin panel
function loadRoomsTable() {
    const roomsTableBody = document.querySelector('#roomsTableBody');
    roomsTableBody.innerHTML = '';
    
    // Get rooms
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    // Create table rows for each room
    rooms.forEach(room => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${room.name}</td>
            <td>${room.capacity}</td>
            <td>
                <button class="btn btn-sm btn-outline-warning edit-room-btn" data-room-id="${room.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-room-btn" data-room-id="${room.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        roomsTableBody.appendChild(row);
        
        // Add event listeners to buttons
        const editBtn = row.querySelector('.edit-room-btn');
        editBtn.addEventListener('click', function() {
            const newName = prompt('Enter new room name:', room.name);
            const newCapacity = prompt('Enter new room capacity:', room.capacity);
            
            if (newName && newCapacity) {
                editRoom(room.id, newName, parseInt(newCapacity, 10));
            }
        });
        
        const deleteBtn = row.querySelector('.delete-room-btn');
        deleteBtn.addEventListener('click', function() {
            if (confirm(`Are you sure you want to delete the room "${room.name}"?`)) {
                deleteRoom(room.id);
            }
        });
    });
}

// Load all bookings table in admin panel
function loadAllBookingsTable() {
    const allBookingsTableBody = document.querySelector('#allBookingsTableBody');
    allBookingsTableBody.innerHTML = '';
    
    // Get bookings and rooms
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    // Sort bookings by date and time
    const sortedBookings = [...bookings].sort((a, b) => {
        if (a.date !== b.date) {
            return a.date.localeCompare(b.date);
        }
        return a.startTime.localeCompare(b.startTime);
    });
    
    // Create table rows for each booking
    sortedBookings.forEach(booking => {
        const room = rooms.find(r => r.id === booking.roomId);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(booking.date)}</td>
            <td>${room ? room.name : 'Unknown'}</td>
            <td>${booking.startTime} - ${booking.endTime}</td>
            <td>${booking.attendees}</td>
            <td>
                <button class="btn btn-sm btn-outline-info view-booking-btn" data-booking-id="${booking.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-booking-btn" data-booking-id="${booking.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        allBookingsTableBody.appendChild(row);
        
        // Add event listeners to buttons
        const viewBtn = row.querySelector('.view-booking-btn');
        viewBtn.addEventListener('click', function() {
            alert(`Booking Details:\nTitle: ${booking.title}\nDate: ${formatDate(booking.date)}\nTime: ${booking.startTime} - ${booking.endTime}\nRoom: ${room ? room.name : 'Unknown'}\nAttendees: ${booking.attendees}\nDescription: ${booking.description || 'None'}`);
        });
        
        const deleteBtn = row.querySelector('.delete-booking-btn');
        deleteBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to delete this booking?')) {
                deleteBooking(booking.id);
            }
        });
    });
    
    // Display message if no bookings
    if (sortedBookings.length === 0) {
        allBookingsTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">No bookings found.</td>
            </tr>
        `;
    }
}

// Handle add room form submission
function handleAddRoomSubmit() {
    const roomName = document.querySelector('#roomName').value;
    const roomCapacity = parseInt(document.querySelector('#roomCapacity').value, 10);
    
    // Validate input
    if (!roomName || roomCapacity <= 0) {
        alert('Please enter a valid room name and capacity.');
        return;
    }
    
    // Get current rooms
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    // Check if room name already exists
    if (rooms.some(room => room.name.toLowerCase() === roomName.toLowerCase())) {
        alert('A room with this name already exists.');
        return;
    }
    
    // Create new room
    const newRoom = {
        id: generateRoomId(rooms),
        name: roomName,
        capacity: roomCapacity,
        features: ['Whiteboard'], // Default feature
        isEmergency: false
    };
    
    // Add new room
    rooms.push(newRoom);
    
    // Save to localStorage
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
    
    // Clear form
    document.querySelector('#roomName').value = '';
    document.querySelector('#roomCapacity').value = '';
    
    // Refresh rooms table
    loadRoomsTable();
    
    // Show success message
    alert('Room added successfully!');
}

// Edit a room
function editRoom(roomId, newName, newCapacity) {
    // Get current rooms
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    // Find and update the room
    const room = rooms.find(r => r.id === roomId);
    if (room) {
        room.name = newName;
        room.capacity = newCapacity;
        
        // Save to localStorage
        localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(rooms));
        
        // Refresh rooms table
        loadRoomsTable();
        
        // Show success message
        alert('Room updated successfully!');
    }
}

// Delete a room
function deleteRoom(roomId) {
    // Get current rooms
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY));
    
    // Get current bookings
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    
    // Check if there are any bookings for this room
    if (bookings.some(booking => booking.roomId === roomId)) {
        if (!confirm('This room has existing bookings. Deleting it will also delete all associated bookings. Continue?')) {
            return;
        }
        
        // Delete all bookings for this room
        const updatedBookings = bookings.filter(booking => booking.roomId !== roomId);
        localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updatedBookings));
    }
    
    // Remove the room
    const updatedRooms = rooms.filter(room => room.id !== roomId);
    
    // Save to localStorage
    localStorage.setItem(ROOMS_STORAGE_KEY, JSON.stringify(updatedRooms));
    
    // Refresh rooms table
    loadRoomsTable();
    
    // Refresh bookings table
    loadAllBookingsTable();
    
    // Show success message
    alert('Room deleted successfully!');
}

// Delete a booking
function deleteBooking(bookingId) {
    // Get current bookings
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY));
    
    // Remove the booking
    const updatedBookings = bookings.filter(booking => booking.id !== bookingId);
    
    // Save to localStorage
    localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(updatedBookings));
    
    // Refresh bookings table
    loadAllBookingsTable();
    
    // Show success message
    alert('Booking deleted successfully!');
}

// Helper function to generate a unique room ID
function generateRoomId(rooms) {
    return rooms.length > 0 ? Math.max(...rooms.map(room => room.id)) + 1 : 1;
}

// Helper function to generate a unique booking ID
function generateBookingId(bookings) {
    return bookings.length > 0 ? Math.max(...bookings.map(booking => booking.id)) + 1 : 1;
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

// Helper function to add minutes to a time string (HH:MM)
function addMinutesToTime(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(num => parseInt(num, 10));
    
    let totalMinutes = hours * 60 + mins + minutes;
    
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
}

// Initialize the booking calendar
function initializeCalendar() {
    const calendarEl = document.getElementById('bookingCalendar');
    
    if (!calendarEl) return;
    
    // Clear existing calendar if any
    calendarEl.innerHTML = '';
    
    // Get bookings and rooms
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY) || '[]');
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY) || '[]');
    
    // Format bookings for calendar
    const events = bookings.map(booking => {
        const room = rooms.find(r => r.id === booking.roomId);
        const roomName = room ? room.name : 'Unknown Room';
        
        // Determine date parts
        const dateParts = booking.date.split('-');
        const startTimeParts = booking.startTime.split(':');
        const endTimeParts = booking.endTime.split(':');
        
        // Create start and end date objects
        const startDate = new Date(
            parseInt(dateParts[0]), 
            parseInt(dateParts[1]) - 1, 
            parseInt(dateParts[2]),
            parseInt(startTimeParts[0]),
            parseInt(startTimeParts[1])
        );
        
        const endDate = new Date(
            parseInt(dateParts[0]), 
            parseInt(dateParts[1]) - 1, 
            parseInt(dateParts[2]),
            parseInt(endTimeParts[0]),
            parseInt(endTimeParts[1])
        );
        
        return {
            id: booking.id,
            title: `${booking.title} (${roomName})`,
            start: startDate,
            end: endDate,
            extendedProps: { booking },
            backgroundColor: booking.color || '#4361ee',
            borderColor: booking.color || '#4361ee'
        };
    });
    
    // Initialize FullCalendar
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        slotMinTime: '08:00:00',
        slotMaxTime: '20:00:00',
        allDaySlot: false,
        nowIndicator: true,
        dayMaxEvents: true,
        events: events,
        eventClick: function(info) {
            showBookingDetails(info.event.extendedProps.booking.id);
        },
        dateClick: function(info) {
            // Set booking date to the clicked date
            document.querySelector('#bookingDate').value = info.dateStr.split('T')[0];
            
            // Navigate to booking form
            showSection('dashboardView');
            document.querySelector('#quickBookingForm').scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    calendar.render();
}

// Load analytics data and initialize charts
function loadAnalyticsData() {
    // Get bookings and rooms
    const bookings = JSON.parse(localStorage.getItem(BOOKINGS_STORAGE_KEY) || '[]');
    const rooms = JSON.parse(localStorage.getItem(ROOMS_STORAGE_KEY) || '[]');
    
    // Update statistics
    updateAnalyticsStats(bookings, rooms);
    
    // Initialize charts
    initRoomUsageChart(bookings, rooms);
    initBookingTrendsChart(bookings);
    initPopularTimeSlotsChart(bookings);
    initIssuesChart();
}

// Update analytics statistics
function updateAnalyticsStats(bookings, rooms) {
    document.querySelector('#totalBookingsCount').textContent = bookings.length;
    
    // Calculate average attendees
    const avgAttendees = bookings.length > 0 
        ? Math.round(bookings.reduce((sum, booking) => sum + booking.attendees, 0) / bookings.length) 
        : 0;
    document.querySelector('#averageAttendees').textContent = avgAttendees;
    
    // Calculate average duration in minutes
    const avgDuration = bookings.length > 0 
        ? Math.round(bookings.reduce((sum, booking) => {
            const start = booking.startTime.split(':').map(Number);
            const end = booking.endTime.split(':').map(Number);
            const durationMins = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
            return sum + durationMins;
        }, 0) / bookings.length) 
        : 0;
    document.querySelector('#avgDuration').textContent = avgDuration;
    
    // Calculate room utilization
    const utilization = rooms.length > 0 
        ? Math.round((bookings.length / (rooms.length * 5)) * 100) // assuming 5 slots per room as example
        : 0;
    document.querySelector('#roomUtilization').textContent = `${utilization}%`;
}

// Initialize room usage chart
function initRoomUsageChart(bookings, rooms) {
    const ctx = document.getElementById('roomUsageChart').getContext('2d');
    
    // Count bookings per room
    const roomCounts = {};
    rooms.forEach(room => {
        roomCounts[room.id] = 0;
    });
    
    bookings.forEach(booking => {
        if (roomCounts[booking.roomId] !== undefined) {
            roomCounts[booking.roomId]++;
        }
    });
    
    // Prepare data
    const roomNames = rooms.map(room => room.name);
    const roomData = rooms.map(room => roomCounts[room.id]);
    
    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: roomNames,
            datasets: [{
                label: 'Number of Bookings',
                data: roomData,
                backgroundColor: 'rgba(67, 97, 238, 0.7)',
                borderColor: 'rgba(67, 97, 238, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    precision: 0
                }
            }
        }
    });
}

// Initialize booking trends chart
function initBookingTrendsChart(bookings) {
    const ctx = document.getElementById('bookingTrendsChart').getContext('2d');
    
    // Group bookings by date
    const dates = {};
    bookings.forEach(booking => {
        if (!dates[booking.date]) {
            dates[booking.date] = 0;
        }
        dates[booking.date]++;
    });
    
    // Sort dates
    const sortedDates = Object.keys(dates).sort();
    
    // Prepare data
    const dateLabels = sortedDates.map(date => formatDate(date));
    const bookingCounts = sortedDates.map(date => dates[date]);
    
    // Create chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dateLabels,
            datasets: [{
                label: 'Number of Bookings',
                data: bookingCounts,
                fill: false,
                borderColor: 'rgba(76, 201, 240, 1)',
                tension: 0.1,
                backgroundColor: 'rgba(76, 201, 240, 0.5)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Initialize popular time slots chart
function initPopularTimeSlotsChart(bookings) {
    const ctx = document.getElementById('popularTimeSlotsChart').getContext('2d');
    
    // Group bookings by hour
    const hours = {};
    for (let i = 8; i <= 18; i++) {
        hours[i] = 0;
    }
    
    bookings.forEach(booking => {
        const startHour = parseInt(booking.startTime.split(':')[0], 10);
        if (hours[startHour] !== undefined) {
            hours[startHour]++;
        }
    });
    
    // Prepare data
    const hourLabels = Object.keys(hours).map(hour => `${hour}:00`);
    const bookingCounts = Object.values(hours);
    
    // Create chart
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Bookings by Start Time',
                data: bookingCounts,
                backgroundColor: 'rgba(249, 199, 79, 0.7)',
                borderColor: 'rgba(249, 199, 79, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    precision: 0
                }
            }
        }
    });
}

// Initialize issues chart
function initIssuesChart() {
    const ctx = document.getElementById('issuesChart').getContext('2d');
    
    // Sample issues data
    const issuesData = [
        { issue: 'Double Booking', count: 3 },
        { issue: 'Room Unavailable', count: 5 },
        { issue: 'Equipment Failure', count: 2 },
        { issue: 'Late Start', count: 7 }
    ];
    
    // Prepare data
    const issueLabels = issuesData.map(item => item.issue);
    const issueCounts = issuesData.map(item => item.count);
    
    // Create chart
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: issueLabels,
            datasets: [{
                data: issueCounts,
                backgroundColor: [
                    'rgba(247, 37, 133, 0.7)',
                    'rgba(67, 97, 238, 0.7)',
                    'rgba(76, 201, 240, 0.7)',
                    'rgba(249, 199, 79, 0.7)'
                ],
                borderColor: [
                    'rgba(247, 37, 133, 1)',
                    'rgba(67, 97, 238, 1)',
                    'rgba(76, 201, 240, 1)',
                    'rgba(249, 199, 79, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Load user settings
function loadUserSettings() {
    const userSettings = JSON.parse(localStorage.getItem(USER_SETTINGS_KEY) || '{}');
    
    // Set values in the form
    document.querySelector('#userName').value = userSettings.userName || 'User';
    document.querySelector('#userEmail').value = userSettings.userEmail || 'user@example.com';
    document.querySelector('#defaultDuration').value = userSettings.defaultDuration || '30';
    document.querySelector('#reminderTime').value = userSettings.reminderTime || '15';
    document.querySelector('#enableNotifications').checked = userSettings.enableNotifications !== false;
    document.querySelector('#darkMode').checked = userSettings.darkMode === true;
    
    // Set notification settings
    if (userSettings.emailNotifications) {
        document.querySelector('#emailNewBooking').checked = userSettings.emailNotifications.newBooking !== false;
        document.querySelector('#emailBookingReminder').checked = userSettings.emailNotifications.bookingReminder !== false;
        document.querySelector('#emailBookingCancellation').checked = userSettings.emailNotifications.bookingCancellation !== false;
        document.querySelector('#emailAdminChanges').checked = userSettings.emailNotifications.adminChanges === true;
    }
    
    if (userSettings.browserNotifications) {
        document.querySelector('#browserNewBooking').checked = userSettings.browserNotifications.newBooking !== false;
        document.querySelector('#browserBookingReminder').checked = userSettings.browserNotifications.bookingReminder !== false;
        document.querySelector('#browserRoomAvailable').checked = userSettings.browserNotifications.roomAvailable === true;
    }
}

// Save user settings
function saveUserSettings() {
    const userSettings = {
        userName: document.querySelector('#userName').value,
        userEmail: document.querySelector('#userEmail').value,
        defaultDuration: document.querySelector('#defaultDuration').value,
        reminderTime: document.querySelector('#reminderTime').value,
        enableNotifications: document.querySelector('#enableNotifications').checked,
        darkMode: document.querySelector('#darkMode').checked,
        emailNotifications: {
            newBooking: document.querySelector('#emailNewBooking').checked,
            bookingReminder: document.querySelector('#emailBookingReminder').checked,
            bookingCancellation: document.querySelector('#emailBookingCancellation').checked,
            adminChanges: document.querySelector('#emailAdminChanges').checked
        },
        browserNotifications: {
            newBooking: document.querySelector('#browserNewBooking').checked,
            bookingReminder: document.querySelector('#browserBookingReminder').checked,
            roomAvailable: document.querySelector('#browserRoomAvailable').checked
        }
    };
    
    // Save to localStorage
    localStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(userSettings));
    
    // Update dark mode if changed
    if (userSettings.darkMode !== document.body.classList.contains('dark-mode')) {
        toggleDarkMode();
    }
    
    // Show success message
    showNotification('Settings Saved', 'Your preferences have been updated', 'success');
}

// Save notification settings
function saveNotificationSettings() {
    saveUserSettings(); // Reuse the same function
}

// Notification function fix
function showNotification(title, message, type = 'info') {
    console.log(`Showing notification: ${title} - ${message} (${type})`);
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast show fade-in`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Set toast content
    toastEl.innerHTML = `
        <div class="toast-header">
            <i class="fas fa-info-circle me-2"></i>
            <strong class="me-auto">${title}</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Add toast to container
    toastContainer.appendChild(toastEl);
    
    // Optional: Use Bootstrap Toast if available, otherwise handle manually
    if (typeof bootstrap !== 'undefined' && bootstrap.Toast) {
        const toast = new bootstrap.Toast(toastEl, {
            autohide: true,
            delay: 5000
        });
        toast.show();
    } else {
        // Manual fallback
        setTimeout(() => {
            toastEl.remove();
        }, 5000);
    }
}

// Save system settings
function saveSystemSettings() {
    const systemSettings = {
        companyName: document.querySelector('#companyName').value,
        systemTitle: document.querySelector('#systemTitle').value,
        workingHoursStart: document.querySelector('#workingHoursStart').value,
        workingHoursEnd: document.querySelector('#workingHoursEnd').value,
        timeSlotDuration: parseInt(document.querySelector('#timeSlotDuration').value, 10),
        maxBookingDuration: parseInt(document.querySelector('#maxBookingDuration').value, 10),
        allowOverlap: document.querySelector('#allowOverlap').checked,
        requireApproval: document.querySelector('#requireApproval').checked,
        enableEmailNotifications: document.querySelector('#enableEmailNotifications').checked,
        darkModeDefault: document.querySelector('#darkModeDefault').checked
    };
    
    // Save to localStorage
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(systemSettings));
    
    // Update page title if changed
    document.querySelector('h2').textContent = systemSettings.systemTitle;
    
    // Show success message
    showNotification('Settings Saved', 'System settings have been updated', 'success');
}
