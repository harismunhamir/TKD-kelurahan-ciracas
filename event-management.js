// ====== KONFIGURASI SUPAABASE ======
const SUPABASE_URL = "https://bizryujdcymmjjzhurhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpenJ5dWpkY3ltbWpqemh1cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTUzMzAsImV4cCI6MjA3NDg3MTMzMH0.XuKnQ3MStAj6yp2rkxEmISnaJEUUYicBOBucU-rgLqc";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ====== EVENT MANAGEMENT FUNCTIONS ======
const eventManager = {
    // Create new event
    async createEvent(eventData) {
        try {
            const { data, error } = await client
                .from('events')
                .insert([{
                    jenis_event: eventData.jenisEvent,
                    nama_event: eventData.namaEvent,
                    waktu_event: eventData.waktuEvent
                }])
                .select();

            if (error) throw error;
            return data[0];
        } catch (error) {
            console.error('Error creating event:', error);
            throw error;
        }
    },

    // Get all events with participant count
    async getEvents() {
        try {
            const { data: events, error } = await client
                .from('events')
                .select(`
                    *,
                    event_registrations (id)
                `)
                .order('waktu_event', { ascending: true });

            if (error) throw error;
            
            // Add participant count to each event
            return events.map(event => ({
                ...event,
                participant_count: event.event_registrations?.length || 0
            }));
        } catch (error) {
            console.error('Error loading events:', error);
            throw error;
        }
    },

    // Delete event
    async deleteEvent(eventId) {
        try {
            const { error } = await client
                .from('events')
                .delete()
                .eq('id', eventId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    },

    // Generate registration URL
    generateRegistrationUrl(eventId) {
        return `${window.location.origin}/event-registration.html?event=${eventId}`;
    }
};

// ====== UI MANAGEMENT ======
document.addEventListener('DOMContentLoaded', function() {
    initializeEventManagement();
});

async function initializeEventManagement() {
    try {
        // Load events
        await loadAndDisplayEvents();
        
        // Initialize form handler
        initializeEventForm();
        
    } catch (error) {
        showMessage('Error memuat event management', 'error');
    }
}

async function loadAndDisplayEvents() {
    try {
        const events = await eventManager.getEvents();
        const tbody = document.getElementById('eventsTableBody');
        
        if (events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Belum ada event</td></tr>';
            return;
        }
        
        tbody.innerHTML = events.map(event => `
            <tr>
                <td>
                    <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; 
                          background: ${event.jenis_event === 'UKT' ? '#007bff' : '#28a745'}; 
                          margin-right: 8px;"></span>
                    ${event.jenis_event}
                </td>
                <td>${event.nama_event}</td>
                <td>${formatDateTime(event.waktu_event)}</td>
                <td>${event.participant_count} peserta</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn primary btn-sm" 
                                onclick="viewEventDetail(${event.id})">
                            Detail
                        </button>
                        <button class="action-btn primary btn-sm" 
                                onclick="copyRegistrationLink(${event.id})">
                            📋 Link
                        </button>
                        <button class="action-btn delete-btn btn-sm" 
                                onclick="deleteEvent(${event.id})">
                            Hapus
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        document.getElementById('eventsTableBody').innerHTML = 
            '<tr><td colspan="5" style="text-align: center; padding: 20px;">Error memuat data events</td></tr>';
    }
}

function initializeEventForm() {
    document.getElementById('createEventForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const jenisEvent = document.getElementById('jenisEvent').value;
        const namaEvent = document.getElementById('namaEvent').value.trim();
        const waktuEvent = document.getElementById('waktuEvent').value;
        
        if (!jenisEvent || !namaEvent || !waktuEvent) {
            showMessage('Semua field harus diisi', 'error');
            return;
        }
        
        try {
            await eventManager.createEvent({ jenisEvent, namaEvent, waktuEvent });
            showMessage('Event berhasil dibuat!', 'success');
            this.reset();
            await loadAndDisplayEvents();
        } catch (error) {
            showMessage('Error membuat event', 'error');
        }
    });
}

// ====== GLOBAL FUNCTIONS ======
window.viewEventDetail = function(eventId) {
    window.location.href = `event-detail.html?event=${eventId}`;
};

window.copyRegistrationLink = async function(eventId) {
    const url = eventManager.generateRegistrationUrl(eventId);
    try {
        await navigator.clipboard.writeText(url);
        showMessage('Link pendaftaran berhasil disalin!', 'success');
    } catch (error) {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = url;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);
        showMessage('Link pendaftaran berhasil disalin!', 'success');
    }
};

window.deleteEvent = async function(eventId) {
    if (!confirm('Yakin ingin menghapus event ini? Semua data peserta juga akan terhapus.')) {
        return;
    }
    
    try {
        await eventManager.deleteEvent(eventId);
        showMessage('Event berhasil dihapus', 'success');
        await loadAndDisplayEvents();
    } catch (error) {
        showMessage('Error menghapus event', 'error');
    }
};

// ====== UTILITY FUNCTIONS ======
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