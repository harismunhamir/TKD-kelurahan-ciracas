// ====== KONFIGURASI SUPAABASE ======
const SUPABASE_URL = "https://bizryujdcymmjjzhurhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpenJ5dWpkY3ltbWpqemh1cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTUzMzAsImV4cCI6MjA3NDg3MTMzMH0.XuKnQ3MStAj6yp2rkxEmISnaJEUUYicBOBucU-rgLqc";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== SORTING STATE ======
let currentSort = { field: 'nama', direction: 'asc' };
let searchTerm = '';

// ====== EVENT DETAIL FUNCTIONS ======
const eventDetailManager = {
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
                .select('id, nama, sabuk,tempat_lahir, tanggal_lahir, jenis_kelamin')
                .order('nama');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading students:', error);
            throw error;
        }
    },

    // Get event participants
    async getParticipants(eventId) {
        try {
            const { data, error } = await client
                .from('event_registrations')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error loading participants:', error);
            throw error;
        }
    },

    // Add participant
    async addParticipant(participantData) {
        try {
            const { data, error } = await client
                .from('event_registrations')
                .insert([participantData])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error adding participant:', error);
            throw error;
        }
    },

    // Update participant status
    async updateParticipantStatus(participantId, field, value) {
        try {
            const { error } = await client
                .from('event_registrations')
                .update({ [field]: value })
                .eq('id', participantId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating participant:', error);
            throw error;
        }
    },

    // Delete participant
    async deleteParticipant(participantId) {
        try {
            const { error } = await client
                .from('event_registrations')
                .delete()
                .eq('id', participantId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting participant:', error);
            throw error;
        }
    }
};

// ====== UI MANAGEMENT ======
document.addEventListener('DOMContentLoaded', function() {
    initializeEventDetail();
});

async function initializeEventDetail() {
    try {
        const eventId = document.getElementById('currentEventId').value;
        
        // Load event details
        await loadEventDetails(eventId);
        
        // Load students for dropdown
        await loadStudentsDropdown();
        
        // Load participants
        await loadAndDisplayParticipants(eventId);
        
        // Initialize form handler
        initializeParticipantForm(eventId);
        
        // Initialize sorting
        initializeSorting();
        
    } catch (error) {
        showMessage('Error memuat detail event', 'error');
    }
}

function initializeSorting() {
    // Add sort event listeners
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('sortable')) {
            handleSort(e.target.dataset.sort);
        }
    });
}

async function loadEventDetails(eventId) {
    try {
        const event = await eventDetailManager.getEvent(eventId);
        
        document.getElementById('eventJenis').textContent = event.jenis_event;
        document.getElementById('eventJenis').className = `event-type-badge event-${event.jenis_event.toLowerCase()}`;
        document.getElementById('eventNama').textContent = event.nama_event;
        document.getElementById('eventWaktu').textContent = formatDateTime(event.waktu_event);
        
        // Update conditional fields based on event type
        updateConditionalFields(event.jenis_event);
        
    } catch (error) {
        showMessage('Error memuat detail event', 'error');
    }
}

async function loadStudentsDropdown() {
    try {
        const students = await eventDetailManager.getStudents();
        const select = document.getElementById('selectMurid');
        
        select.innerHTML = '<option value="">-- Pilih Murid --</option>' +
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
            
    } catch (error) {
        console.error('Error loading students dropdown:', error);
    }
}

async function loadAndDisplayParticipants(eventId) {
    try {
        const participants = await eventDetailManager.getParticipants(eventId);
        const tbody = document.getElementById('participantsTableBody');
        
        // Update participant count
        document.getElementById('eventPesertaCount').textContent = participants.length;
        
        if (participants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Belum ada peserta</td></tr>';
            return;
        }
        
        // Filter and sort participants
        let filteredParticipants = filterParticipants(participants);
        filteredParticipants = sortParticipants(filteredParticipants, currentSort.field, currentSort.direction);
        
        if (filteredParticipants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">Tidak ada data yang cocok dengan pencarian</td></tr>';
            return;
        }
        
        tbody.innerHTML = filteredParticipants.map(participant => `
            <tr>
                <td>${participant.nama}</td>
                <td>${participant.sabuk}</td>
                <td>${participant.tempat_lahir || '-'}, ${formatDate(participant.tanggal_lahir)}</td>
                <td>${getEventDataDisplay(participant)}</td>
                <td>
                    <div class="status-toggle">
                        <button class="${participant.persyaratan ? 'primary' : 'secondary'}" 
                                onclick="toggleStatus(${participant.id}, 'persyaratan', ${!participant.persyaratan})">
                            ${participant.persyaratan ? '☑️' : '□'} Persyaratan
                        </button>
                        <button class="${participant.pembayaran ? 'primary' : 'secondary'}" 
                                onclick="toggleStatus(${participant.id}, 'pembayaran', ${!participant.pembayaran})">
                            ${participant.pembayaran ? '☑️' : '□'} Pembayaran
                        </button>
                    </div>
                </td>
                <td>
                    <button class="action-btn delete-btn btn-sm" 
                            onclick="deleteParticipant(${participant.id})">
                        Hapus
                    </button>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        document.getElementById('participantsTableBody').innerHTML = 
            '<tr><td colspan="6" style="text-align: center; padding: 20px;">Error memuat data peserta</td></tr>';
    }
}

// ====== SORTING FUNCTIONS ======
function handleSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    updateSortIndicators();
    
    // Reload participants with new sorting
    const eventId = document.getElementById('currentEventId').value;
    loadAndDisplayParticipants(eventId);
}

function updateSortIndicators() {
    document.querySelectorAll('.sortable').forEach(header => {
        const field = header.dataset.sort;
        header.innerHTML = getHeaderText(field);
        if (header.dataset.sort === currentSort.field) {
            header.innerHTML += currentSort.direction === 'asc' ? ' ▲' : ' ▼';
        }
    });
}

function getHeaderText(field) {
    switch(field) {
        case 'nama': return 'Nama';
        case 'sabuk': return 'Sabuk';
        default: return field;
    }
}

function sortParticipants(participants, field, direction) {
    return [...participants].sort((a, b) => {
        let valueA, valueB;
        
        switch (field) {
            case 'nama':
                valueA = a.nama?.toLowerCase() || '';
                valueB = b.nama?.toLowerCase() || '';
                break;
            case 'sabuk':
                valueA = a.sabuk?.toLowerCase() || '';
                valueB = b.sabuk?.toLowerCase() || '';
                break;
            default:
                return 0;
        }
        
        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function filterParticipants(participants) {
    if (!searchTerm) return participants;
    
    return participants.filter(participant => 
        participant.nama?.toLowerCase().includes(searchTerm) ||
        participant.sabuk?.toLowerCase().includes(searchTerm)
    );
}

function initializeParticipantForm(eventId) {
    const form = document.getElementById('addParticipantForm');
    const studentSelect = document.getElementById('selectMurid');
    
    // Update conditional fields when event type is known
    const eventType = document.getElementById('eventJenis').textContent;
    updateConditionalFields(eventType);
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const studentId = studentSelect.value;
        const selectedOption = studentSelect.options[studentSelect.selectedIndex];
        
        if (!studentId) {
            showMessage('Pilih murid terlebih dahulu', 'error');
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
                showMessage('No. Registrasi harus diisi untuk UKT', 'error');
                return;
            }
            participantData.no_registrasi = noRegistrasi;
        } else if (eventType === 'Pertandingan') {
            participantData.tinggi_badan = parseInt(document.getElementById('tinggiBadan').value) || null;
            participantData.berat_badan = parseInt(document.getElementById('beratBadan').value) || null;
            participantData.kategori = document.getElementById('kategori').value || null;
        }
        
        try {
            await eventDetailManager.addParticipant(participantData);
            showMessage('Peserta berhasil ditambahkan!', 'success');
            form.reset();
            await loadAndDisplayParticipants(eventId);
        } catch (error) {
            if (error.message.includes('duplicate key')) {
                showMessage('Murid sudah terdaftar di event ini', 'error');
            } else {
                showMessage('Error menambahkan peserta', 'error');
            }
        }
    });
}

// ====== GLOBAL FUNCTIONS ======
window.copyRegistrationLink = function() {
    const eventId = document.getElementById('currentEventId').value;
    const url = `${window.location.origin}/event-registration.html?event=${eventId}`;
    
    navigator.clipboard.writeText(url).then(() => {
        showMessage('Link pendaftaran berhasil disalin!', 'success');
    }).catch(() => {
        // Fallback
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showMessage('Link pendaftaran berhasil disalin!', 'success');
    });
};

window.toggleStatus = async function(participantId, field, newValue) {
    try {
        await eventDetailManager.updateParticipantStatus(participantId, field, newValue);
        showMessage('Status berhasil diupdate', 'success');
        
        // Reload participants
        const eventId = document.getElementById('currentEventId').value;
        await loadAndDisplayParticipants(eventId);
    } catch (error) {
        showMessage('Error mengupdate status', 'error');
    }
};

window.deleteParticipant = async function(participantId) {
    if (!confirm('Yakin ingin menghapus peserta ini?')) {
        return;
    }
    
    try {
        await eventDetailManager.deleteParticipant(participantId);
        showMessage('Peserta berhasil dihapus', 'success');
        
        const eventId = document.getElementById('currentEventId').value;
        await loadAndDisplayParticipants(eventId);
    } catch (error) {
        showMessage('Error menghapus peserta', 'error');
    }
};

// ====== SEARCH FUNCTIONALITY ======
window.initializeSearch = function() {
    const searchContainer = document.createElement('div');
    searchContainer.style.marginBottom = '15px';
    searchContainer.style.display = 'flex';
    searchContainer.style.gap = '10px';
    searchContainer.style.alignItems = 'center';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Cari nama atau sabuk...';
    searchInput.style.padding = '8px 12px';
    searchInput.style.border = '1px solid #ddd';
    searchInput.style.borderRadius = '4px';
    searchInput.style.flex = '1';
    searchInput.style.maxWidth = '300px';
    
    const clearSearchBtn = document.createElement('button');
    clearSearchBtn.textContent = 'Clear';
    clearSearchBtn.className = 'action-btn';
    clearSearchBtn.style.padding = '8px 16px';
    
    searchInput.addEventListener('input', function(e) {
        searchTerm = e.target.value.toLowerCase();
        const eventId = document.getElementById('currentEventId').value;
        loadAndDisplayParticipants(eventId);
    });
    
    clearSearchBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchTerm = '';
        const eventId = document.getElementById('currentEventId').value;
        loadAndDisplayParticipants(eventId);
    });
    
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(clearSearchBtn);
    
    // Insert search before the table
    const tableContainer = document.querySelector('.table-container');
    tableContainer.parentNode.insertBefore(searchContainer, tableContainer);
};

// ====== UTILITY FUNCTIONS ======
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
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID');
}

// ====== UTILITY FUNCTIONS ======
function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID');
  } catch (error) {
    return '-';
  }
}

function showMessage(message, type = 'info') {
    const existing = document.querySelector('.message');
    if (existing) existing.remove();
    
    const msg = document.createElement('div');
    msg.className = `message ${type}-message`;
    msg.textContent = message;
    msg.style.cssText = 'padding: 10px; margin: 10px; border-radius: 5px; font-weight: bold;';
    
    if (type === 'info') msg.style.background = '#d1ecf1';
    if (type === 'success') msg.style.background = '#d4edda';
    if (type === 'error') msg.style.background = '#f8d7da';
    
    document.querySelector('.content').prepend(msg);
    
    if (type !== 'error') {
        setTimeout(() => msg.remove(), 3000);
    }
}