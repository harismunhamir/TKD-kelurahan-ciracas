// ====== KONFIGURASI SUPAABASE ======
const SUPABASE_URL = "https://bizryujdcymmjjzhurhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpenJ5dWpkY3ltbWpqemh1cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTUzMzAsImV4cCI6MjA3NDg3MTMzMH0.XuKnQ3MStAj6yp2rkxEmISnaJEUUYicBOBucU-rgLqc";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== EVENT REGISTRATION FUNCTIONS ======
const eventRegistrationManager = {
    // Get event details
    async getEvent(eventId) {
        try {
            const { data, error } = await client
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error loading event:', error);
            throw error;
        }
    },

    // Get all students for dropdown
    async getStudents() {
        try {
            const { data, error } = await client
                .from('murid')
                .select('id, nama, sabuk, tanggal_lahir, jenis_kelamin')
                .order('nama');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading students:', error);
            throw error;
        }
    },

    // Get event participants (public view)
    async getParticipants(eventId) {
        try {
            const { data, error } = await client
                .from('event_registrations')
                .select('nama, sabuk, no_registrasi, kategori, created_at')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading participants:', error);
            throw error;
        }
    },

    // Register participant
    async registerParticipant(participantData) {
        try {
            const { data, error } = await client
                .from('event_registrations')
                .insert([participantData])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error registering participant:', error);
            throw error;
        }
    },

    // Check if student already registered
    async checkExistingRegistration(eventId, studentId) {
        try {
            const { data, error } = await client
                .from('event_registrations')
                .select('id')
                .eq('event_id', eventId)
                .eq('student_id', studentId)
                .single();

            return !!data; // Returns true if already registered
        } catch (error) {
            return false; // Not registered
        }
    }
};

// ====== UI MANAGEMENT ======
document.addEventListener('DOMContentLoaded', function() {
    initializeEventRegistration();
});

async function initializeEventRegistration() {
    try {
        // Get event ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const eventId = urlParams.get('event');
        
        if (!eventId) {
            showError('Link pendaftaran tidak valid. Silakan minta link yang benar dari admin.');
            return;
        }
        
        document.getElementById('eventId').value = eventId;
        
        // Load event details
        await loadEventDetails(eventId);
        
        // Load students for dropdown
        await loadStudentsDropdown();
        
        // Load participants list
        await loadAndDisplayParticipants(eventId);
        
        // Initialize form handler
        initializeRegistrationForm(eventId);
        
    } catch (error) {
        showError('Error memuat form pendaftaran');
    }
}

async function loadEventDetails(eventId) {
    try {
        const event = await eventRegistrationManager.getEvent(eventId);
        
        const eventInfo = document.getElementById('eventInfo');
        eventInfo.innerHTML = `
            <strong>Jenis Event:</strong>
            <span>${event.jenis_event}</span>
            
            <strong>Nama Event:</strong>
            <span>${event.nama_event}</span>
            
            <strong>Waktu Pelaksanaan:</strong>
            <span>${formatDateTime(event.waktu_event)}</span>
        `;
        
        // Update page title
        document.title = `Pendaftaran - ${event.nama_event}`;
        
        // Update conditional fields based on event type
        updateConditionalFields(event.jenis_event);
        
    } catch (error) {
        showError('Event tidak ditemukan atau link tidak valid');
    }
}

async function loadStudentsDropdown() {
    try {
        const students = await eventRegistrationManager.getStudents();
        const select = document.getElementById('selectMurid');
        
        select.innerHTML = '<option value="">-- Pilih Nama Murid --</option>' +
            students.map(student => 
                `<option value="${student.id}" 
                          data-nama="${student.nama}"
                          data-tempat-lahir="${student.tempat_lahir}"
                          data-tanggal-lahir="${student.tanggal_lahir}"
                          data-sabuk="${student.sabuk}"
                          data-jenis-kelamin="${student.jenis_kelamin}">
                    ${student.nama} - ${student.sabuk}
                </option>`
            ).join('');
            
        // Add event listener for auto-fill
        select.addEventListener('change', function() {
            updateStudentInfo(this);
        });
            
    } catch (error) {
        console.error('Error loading students dropdown:', error);
        showError('Error memuat data murid');
    }
}

async function loadAndDisplayParticipants(eventId) {
    try {
        const participants = await eventRegistrationManager.getParticipants(eventId);
        const tbody = document.getElementById('participantsTableBody');
        
        if (participants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px;">Belum ada peserta yang mendaftar</td></tr>';
            return;
        }
        
        tbody.innerHTML = participants.map((participant, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${participant.nama}</td>
                <td>${participant.sabuk}</td>
                <td>${getEventDataDisplay(participant)}</td>
            </tr>
        `).join('');
        
    } catch (error) {
        document.getElementById('participantsTableBody').innerHTML = 
            '<tr><td colspan="4" style="text-align: center; padding: 20px;">Error memuat data peserta</td></tr>';
    }
}

function initializeRegistrationForm(eventId) {
    const form = document.getElementById('participantForm');
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const studentId = document.getElementById('selectMurid').value;
        const selectedOption = document.getElementById('selectMurid').options[document.getElementById('selectMurid').selectedIndex];
        const eventType = document.querySelector('#eventInfo span').textContent; // Get event type from displayed info
        
        if (!studentId) {
            showError('Pilih nama murid terlebih dahulu');
            return;
        }
        
        // Check if already registered
        const alreadyRegistered = await eventRegistrationManager.checkExistingRegistration(eventId, studentId);
        if (alreadyRegistered) {
            showError('Murid ini sudah terdaftar di event ini');
            return;
        }
        
        const participantData = {
            event_id: parseInt(eventId),
            student_id: parseInt(studentId),
            nama: selectedOption.dataset.nama,
            tempat_lahir: selectedOption.dataset.tempatLahir,
            tanggal_lahir: selectedOption.dataset.tanggalLahir,
            sabuk: selectedOption.dataset.sabuk,
            jenis_kelamin: selectedOption.dataset.jenisKelamin
        };
        
        // Add conditional fields based on event type
        if (eventType === 'UKT') {
            const noRegistrasi = document.getElementById('noRegistrasi').value.trim();
            if (!noRegistrasi) {
                showError('No. Registrasi harus diisi');
                return;
            }
            participantData.no_registrasi = noRegistrasi;
        } else if (eventType === 'Pertandingan') {
            const tinggiBadan = document.getElementById('tinggiBadan').value;
            const beratBadan = document.getElementById('beratBadan').value;
            const kategori = document.getElementById('kategori').value;
            
            if (!tinggiBadan || !beratBadan || !kategori) {
                showError('Semua field data pertandingan harus diisi');
                return;
            }
            
            participantData.tinggi_badan = parseInt(tinggiBadan);
            participantData.berat_badan = parseInt(beratBadan);
            participantData.kategori = kategori;
        }
        
        try {
            await eventRegistrationManager.registerParticipant(participantData);
            showSuccess();
            
            // Reload participants list
            await loadAndDisplayParticipants(eventId);
        } catch (error) {
            if (error.message.includes('duplicate key')) {
                showError('Murid sudah terdaftar di event ini');
            } else {
                showError('Error mendaftarkan peserta. Silakan coba lagi.');
            }
        }
    });
}

// ====== UI HELPER FUNCTIONS ======
function updateStudentInfo(selectElement) {
    const studentInfo = document.getElementById('studentInfo');
    const studentInfoGrid = document.getElementById('studentInfoGrid');
    
    if (selectElement.value) {
        const selectedOption = selectElement.options[selectElement.selectedIndex];
        
        studentInfoGrid.innerHTML = `
            <div><strong>Nama:</strong> ${selectedOption.dataset.nama}</div>
            <div><strong>Sabuk:</strong> ${selectedOption.dataset.sabuk}</div>
            <div><strong>Tempat Lahir:</strong> ${selectedOption.dataset.tempatLahir}</div>
            <div><strong>Tanggal Lahir:</strong> ${formatDate(selectedOption.dataset.tanggalLahir)}</div>
            <div><strong>Jenis Kelamin:</strong> ${selectedOption.dataset.jenisKelamin}</div>
        `;
        
        studentInfo.classList.remove('hidden');
    } else {
        studentInfo.classList.add('hidden');
    }
}

function updateConditionalFields(eventType) {
    const uktFields = document.getElementById('uktFields');
    const pertandinganFields = document.getElementById('pertandinganFields');
    
    uktFields.classList.add('hidden');
    pertandinganFields.classList.add('hidden');
    
    if (eventType === 'UKT') {
        uktFields.classList.remove('hidden');
    } else if (eventType === 'Pertandingan') {
        pertandinganFields.classList.remove('hidden');
    }
}

function showSuccess() {
    document.getElementById('registrationForm').classList.add('hidden');
    document.getElementById('successMessage').classList.remove('hidden');
}

function showError(message) {
    alert(message); // Simple alert for public form
}

// ====== GLOBAL FUNCTIONS ======
window.resetForm = function() {
    document.getElementById('successMessage').classList.add('hidden');
    document.getElementById('registrationForm').classList.remove('hidden');
    document.getElementById('participantForm').reset();
    document.getElementById('studentInfo').classList.add('hidden');
};

// ====== UTILITY FUNCTIONS ======
function getEventDataDisplay(participant) {
    if (participant.no_registrasi) {
        return `No: ${participant.no_registrasi}`;
    } else if (participant.kategori) {
        return `
            <div style="text-align: left; font-size: 0.9rem;">
                <div><strong>Kategori:</strong> ${participant.kategori}</div>
                <div><strong>Tinggi:</strong> ${participant.tinggi_badan || '-'} cm</div>
                <div><strong>Berat:</strong> ${participant.berat_badan || '-'} kg</div>
            </div>
        `;
    }
    return '-';
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID');
}