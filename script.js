class AttendX {
    constructor() {
        this.courses = this.loadFromStorage('courses') || {};
        this.settings = this.loadFromStorage('settings') || { theme: 'auto', showAttendanceHistory: false };
        this.currentCourse = this.loadFromStorage('currentCourse') || 'default';
        this.currentEditDate = null;
        this.currentEditStudent = null;
        
        this.deferredPrompt = null;
        this.searchTimeout = null;

        this.initializeApp();
        this.bindEvents();
        this.loadCurrentCourse();
        this.applyTheme();
        this.initializePWA();
        this.setupKeyboardShortcuts();
    }

    // ===== TOAST SYSTEM =====
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
        `;
        
        container.appendChild(toast);
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));
        
        setTimeout(() => this.removeToast(toast), duration);
    }

    removeToast(toast) {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }

    // ===== KEYBOARD SHORTCUTS =====
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl+U - Open Update
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault();
                this.openUpdateModal();
            }
            // Ctrl+E - Export
            if (e.ctrlKey && e.key === 'e') {
                e.preventDefault();
                this.exportCSV();
            }
            // Ctrl+S - Settings
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.openSettingsModal();
            }
            // Esc - Close modals
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
            // Left/Right arrows in update modal - navigate dates
            if (document.getElementById('updateModal').classList.contains('active')) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    this.navigateDate(-1);
                }
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    this.navigateDate(1);
                }
            }
        });
    }

    // ===== PWA METHODS =====
    initializePWA() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            console.log('App is already installed');
            return;
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            setTimeout(() => this.showInstallPrompt(), 3000);
        });

        window.addEventListener('appinstalled', (e) => {
            console.log('App was successfully installed!');
            this.deferredPrompt = null;
            this.showToast('AttendX installed successfully! 🎉', 'success');
        });
    }

    showInstallPrompt() {
        if (this.deferredPrompt) {
            this.deferredPrompt.prompt();
            this.deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    this.showToast('Thanks for installing AttendX!', 'success');
                }
                this.deferredPrompt = null;
            });
        }
    }

    // ===== INITIALIZATION =====
    initializeApp() {
        this.renderCoursesList();
        this.updateCourseTitle();
        this.showDeleteButton();
        this.setupAboutModal();
    }

    bindEvents() {
        // Navigation
        document.getElementById('menuBtn').addEventListener('click', () => this.toggleNav());
        document.getElementById('closeNav').addEventListener('click', () => this.toggleNav());
        
        // Header actions
        document.getElementById('aboutBtn').addEventListener('click', () => this.openAboutModal());
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
        document.getElementById('newStudentName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addStudent();
        });
        
        // Date navigation
        document.getElementById('prevDateBtn').addEventListener('click', () => this.navigateDate(-1));
        document.getElementById('nextDateBtn').addEventListener('click', () => this.navigateDate(1));
        document.getElementById('todayDateBtn').addEventListener('click', () => this.goToToday());
        document.getElementById('attendanceDate').addEventListener('change', (e) => {
            this.loadAttendanceForDate(e.target.value);
        });
        
        // File upload
        document.getElementById('studentUpload').addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });
        
        // Search
        document.getElementById('attendanceSearch').addEventListener('input', (e) => {
            this.handleAttendanceSearch(e.target.value);
        });
        document.getElementById('clearAttendanceSearch').addEventListener('click', () => {
            this.clearAttendanceSearch();
        });
        
        // Settings modal
        document.getElementById('closeSettingsModal').addEventListener('click', () => this.closeSettingsModal());
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
        
        // About modal
        document.getElementById('closeAboutModal').addEventListener('click', () => this.closeAboutModal());
        document.getElementById('closeAboutBtn').addEventListener('click', () => this.closeAboutModal());
        
        // Edit Records modal
        document.getElementById('closeEditRecordsModal').addEventListener('click', () => this.closeEditRecordsModal());
        document.getElementById('cancelEditRecords').addEventListener('click', () => this.closeEditRecordsModal());
        document.getElementById('editStudentSelect').addEventListener('change', () => this.loadEditRecords());
        document.getElementById('editDateSelect').addEventListener('change', () => this.loadEditRecords());
        
        // Empty state
        document.getElementById('addFirstStudent').addEventListener('click', () => this.openUpdateModal());
        
        // Close modals on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    // ===== ABOUT MODAL =====
    setupAboutModal() {
        // About modal is already in HTML
    }

    openAboutModal() {
        document.getElementById('aboutModal').classList.add('active');
    }

    closeAboutModal() {
        document.getElementById('aboutModal').classList.remove('active');
    }

    // ===== DATE NAVIGATION =====
    navigateDate(delta) {
        const dateInput = document.getElementById('attendanceDate');
        const currentDate = new Date(dateInput.value);
        currentDate.setDate(currentDate.getDate() + delta);
        const newDate = currentDate.toISOString().split('T')[0];
        dateInput.value = newDate;
        this.loadAttendanceForDate(newDate);
    }

    goToToday() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendanceDate').value = today;
        this.loadAttendanceForDate(today);
    }

    // ===== FILE UPLOAD =====
    handleFileUpload(file) {
        if (!file) return;
        
        const reader = new FileReader();
        
        if (file.name.endsWith('.csv')) {
            reader.onload = (e) => {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                this.parseAndAddStudents(lines);
            };
            reader.readAsText(file);
        } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            reader.onload = (e) => {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                this.parseAndAddStudentsFromJSON(jsonData);
            };
            reader.readAsArrayBuffer(file);
        } else {
            this.showToast('Please upload a CSV or Excel file.', 'error');
        }
        
        // Reset file input
        document.getElementById('studentUpload').value = '';
    }

    parseAndAddStudents(lines) {
        // Try to find the name column
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        let nameColIndex = -1;
        
        const nameKeywords = ['name', 'student', 'student name', 'full name', 'studentname'];
        for (const keyword of nameKeywords) {
            const idx = headers.findIndex(h => h.includes(keyword));
            if (idx !== -1) { nameColIndex = idx; break; }
        }
        
        if (nameColIndex === -1) {
            this.showToast('Could not find a name column. Please use "Name" or "Student Name" as column header.', 'error');
            return;
        }
        
        let added = 0;
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',');
            if (cols.length > nameColIndex) {
                const name = cols[nameColIndex].trim();
                if (name) {
                    this.addStudentDirect(name);
                    added++;
                }
            }
        }
        
        this.showToast(`Added ${added} student(s) successfully!`, 'success');
        this.openUpdateModal(); // Refresh the modal
    }

    parseAndAddStudentsFromJSON(jsonData) {
        if (!jsonData || jsonData.length === 0) {
            this.showToast('No data found in the file.', 'error');
            return;
        }
        
        // Try to find name column
        const keys = Object.keys(jsonData[0]);
        let nameKey = keys.find(k => {
            const lower = k.toLowerCase();
            return lower.includes('name') || lower.includes('student');
        });
        
        if (!nameKey) {
            this.showToast('Could not find a name column. Please use "Name" or "Student Name" as column header.', 'error');
            return;
        }
        
        let added = 0;
        for (const row of jsonData) {
            const name = String(row[nameKey]).trim();
            if (name && name !== 'undefined' && name !== 'null') {
                this.addStudentDirect(name);
                added++;
            }
        }
        
        this.showToast(`Added ${added} student(s) successfully!`, 'success');
        this.openUpdateModal(); // Refresh the modal
    }

    addStudentDirect(name) {
        if (!this.courses[this.currentCourse].students) {
            this.courses[this.currentCourse].students = {};
        }
        
        // Check for duplicate
        const existing = Object.values(this.courses[this.currentCourse].students);
        if (existing.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            return; // Skip duplicates silently
        }
        
        const studentId = 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
        this.courses[this.currentCourse].students[studentId] = {
            name: name,
            attendance: {}
        };
        
        this.saveToStorage('courses', this.courses);
    }

    // ===== UPDATE MODAL =====
    openUpdateModal() {
        if (!this.courses[this.currentCourse]) {
            this.showToast('Please select or create a course first.', 'warning');
            return;
        }

        const modal = document.getElementById('updateModal');
        const attendanceList = document.getElementById('attendanceList');
        const studentsToRemove = document.getElementById('studentsToRemove');
        
        // Set today's date as default if not already set
        const dateInput = document.getElementById('attendanceDate');
        if (!dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        
        attendanceList.innerHTML = '';
        studentsToRemove.innerHTML = '';
        document.getElementById('attendanceSearch').value = '';
        document.getElementById('clearAttendanceSearch').style.display = 'none';
        
        this.loadAttendanceForDate(dateInput.value);
        modal.classList.add('active');
    }

    loadAttendanceForDate(date) {
        const attendanceList = document.getElementById('attendanceList');
        
        if (!this.courses[this.currentCourse] || !this.courses[this.currentCourse].students) {
            attendanceList.innerHTML = '<p class="no-students">No students in this course.</p>';
            return;
        }

        const course = this.courses[this.currentCourse];
        const students = course.students;
        
        if (Object.keys(students).length === 0) {
            attendanceList.innerHTML = '<p class="no-students">No students added yet. Upload or add students above.</p>';
            return;
        }

        attendanceList.innerHTML = '';
        const sortedStudents = this.getStudentsAlphabetically(students);
        
        sortedStudents.forEach(([studentId, student]) => {
            // Check if student is marked for removal
            const isMarkedForRemoval = document.querySelector(`#studentsToRemove [data-student="${studentId}"]`);
            if (isMarkedForRemoval) return; // Skip if marked for removal
            
            const isPresent = student.attendance[date] || false;
            
            const div = document.createElement('div');
            div.className = 'attendance-item';
            div.innerHTML = `
                <div class="checkbox-container">
                    <input type="checkbox" id="attendance_${studentId}" data-student="${studentId}" ${isPresent ? 'checked' : ''}>
                    <label for="attendance_${studentId}">${student.name}</label>
                </div>
                <div class="item-actions">
                    <button class="edit-name-btn" data-student="${studentId}" title="Edit name">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="remove-student" data-student="${studentId}" title="Remove student">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            attendanceList.appendChild(div);
        });

        // Add event listeners for edit name buttons
        document.querySelectorAll('.edit-name-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.student;
                this.editStudentName(studentId);
            });
        });

        // Add remove event listeners
        document.querySelectorAll('.remove-student').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.student;
                this.markStudentForRemoval(studentId);
            });
        });

        // Apply search filter if there's a search term
        const searchTerm = document.getElementById('attendanceSearch').value;
        if (searchTerm) {
            this.filterAttendanceStudents(searchTerm);
        }
    }

    editStudentName(studentId) {
        const student = this.courses[this.currentCourse].students[studentId];
        if (!student) return;
        
        const label = document.querySelector(`#attendance_${studentId}`)?.closest('.attendance-item')?.querySelector('label');
        if (!label) return;
        
        const currentName = student.name;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'name-edit-input';
        input.value = currentName;
        
        label.textContent = '';
        label.appendChild(input);
        input.focus();
        input.select();
        
        const saveName = () => {
            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                // Check for duplicate
                const existing = Object.values(this.courses[this.currentCourse].students);
                const isDuplicate = existing.some(s => s.name.toLowerCase() === newName.toLowerCase() && 
                    Object.keys(this.courses[this.currentCourse].students).find(id => 
                        this.courses[this.currentCourse].students[id].name === newName
                    ) !== studentId);
                
                if (isDuplicate) {
                    this.showToast('A student with this name already exists.', 'error');
                    input.value = currentName;
                } else {
                    student.name = newName;
                    this.saveToStorage('courses', this.courses);
                    this.showToast('Student name updated successfully!', 'success');
                    this.loadAttendanceForDate(document.getElementById('attendanceDate').value);
                }
            }
            label.textContent = student.name;
        };
        
        input.addEventListener('blur', saveName);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
            if (e.key === 'Escape') {
                input.value = currentName;
                input.blur();
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
            this.showToast('Please enter a student name.', 'warning');
            return;
        }

        if (!this.courses[this.currentCourse].students) {
            this.courses[this.currentCourse].students = {};
        }

        // Check for duplicate
        const existing = Object.values(this.courses[this.currentCourse].students);
        if (existing.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            this.showToast('A student with this name already exists.', 'warning');
            return;
        }

        const studentId = 'student_' + Date.now();
        this.courses[this.currentCourse].students[studentId] = {
            name: name,
            attendance: {}
        };

        this.saveToStorage('courses', this.courses);
        this.showToast(`Added "${name}" successfully!`, 'success');
        this.openUpdateModal(); // Refresh the modal
        nameInput.value = '';
    }

    markStudentForRemoval(studentId) {
        const student = this.courses[this.currentCourse].students[studentId];
        const studentsToRemove = document.getElementById('studentsToRemove');
        
        const div = document.createElement('div');
        div.className = 'attendance-item removal-item';
        div.dataset.student = studentId;
        div.innerHTML = `
            <span>${student.name} <span class="removal-badge">(will be removed)</span></span>
            <button class="remove-student cancel-remove" data-student="${studentId}">
                <i class="fas fa-undo"></i>
            </button>
        `;
        studentsToRemove.appendChild(div);

        // Hide the student from attendance list
        const attendanceItem = document.querySelector(`#attendanceList .attendance-item [data-student="${studentId}"]`)?.closest('.attendance-item');
        if (attendanceItem) {
            attendanceItem.style.display = 'none';
        }

        // Add cancel removal event
        div.querySelector('.cancel-remove').addEventListener('click', (e) => {
            const studentId = e.currentTarget.dataset.student;
            div.remove();
            const hiddenItem = document.querySelector(`#attendanceList .attendance-item [data-student="${studentId}"]`)?.closest('.attendance-item');
            if (hiddenItem) {
                hiddenItem.style.display = 'flex';
            }
        });
    }

    saveAttendance() {
        const date = document.getElementById('attendanceDate').value;
        if (!date) {
            this.showToast('Please select a date.', 'warning');
            return;
        }

        const course = this.courses[this.currentCourse];
        
        // Check if attendance for this date already exists
        let hasExistingAttendance = false;
        Object.values(course.students).forEach(student => {
            if (student.attendance && student.attendance[date] !== undefined) {
                hasExistingAttendance = true;
            }
        });

        if (hasExistingAttendance) {
            // Allow editing - update existing records
            const checkboxes = document.querySelectorAll('#attendanceList input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                const studentId = checkbox.dataset.student;
                if (this.courses[this.currentCourse].students[studentId]) {
                    this.courses[this.currentCourse].students[studentId].attendance[date] = checkbox.checked;
                }
            });
            
            // Remove marked students
            document.querySelectorAll('#studentsToRemove .remove-student:not(.cancel-remove)').forEach(btn => {
                const studentId = btn.dataset.student;
                if (this.courses[this.currentCourse].students[studentId]) {
                    delete this.courses[this.currentCourse].students[studentId];
                }
            });
            
            this.saveToStorage('courses', this.courses);
            this.showToast('Attendance updated successfully!', 'success');
            this.closeUpdateModal();
            window.location.reload();
            return;
        }

        // Save attendance
        const checkboxes = document.querySelectorAll('#attendanceList input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            const studentId = checkbox.dataset.student;
            if (this.courses[this.currentCourse].students[studentId]) {
                this.courses[this.currentCourse].students[studentId].attendance[date] = checkbox.checked;
            }
        });

        // Remove marked students
        document.querySelectorAll('#studentsToRemove .remove-student:not(.cancel-remove)').forEach(btn => {
            const studentId = btn.dataset.student;
            if (this.courses[this.currentCourse].students[studentId]) {
                delete this.courses[this.currentCourse].students[studentId];
            }
        });

        this.saveToStorage('courses', this.courses);
        this.showToast('Attendance saved successfully! 🎉', 'success');
        this.closeUpdateModal();
        window.location.reload();
    }

    // ===== SEARCH =====
    handleAttendanceSearch(searchTerm) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.filterAttendanceStudents(searchTerm);
        }, 300);
    }

    filterAttendanceStudents(searchTerm) {
        const attendanceList = document.getElementById('attendanceList');
        const attendanceItems = attendanceList.querySelectorAll('.attendance-item:not(.removal-item)');
        const clearBtn = document.getElementById('clearAttendanceSearch');
        
        clearBtn.style.display = searchTerm ? 'block' : 'none';
        
        if (!searchTerm.trim()) {
            attendanceItems.forEach(item => {
                item.style.display = 'flex';
                item.classList.remove('highlight');
            });
            return;
        }

        const searchLower = searchTerm.toLowerCase();
        let hasResults = false;

        attendanceItems.forEach(item => {
            const label = item.querySelector('label');
            if (label) {
                const studentName = label.textContent.toLowerCase();
                const matches = studentName.includes(searchLower);
                item.style.display = matches ? 'flex' : 'none';
                if (matches) {
                    item.classList.add('highlight');
                    hasResults = true;
                } else {
                    item.classList.remove('highlight');
                }
            }
        });

        this.showNoResultsMessage(attendanceList, hasResults, searchTerm);
    }

    showNoResultsMessage(container, hasResults, searchTerm) {
        const existingMessage = container.querySelector('.no-results');
        if (existingMessage) existingMessage.remove();

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

    // ===== NAVIGATION =====
    toggleNav() {
        document.getElementById('sideNav').classList.toggle('active');
    }

    // ===== COURSE MANAGEMENT =====
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
        this.updateCourseTitle();
        this.showDeleteButton();
        this.toggleNav();
        setTimeout(() => window.location.reload(), 100);
    }

    updateCourseTitle() {
        const courseTitle = document.getElementById('courseTitle');
        if (this.courses[this.currentCourse]) {
            courseTitle.textContent = this.courses[this.currentCourse].name;
        } else {
            courseTitle.textContent = 'Select Course';
        }
    }

    showDeleteButton() {
        const deleteBtn = document.getElementById('deleteCourseBtn');
        if (this.currentCourse && this.currentCourse !== 'default' && this.courses[this.currentCourse]) {
            deleteBtn.style.display = 'block';
        } else {
            deleteBtn.style.display = 'none';
        }
    }

    openAddCourseModal() {
        document.getElementById('addCourseModal').classList.add('active');
        document.getElementById('courseName').value = '';
        setTimeout(() => document.getElementById('courseName').focus(), 100);
    }

    closeAddCourseModal() {
        document.getElementById('addCourseModal').classList.remove('active');
    }

    saveNewCourse() {
        const courseName = document.getElementById('courseName').value.trim();
        if (!courseName) {
            this.showToast('Please enter a course name.', 'warning');
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
        this.showToast(`Course "${courseName}" created!`, 'success');
        this.switchCourse(courseId);
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
                        <p style="color: var(--error); font-size: 0.875rem;">This action cannot be undone. All attendance data will be permanently lost.</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary" id="cancelDelete">Cancel</button>
                    <button class="btn-danger" id="confirmDelete">Delete Course</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('closeDeleteModal').addEventListener('click', () => modal.remove());
        document.getElementById('cancelDelete').addEventListener('click', () => modal.remove());
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.deleteCurrentCourse();
            modal.remove();
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    deleteCurrentCourse() {
        if (this.currentCourse && this.currentCourse !== 'default') {
            delete this.courses[this.currentCourse];
            this.saveToStorage('courses', this.courses);
            
            const remainingCourses = Object.keys(this.courses);
            if (remainingCourses.length > 0) {
                this.currentCourse = remainingCourses[0];
                this.saveToStorage('currentCourse', this.currentCourse);
            } else {
                this.currentCourse = 'default';
                this.saveToStorage('currentCourse', 'default');
            }
            
            this.showToast('Course deleted successfully.', 'info');
            window.location.reload();
        }
    }

    // ===== LOAD CURRENT COURSE =====
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

        const sortedStudents = this.getStudentsAlphabetically(students);
        const showHistory = this.settings.showAttendanceHistory;

        sortedStudents.forEach(([studentId, student]) => {
            const attendanceRate = this.calculateAttendanceRate(student.attendance);
            
            const studentCard = document.createElement('div');
            studentCard.className = 'student-card';
            
            let historyHTML = '';
            if (showHistory && Object.keys(student.attendance).length > 0) {
                const sortedDates = Object.keys(student.attendance).sort().slice(-5);
                historyHTML = `
                    <div class="student-stats">
                        <span><i class="fas fa-calendar-check"></i> ${Object.values(student.attendance).filter(Boolean).length} present</span>
                        <span><i class="fas fa-calendar-times"></i> ${Object.values(student.attendance).filter(v => !v).length} absent</span>
                        <span><i class="fas fa-clock"></i> ${Object.keys(student.attendance).length} total</span>
                    </div>
                `;
            }
            
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
                    ${historyHTML}
                </div>
                <button class="icon-btn edit-records-btn" data-student="${studentId}" title="Edit records">
                    <i class="fas fa-edit"></i>
                </button>
            `;
            studentsList.appendChild(studentCard);
        });

        // Add event listeners for edit records buttons
        document.querySelectorAll('.edit-records-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const studentId = e.currentTarget.dataset.student;
                this.openEditRecordsModal(studentId);
            });
        });
    }

    // ===== EDIT RECORDS MODAL =====
    openEditRecordsModal(studentId) {
        const modal = document.getElementById('editRecordsModal');
        const studentSelect = document.getElementById('editStudentSelect');
        const dateSelect = document.getElementById('editDateSelect');
        
        // Populate student select
        studentSelect.innerHTML = '';
        const students = this.courses[this.currentCourse].students;
        const sortedStudents = this.getStudentsAlphabetically(students);
        
        sortedStudents.forEach(([id, student]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = student.name;
            studentSelect.appendChild(option);
        });
        
        if (studentId) {
            studentSelect.value = studentId;
        }
        
        // Set date to today if available
        const today = new Date().toISOString().split('T')[0];
        dateSelect.value = today;
        
        this.currentEditStudent = studentSelect.value;
        this.currentEditDate = dateSelect.value;
        
        modal.classList.add('active');
        this.loadEditRecords();
    }

    closeEditRecordsModal() {
        document.getElementById('editRecordsModal').classList.remove('active');
    }

    loadEditRecords() {
        const studentId = document.getElementById('editStudentSelect').value;
        const date = document.getElementById('editDateSelect').value;
        const content = document.getElementById('editRecordsContent');
        
        if (!studentId || !date) {
            content.innerHTML = '<p class="edit-instruction">Select a student and date to edit attendance</p>';
            return;
        }
        
        const student = this.courses[this.currentCourse].students[studentId];
        if (!student) {
            content.innerHTML = '<p class="edit-instruction">Student not found.</p>';
            return;
        }
        
        // Show records for this student
        const attendance = student.attendance;
        const dates = Object.keys(attendance).sort();
        
        if (dates.length === 0) {
            content.innerHTML = '<p class="edit-instruction">No attendance records found for this student.</p>';
            return;
        }
        
        let html = `<div class="record-editor"><h4>${student.name}'s Attendance Records</h4><div class="record-list">`;
        
        // Show all records or filter by date
        const filteredDates = date ? dates.filter(d => d === date) : dates;
        
        if (filteredDates.length === 0) {
            html += `<p class="edit-instruction">No records for the selected date.</p>`;
        } else {
            filteredDates.forEach(recordDate => {
                const status = attendance[recordDate] ? 'Present' : 'Absent';
                html += `
                    <div class="record-item" data-date="${recordDate}">
                        <div class="record-info">
                            <span class="record-date">${this.formatDate(recordDate)}</span>
                            <div class="record-status">
                                <span>Status:</span>
                                <select class="record-status-select" data-date="${recordDate}">
                                    <option value="true" ${status === 'Present' ? 'selected' : ''}>Present</option>
                                    <option value="false" ${status === 'Absent' ? 'selected' : ''}>Absent</option>
                                </select>
                            </div>
                        </div>
                        <div class="record-actions">
                            <button class="delete-record" data-date="${recordDate}" title="Delete this record">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
        }
        
        html += `</div></div>`;
        content.innerHTML = html;
        
        // Add event listeners for status changes
        document.querySelectorAll('.record-status-select').forEach(select => {
            select.addEventListener('change', (e) => {
                const date = e.currentTarget.dataset.date;
                const value = e.currentTarget.value === 'true';
                this.updateAttendanceRecord(studentId, date, value);
            });
        });
        
        // Add event listeners for delete
        document.querySelectorAll('.delete-record').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const date = e.currentTarget.dataset.date;
                if (confirm(`Delete attendance record for ${this.formatDate(date)}?`)) {
                    this.deleteAttendanceRecord(studentId, date);
                }
            });
        });
    }

    formatDate(dateStr) {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    updateAttendanceRecord(studentId, date, value) {
        const student = this.courses[this.currentCourse].students[studentId];
        if (student) {
            student.attendance[date] = value;
            this.saveToStorage('courses', this.courses);
            this.showToast(`Updated record for ${this.formatDate(date)} to ${value ? 'Present' : 'Absent'}`, 'success');
            this.loadEditRecords(); // Refresh
        }
    }

    deleteAttendanceRecord(studentId, date) {
        const student = this.courses[this.currentCourse].students[studentId];
        if (student && student.attendance[date] !== undefined) {
            delete student.attendance[date];
            this.saveToStorage('courses', this.courses);
            this.showToast(`Deleted record for ${this.formatDate(date)}`, 'info');
            this.loadEditRecords(); // Refresh
            // Also refresh main view
            this.loadCurrentCourse();
        }
    }

    // ===== EXPORT =====
    exportCSV() {
        if (!this.courses[this.currentCourse]) {
            this.showToast('No course selected.', 'warning');
            return;
        }

        const course = this.courses[this.currentCourse];
        const students = course.students;
        
        if (Object.keys(students).length === 0) {
            this.showToast('No students to export.', 'warning');
            return;
        }

        const allDates = new Set();
        Object.values(students).forEach(student => {
            Object.keys(student.attendance).forEach(date => {
                allDates.add(date);
            });
        });
        const sortedDates = Array.from(allDates).sort();

        let csv = 'Student Name,' + sortedDates.join(',') + ',Attendance Rate\n';
        
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

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${course.name.replace(/\s+/g, '_')}_attendance.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        this.showToast('CSV exported successfully!', 'success');
    }

    // ===== SETTINGS =====
    openSettingsModal() {
        document.getElementById('settingsModal').classList.add('active');
        document.getElementById('themeSelect').value = this.settings.theme || 'auto';
        document.getElementById('showAttendanceHistory').checked = this.settings.showAttendanceHistory || false;
    }

    closeSettingsModal() {
        document.getElementById('settingsModal').classList.remove('active');
    }

    saveSettings() {
        this.settings.theme = document.getElementById('themeSelect').value;
        this.settings.showAttendanceHistory = document.getElementById('showAttendanceHistory').checked;
        this.saveToStorage('settings', this.settings);
        this.applyTheme();
        this.closeSettingsModal();
        this.showToast('Settings saved successfully!', 'success');
        this.loadCurrentCourse(); // Refresh view if history setting changed
    }

    applyTheme() {
        const theme = this.settings.theme;
        if (theme === 'auto') {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', theme);
        }
    }

    // ===== UTILITY METHODS =====
    getStudentsAlphabetically(students) {
        return Object.entries(students).sort((a, b) => {
            return a[1].name.toLowerCase().localeCompare(b[1].name.toLowerCase());
        });
    }

    calculateAttendanceRate(attendance) {
        const totalDays = Object.keys(attendance).length;
        if (totalDays === 0) return 0;
        const presentDays = Object.values(attendance).filter(Boolean).length;
        return Math.round((presentDays / totalDays) * 100);
    }

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

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new AttendX();
});

// Service Worker Registration
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
