class AttendX {
    constructor() {
        this.courses = this.loadFromStorage('courses') || {};
        this.settings = this.loadFromStorage('settings') || { theme: 'auto' };
        this.currentCourse = this.loadFromStorage('currentCourse') || 'default';
        
        this.deferredPrompt = null;
        this.searchTimeout = null; // Add this for search debouncing

        this.initializeApp();
        this.bindEvents();
        this.loadCurrentCourse();
        this.applyTheme();
        this.initializePWA();
    }

    initializePWA() {
        // Check if app is already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is already installed');
            return;
        }

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('beforeinstallprompt event fired');
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            this.deferredPrompt = e;
            // Show install prompt after a short delay
            setTimeout(() => this.showInstallPrompt(), 3000);
        });

        // Listen for app installed event
        window.addEventListener('appinstalled', (e) => {
            console.log('App was successfully installed!');
            this.deferredPrompt = null;
        });
    }

    showInstallPrompt() {
        if (this.deferredPrompt) {
            // Show the native install prompt
            this.deferredPrompt.prompt();
            
            // Wait for the user to respond to the prompt
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the install prompt');
                } else {
                    console.log('User dismissed the install prompt');
                }
                this.deferredPrompt = null;
            });
        }
    }

    initializeApp() {
        this.renderCoursesList();
        this.updateCourseTitle();
        this.showDeleteButton();
    }

    bindEvents() {
        // Navigation
        document.getElementById('menuBtn').addEventListener('click', () => this.toggleNav());
        document.getElementById('closeNav').addEventListener('click', () => this.toggleNav());
        
        // Header actions
        document.getElementById('exportBtn').addEventListener('click', () => this.exportCSV());
        document.getElementById('updateBtn').addEventListener('click', () => this.openUpdateModal());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettingsModal());
        
        // Course management
        document.getElementById('addCourseBtn').addEventListener('click', () => this.openAddCourseModal());
        document.getElementById('saveCourse').addEventListener('click', () => this.saveNewCourse());
        document.getElementById('cancelCourse').addEventListener('click', () => this.closeAddCourseModal());
        document.getElementById('closeCourseModal').addEventListener('click', () => this.closeAddCourseModal());
        
        // Course deletion
        document.getElementById('deleteCourseBtn').addEventListener('click', () => this.confirmDeleteCourse());
        
        // Update attendance modal
        document.getElementById('closeUpdateModal').addEventListener('click', () => this.closeUpdateModal());
        document.getElementById('cancelUpdate').addEventListener('click', () => this.closeUpdateModal());
        document.getElementById('saveAttendance').addEventListener('click', () => this.saveAttendance());
        document.getElementById('addStudentBtn').addEventListener('click', () => this.addStudent());
        
        // Settings modal
        document.getElementById('closeSettingsModal').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        
        // Empty state
        document.getElementById('addFirstStudent').addEventListener('click', () => this.openUpdateModal());
        
        // Search functionality (only for attendance modal)
        document.getElementById('attendanceSearch').addEventListener('input', (e) => {
            this.handleAttendanceSearch(e.target.value);
        });
        
        document.getElementById('clearAttendanceSearch').addEventListener('click', () => {
            this.clearAttendanceSearch();
        });
        
        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    // Search Methods (only for attendance modal)
    handleAttendanceSearch(searchTerm) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.filterAttendanceStudents(searchTerm);
        }, 300); // 300ms debounce
    }

    filterAttendanceStudents(searchTerm) {
        const attendanceList = document.getElementById('attendanceList');
        const attendanceItems = attendanceList.querySelectorAll('.attendance-item');
        const clearBtn = document.getElementById('clearAttendanceSearch');
        
        // Show/hide clear button
        clearBtn.style.display = searchTerm ? 'block' : 'none';
        
        if (!searchTerm.trim()) {
            // Show all students if search is empty
            attendanceItems.forEach(item => {
                item.style.display = 'flex';
                item.classList.remove('highlight');
            });
            return;
        }

        const searchLower = searchTerm.toLowerCase();
        let hasResults = false;

        attendanceItems.forEach(item => {
            const studentName = item.querySelector('label').textContent.toLowerCase();
            const matches = studentName.includes(searchLower);
            
            item.style.display = matches ? 'flex' : 'none';
            
            if (matches) {
                item.classList.add('highlight');
                hasResults = true;
            } else {
                item.classList.remove('highlight');
            }
        });

        // Show no results message if needed
        this.showNoResultsMessage(attendanceList, hasResults, searchTerm, 'attendance');
    }

    showNoResultsMessage(container, hasResults, searchTerm, type) {
        // Remove existing no results message
        const existingMessage = container.querySelector('.no-results');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Add no results message if no matches found
        if (!hasResults && searchTerm.trim()) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <p>No students found for "<strong>${searchTerm}</strong>"</p>
                <p class="suggestion">Try checking spelling or using different keywords</p>
            `;
            container.appendChild(noResults);
        }
    }

    clearAttendanceSearch() {
        const searchInput = document.getElementById('attendanceSearch');
        searchInput.value = '';
        this.filterAttendanceStudents('');
        document.getElementById('clearAttendanceSearch').style.display = 'none';
    }

    toggleNav() {
        document.getElementById('sideNav').classList.toggle('active');
    }

    renderCoursesList() {
        const coursesList = document.getElementById('coursesList');
        coursesList.innerHTML = '';
        
        Object.keys(this.courses).forEach(courseId => {
            const course = this.courses[courseId];
            const li = document.createElement('li');
            li.className = `course-item ${courseId === this.currentCourse ? 'active' : ''}`;
            li.dataset.course = courseId;
            li.innerHTML = `<span>${course.name}</span>`;
            li.addEventListener('click', () => this.switchCourse(courseId));
            coursesList.appendChild(li);
        });
    }

    switchCourse(courseId) {
        this.currentCourse = courseId;
        this.saveToStorage('currentCourse', courseId);
        
        // Update UI immediately before refresh
        this.updateCourseTitle();
        this.showDeleteButton();
        this.toggleNav();
        
        // Use a small timeout to ensure UI updates are visible before refresh
        setTimeout(() => {
            window.location.reload();
        }, 100);
    }

    updateCourseTitle() {
        const courseTitle = document.getElementById('courseTitle');
        if (this.courses[this.currentCourse]) {
            courseTitle.textContent = this.courses[this.currentCourse].name;
        } else {
            courseTitle.textContent = 'Select Course';
        }
    }

    loadCurrentCourse() {
        const studentsList = document.getElementById('studentsList');
        const emptyState = document.getElementById('emptyState');
        
        if (!this.courses[this.currentCourse] || !this.courses[this.currentCourse].students) {
            emptyState.style.display = 'block';
            studentsList.innerHTML = '';
            studentsList.appendChild(emptyState);
            return;
        }

        const course = this.courses[this.currentCourse];
        const students = course.students;
        
        if (Object.keys(students).length === 0) {
            emptyState.style.display = 'block';
            studentsList.innerHTML = '';
            studentsList.appendChild(emptyState);
            return;
        }

        emptyState.style.display = 'none';
        studentsList.innerHTML = '';

        // Sort students alphabetically by name
        const sortedStudents = this.getStudentsAlphabetically(students);

        sortedStudents.forEach(([studentId, student]) => {
            const attendanceRate = this.calculateAttendanceRate(student.attendance);
            
            const studentCard = document.createElement('div');
            studentCard.className = 'student-card';
            studentCard.innerHTML = `
                <div class="progress-circle">
                    <svg viewBox="0 0 36 36">
                        <path class="circle-bg"
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path class="circle-progress"
                            stroke-dasharray="${attendanceRate}, 100"
                            d="M18 2.0845
                            a 15.9155 15.9155 0 0 1 0 31.831
                            a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                    </svg>
                    <div class="progress-text">${attendanceRate}%</div>
                </div>
                <div class="student-info">
                    <div class="student-name">${student.name}</div>
                    <div class="student-details">
                        Present: ${Object.values(student.attendance).filter(Boolean).length} days
                    </div>
                </div>
            `;
            studentsList.appendChild(studentCard);
        });
    }

    getStudentsAlphabetically(students) {
        return Object.entries(students).sort((a, b) => {
            const nameA = a[1].name.toLowerCase();
            const nameB = b[1].name.toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }

    calculateAttendanceRate(attendance) {
        const totalDays = Object.keys(attendance).length;
        if (totalDays === 0) return 0;
        const presentDays = Object.values(attendance).filter(Boolean).length;
        return Math.round((presentDays / totalDays) * 100);
    }

    openUpdateModal() {
        if (!this.courses[this.currentCourse]) {
            alert('Please select or create a course first.');
            return;
        }

        const modal = document.getElementById('updateModal');
        const attendanceList = document.getElementById('attendanceList');
        const studentsToRemove = document.getElementById('studentsToRemove');
        
        // Set today's date as default
        document.getElementById('attendanceDate').value = new Date().toISOString().split('T')[0];
        
        // Clear previous content and search
        attendanceList.innerHTML = '';
        studentsToRemove.innerHTML = '';
        document.getElementById('attendanceSearch').value = ''; // Clear search
        document.getElementById('clearAttendanceSearch').style.display = 'none'; // Hide clear button
        
        const course = this.courses[this.currentCourse];
        const students = course.students;
        
        // Sort students alphabetically and create attendance checkboxes
        const sortedStudents = this.getStudentsAlphabetically(students);
        
        sortedStudents.forEach(([studentId, student]) => {
            const div = document.createElement('div');
            div.className = 'attendance-item';
            div.innerHTML = `
                <div class="checkbox-container">
                    <input type="checkbox" id="attendance_${studentId}" data-student="${studentId}">
                    <label for="attendance_${studentId}">${student.name}</label>
                </div>
                <button class="remove-student" data-student="${studentId}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            attendanceList.appendChild(div);
        });

        // Add remove event listeners
        document.querySelectorAll('.remove-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.student;
                this.markStudentForRemoval(studentId);
            });
        });

        modal.classList.add('active');
    }

    markStudentForRemoval(studentId) {
        const student = this.courses[this.currentCourse].students[studentId];
        const studentsToRemove = document.getElementById('studentsToRemove');
        
        const div = document.createElement('div');
        div.className = 'attendance-item';
        div.innerHTML = `
            <span>${student.name} (will be removed)</span>
            <button class="remove-student cancel-remove" data-student="${studentId}">
                <i class="fas fa-undo"></i>
            </button>
        `;
        studentsToRemove.appendChild(div);

        // Hide the student from attendance list
        const attendanceItem = document.querySelector(`[data-student="${studentId}"]`).closest('.attendance-item');
        if (attendanceItem) {
            attendanceItem.style.display = 'none';
        }

        // Add cancel removal event
        div.querySelector('.cancel-remove').addEventListener('click', (e) => {
            const studentId = e.currentTarget.dataset.student;
            div.remove();
            const hiddenItem = document.querySelector(`[data-student="${studentId}"]`).closest('.attendance-item');
            if (hiddenItem) {
                hiddenItem.style.display = 'flex';
            }
        });
    }

    closeUpdateModal() {
        document.getElementById('updateModal').classList.remove('active');
    }

    addStudent() {
        const nameInput = document.getElementById('newStudentName');
        const name = nameInput.value.trim();
        
        if (!name) {
            alert('Please enter a student name.');
            return;
        }

        if (!this.courses[this.currentCourse].students) {
            this.courses[this.currentCourse].students = {};
        }

        const studentId = 'student_' + Date.now();
        this.courses[this.currentCourse].students[studentId] = {
            name: name,
            attendance: {}
        };

        this.saveToStorage('courses', this.courses);
        this.openUpdateModal(); // Refresh the modal
        nameInput.value = '';
    }

    saveAttendance() {
        const date = document.getElementById('attendanceDate').value;
        if (!date) {
            alert('Please select a date.');
            return;
        }

        // Check if attendance for this date already exists
        const course = this.courses[this.currentCourse];
        const existingDates = new Set();
        Object.values(course.students).forEach(student => {
            Object.keys(student.attendance).forEach(attendanceDate => {
                existingDates.add(attendanceDate);
            });
        });

        if (existingDates.has(date)) {
            alert('Attendance for this date has already been saved and cannot be modified.');
            return;
        }

        // Save attendance - FIXED: Now properly handles both present and absent students
        const checkboxes = document.querySelectorAll('#attendanceList input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const studentId = checkbox.dataset.student;
            if (this.courses[this.currentCourse].students[studentId]) {
                this.courses[this.currentCourse].students[studentId].attendance[date] = checkbox.checked;
            }
        });

        // Remove marked students - FIXED: Now properly tracks which students to remove
        const studentsMarkedForRemoval = new Set();
        document.querySelectorAll('#studentsToRemove .remove-student:not(.cancel-remove)').forEach(btn => {
            studentsMarkedForRemoval.add(btn.dataset.student);
        });

        // Actually delete the students from the data
        studentsMarkedForRemoval.forEach(studentId => {
            if (this.courses[this.currentCourse].students[studentId]) {
                delete this.courses[this.currentCourse].students[studentId];
            }
        });

        this.saveToStorage('courses', this.courses);
        this.closeUpdateModal();
        // Refresh the page after saving attendance
        window.location.reload();
    }

    exportCSV() {
        if (!this.courses[this.currentCourse]) {
            alert('No course selected.');
            return;
        }

        const course = this.courses[this.currentCourse];
        const students = course.students;
        
        if (Object.keys(students).length === 0) {
            alert('No students to export.');
            return;
        }

        // Get all unique dates
        const allDates = new Set();
        Object.values(students).forEach(student => {
            Object.keys(student.attendance).forEach(date => {
                allDates.add(date);
            });
        });
        const sortedDates = Array.from(allDates).sort();

        // Create CSV content
        let csv = 'Student Name,' + sortedDates.join(',') + ',Attendance Rate\n';
        
        // Sort students alphabetically for export
        const sortedStudents = this.getStudentsAlphabetically(students);
        
        sortedStudents.forEach(([studentId, student]) => {
            const row = [student.name];
            sortedDates.forEach(date => {
                row.push(student.attendance[date] ? 'Present' : 'Absent');
            });
            const rate = this.calculateAttendanceRate(student.attendance);
            row.push(rate + '%');
            csv += row.join(',') + '\n';
        });

        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course.name.replace(/\s+/g, '_')}_attendance.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    openAddCourseModal() {
        document.getElementById('addCourseModal').classList.add('active');
        document.getElementById('courseName').value = '';
    }

    closeAddCourseModal() {
        document.getElementById('addCourseModal').classList.remove('active');
    }

    saveNewCourse() {
        const courseName = document.getElementById('courseName').value.trim();
        if (!courseName) {
            alert('Please enter a course name.');
            return;
        }

        const courseId = 'course_' + Date.now();
        this.courses[courseId] = {
            name: courseName,
            students: {}
        };

        this.saveToStorage('courses', this.courses);
        this.renderCoursesList();
        this.closeAddCourseModal();
        this.switchCourse(courseId);
    }

    // Course Deletion Methods
    showDeleteButton() {
        const deleteBtn = document.getElementById('deleteCourseBtn');
        if (this.currentCourse && this.currentCourse !== 'default' && this.courses[this.currentCourse]) {
            deleteBtn.style.display = 'block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    confirmDeleteCourse() {
        const courseName = this.courses[this.currentCourse].name;
        
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Delete Course</h3>
                    <button class="close-btn" id="closeDeleteModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="confirmation-dialog">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error); margin-bottom: 1rem;"></i>
                        <p>Are you sure you want to delete <strong>"${courseName}"</strong>?</p>
                        <p style="color: var(--error); font-size: 0.875rem;">This action cannot be undone. All attendance data for this course will be permanently lost.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelDelete">Cancel</button>
                    <button class="btn-danger" id="confirmDelete">Delete Course</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Bind events
        document.getElementById('closeDeleteModal').addEventListener('click', () => modal.remove());
        document.getElementById('cancelDelete').addEventListener('click', () => modal.remove());
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.deleteCurrentCourse();
            modal.remove();
        });
        
        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    deleteCurrentCourse() {
        if (this.currentCourse && this.currentCourse !== 'default') {
            delete this.courses[this.currentCourse];
            this.saveToStorage('courses', this.courses);
            
            // Switch to another course or default
            const remainingCourses = Object.keys(this.courses);
            if (remainingCourses.length > 0) {
                // Switch to first available course and refresh
                this.currentCourse = remainingCourses[0];
                this.saveToStorage('currentCourse', this.currentCourse);
            } else {
                // No courses left, set to default
                this.currentCourse = 'default';
                this.saveToStorage('currentCourse', 'default');
            }
            
            // Always refresh the page after deletion
            window.location.reload();
            
            // Note: We don't need to call renderCoursesList() or showDeleteButton() here
            // because the page will refresh and the app will reinitialize
            this.toggleNav(); // Close the side menu
        }
    }

    openSettingsModal() {
        document.getElementById('settingsModal').classList.add('active');
        document.getElementById('themeSelect').value = this.settings.theme;
    }

    closeSettingsModal() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    saveSettings() {
        this.settings.theme = document.getElementById('themeSelect').value;
        this.saveToStorage('settings', this.settings);
        this.applyTheme();
        this.closeSettingsModal();
    }

    applyTheme() {
        const theme = this.settings.theme;
        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    // Utility methods
    loadFromStorage(key) {
        try {
            return JSON.parse(localStorage.getItem(key));
        } catch (e) {
            return null;
        }
    }

    saveToStorage(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AttendX();
});

// Service Worker Registration for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
