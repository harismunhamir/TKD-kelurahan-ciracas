// ====== KONFIGURASI SUPAABASE ======
const SUPABASE_URL = "https://bizryujdcymmjjzhurhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpenJ5dWpkY3ltbWpqemh1cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTUzMzAsImV4cCI6MjA3NDg3MTMzMH0.XuKnQ3MStAj6yp2rkxEmISnaJEUUYicBOBucU-rgLqc";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let students = [];
let paymentData = new Map();
let detailData = new Map();
let currentSort = { field: 'nama', direction: 'asc' };
let searchTerm = '';

// Initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Starting Bayaran App...');
    initializeApp();
});

async function initializeApp() {
    try {
        // Set current date
        const now = new Date();
        document.getElementById('tahunSelect').value = now.getFullYear();
        document.getElementById('bulanSelect').value = now.getMonth() + 1;
        
        // Auto-load when year/month changes
        document.getElementById('tahunSelect').addEventListener('change', loadAndDisplayData);
        document.getElementById('bulanSelect').addEventListener('change', loadAndDisplayData);
        
        // Search functionality
        document.getElementById('searchInput').addEventListener('input', function(e) {
            searchTerm = e.target.value.toLowerCase();
            renderPaymentTable(parseInt(document.getElementById('tahunSelect').value));
        });
        
        // Sorting
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', () => handleSort(header.dataset.sort));
        });
        
        // Export button
        document.getElementById('exportExcelBtn').addEventListener('click', () => {
            showMessage('Export Excel coming soon', 'info');
        });
        
        // Modal functionality
        initializeModal();
        
        // Load initial data
        await loadAndDisplayData();
        console.log('✅ App ready');
    } catch (error) {
        console.error('Startup error:', error);
    }
}

// ====== MODAL FUNCTIONALITY ======
function initializeModal() {
    const modal = document.getElementById('detailModal');
    const closeBtn = document.querySelector('#detailModal .close');
    const cancelBtn = document.getElementById('cancelDetail');
    const metodeSelect = document.getElementById('metodeBayar');
    const form = document.getElementById('detailForm');
    
    // Close modal events
    [closeBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('click', () => modal.classList.add('hidden'));
    });
    
    // Metode bayar change
    metodeSelect.addEventListener('change', function() {
        document.getElementById('cashFields').classList.add('hidden');
        document.getElementById('bankFields').classList.add('hidden');
        
        if (this.value === 'cash') {
            document.getElementById('cashFields').classList.remove('hidden');
        } else if (this.value === 'bank') {
            document.getElementById('bankFields').classList.remove('hidden');
        }
    });
    
    // File preview
    document.getElementById('buktiBayar').addEventListener('change', function(e) {
        const preview = document.getElementById('previewContainer');
        preview.innerHTML = '';
        preview.classList.add('hidden');
        
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview Bukti">`;
                preview.classList.remove('hidden');
            }
            reader.readAsDataURL(e.target.files[0]);
        }
    });
    
    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveDetailPayment();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

// ====== LOAD DATA ======
async function loadAndDisplayData() {
    const tahun = parseInt(document.getElementById('tahunSelect').value);
    const bulan = parseInt(document.getElementById('bulanSelect').value);
    
    console.log('Loading data for:', { tahun, bulan });
    
    try {
        // Load students
        const { data: studentsData, error: studentsError } = await client.from('murid').select('*');
        if (studentsError) throw studentsError;
        students = studentsData || [];
        
        // Load payments
        const { data: paymentsData, error: paymentsError } = await client.from('pembayaran').select('*').eq('tahun', tahun);
        if (paymentsError) throw paymentsError;
        
        paymentData.clear();
        paymentsData?.forEach(record => {
            paymentData.set(`${record.murid_id}-${record.tahun}`, record);
        });
        
        // Load detail payments
        const { data: detailPayments, error: detailError } = await client.from('detail_pembayaran').select('*').eq('tahun', tahun);
        if (detailError) throw detailError;
        
        detailData.clear();
        detailPayments?.forEach(record => {
            detailData.set(`${record.murid_id}-${record.tahun}-${record.bulan}`, record);
        });
        
        // Update display
        updateReportDisplay(bulan, tahun);
        renderPaymentTable(tahun);
        
    } catch (error) {
        console.error('Data loading error:', error);
        showMessage('Error memuat data', 'error');
    }
}

function updateReportDisplay(bulan, tahun) {
    const totalMurid = students.length;
    let sudahBayar = 0;
    
    students.forEach(student => {
        const key = `${student.id}-${tahun}`;
        const payment = paymentData.get(key);
        const bulanField = getBulanField(bulan);
        if (payment && payment[bulanField]) sudahBayar++;
    });
    
    const belumBayar = totalMurid - sudahBayar;
    const persentase = totalMurid > 0 ? Math.round((sudahBayar / totalMurid) * 100) : 0;
    const target = totalMurid * 125000;
    const realisasi = sudahBayar * 125000;
    const selisih = target - realisasi;
    
    document.getElementById('totalMurid').textContent = `${totalMurid} anak`;
    document.getElementById('sudahBayar').textContent = `${sudahBayar} anak (${persentase}%)`;
    document.getElementById('belumBayar').textContent = `${belumBayar} anak (${100 - persentase}%)`;
    document.getElementById('targetPemasukan').textContent = formatRupiah(target);
    document.getElementById('realisasiPemasukan').textContent = formatRupiah(realisasi);
    document.getElementById('selisih').textContent = formatRupiah(selisih);
}

// ====== RENDER TABLE ======
function renderPaymentTable(tahun) {
    const tbody = document.getElementById('bayaranBody');
    tbody.innerHTML = '';
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 20px;">Tidak ada data murid</td></tr>';
        return;
    }
    
    // Filter and sort data
    let filteredStudents = filterStudents(students);
    filteredStudents = sortStudents(filteredStudents, currentSort.field, currentSort.direction);
    
    if (filteredStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="19" style="text-align: center; padding: 20px;">Tidak ada data yang cocok dengan pencarian</td></tr>';
        return;
    }
    
    filteredStudents.forEach((student, index) => {
        const key = `${student.id}-${tahun}`;
        const payment = paymentData.get(key);
        
        const row = document.createElement('tr');
        
        // Calculate total
        let totalBulan = 0;
        const bulanFields = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 
                            'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
        
        const bulanCells = bulanFields.map((field, idx) => {
            const bulanKey = `${student.id}-${tahun}-${idx + 1}`;
            const hasDetail = detailData.has(bulanKey);
            const isPaid = payment && payment[field];
            
            totalBulan += isPaid ? 1 : 0;
            
            return `
                <td class="bulan-column" onclick="quickToggle(${student.id}, ${idx + 1})">
                    ${isPaid ? '✅' : '❌'}
                    ${isPaid ? `<span class="detail-icon" onclick="event.stopPropagation(); openDetailModal(${student.id}, ${idx + 1})">📝</span>` : ''}
                </td>
            `;
        }).join('');
        
        const totalBayar = totalBulan * 125000;
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${student.nama || '-'}</td>
            <td>${student.sabuk || '-'}</td>
            <td>${calcAge(student.tanggal_lahir)}</td>
            <td>${calcTenure(student.tanggal_gabung)}</td>
            <td>
                <select class="status-select" onchange="updateStudentStatus(${student.id}, this.value)" style="padding: 5px; border-radius: 3px; border: 1px solid #ddd;">
                    <option value="aktif" ${(payment?.status_murid || 'aktif') === 'aktif' ? 'selected' : ''}>✅ Aktif</option>
                    <option value="vakum" ${(payment?.status_murid || 'aktif') === 'vakum' ? 'selected' : ''}>⏸️ Vakum</option>
                    <option value="keluar" ${(payment?.status_murid || 'aktif') === 'keluar' ? 'selected' : ''}>❌ Keluar</option>
                </select>
            </td>
            ${bulanCells}
            <td><strong>${formatRupiah(totalBayar)}</strong></td>
            <!-- KOLOM AKSI SUDAH DIHAPUS -->
        `;
        
        tbody.appendChild(row);
    });
}

// ====== DETAIL PAYMENT FUNCTIONS ======
window.openDetailModal = function(muridId, bulan) {
    const tahun = parseInt(document.getElementById('tahunSelect').value);
    const detailKey = `${muridId}-${tahun}-${bulan}`;
    const detail = detailData.get(detailKey);
    const student = students.find(s => s.id === muridId);
    
    // Set form values
    document.getElementById('detailMuridId').value = muridId;
    document.getElementById('detailTahun').value = tahun;
    document.getElementById('detailBulan').value = bulan;
    
    document.getElementById('metodeBayar').value = detail?.metode_bayar || '';
    document.getElementById('namaPenerima').value = detail?.nama_penerima || '';
    document.getElementById('bankTujuan').value = detail?.bank_tujuan || '';
    
    // Trigger metode change to show/hide fields
    document.getElementById('metodeBayar').dispatchEvent(new Event('change'));
    
    // Clear file input and preview
    document.getElementById('buktiBayar').value = '';
    document.getElementById('previewContainer').classList.add('hidden');
    
    // Show modal
    document.getElementById('detailModal').classList.remove('hidden');
    
    // Set modal title
    document.querySelector('#detailModal h3').textContent = 
        `Detail Pembayaran - ${student?.nama || 'Murid'} (${getBulanName(bulan)} ${tahun})`;
}

async function saveDetailPayment() {
    const muridId = parseInt(document.getElementById('detailMuridId').value);
    const tahun = parseInt(document.getElementById('detailTahun').value);
    const bulan = parseInt(document.getElementById('detailBulan').value);
    const metodeBayar = document.getElementById('metodeBayar').value;
    const namaPenerima = document.getElementById('namaPenerima').value;
    const bankTujuan = document.getElementById('bankTujuan').value;
    const buktiFile = document.getElementById('buktiBayar').files[0];
    
    try {
        let buktiUrl = '';
        
        // Upload bukti if exists
        if (buktiFile) {
            const fileExt = buktiFile.name.split('.').pop();
            const fileName = `${muridId}-${tahun}-${bulan}-${Date.now()}.${fileExt}`;
            
            const { data: uploadData, error: uploadError } = await client.storage
                .from('bukti-bayar')
                .upload(fileName, buktiFile);
                
            if (uploadError) throw uploadError;
            
            // Get public URL
            const { data: urlData } = client.storage
                .from('bukti-bayar')
                .getPublicUrl(fileName);
                
            buktiUrl = urlData.publicUrl;
        }
        
        const detailKey = `${muridId}-${tahun}-${bulan}`;
        const existingDetail = detailData.get(detailKey);
        
        const detailRecord = {
            murid_id: muridId,
            tahun: tahun,
            bulan: bulan,
            metode_bayar: metodeBayar,
            nama_penerima: metodeBayar === 'cash' ? namaPenerima : null,
            bank_tujuan: metodeBayar === 'bank' ? bankTujuan : null,
            bukti_bayar: buktiUrl,
            tanggal_bayar: new Date().toISOString()
        };
        
        if (existingDetail) {
            // Update existing
            await client.from('detail_pembayaran')
                .update(detailRecord)
                .eq('id', existingDetail.id);
        } else {
            // Insert new
            await client.from('detail_pembayaran')
                .insert([detailRecord]);
        }
        
        // Update local data
        detailData.set(detailKey, { ...(existingDetail || {}), ...detailRecord });
        
        // Close modal and show success
        document.getElementById('detailModal').classList.add('hidden');
        showMessage('Detail pembayaran berhasil disimpan', 'success');
        
    } catch (error) {
        console.error('Save detail error:', error);
        showMessage('Error menyimpan detail pembayaran', 'error');
    }
}

// ====== EXISTING FUNCTIONS ======
window.quickToggle = async function(muridId, bulan) {
    const tahun = parseInt(document.getElementById('tahunSelect').value);
    const key = `${muridId}-${tahun}`;
    const payment = paymentData.get(key);
    const bulanField = getBulanField(bulan);
    
    const newStatus = !(payment && payment[bulanField]);
    
    const updateData = {
        murid_id: muridId,
        tahun: tahun,
        [bulanField]: newStatus,
        status_murid: payment?.status_murid || 'aktif',
        updated_at: new Date().toISOString()
    };
    
    try {
        if (payment) {
            await client.from('pembayaran').update(updateData).eq('id', payment.id);
        } else {
            await client.from('pembayaran').insert([updateData]);
        }
        
        paymentData.set(key, { ...(payment || {}), ...updateData });
        
        // Refresh display
        const currentBulan = parseInt(document.getElementById('bulanSelect').value);
        updateReportDisplay(currentBulan, tahun);
        renderPaymentTable(tahun);
        
        showMessage(`Status diperbarui: ${newStatus ? 'Sudah Bayar' : 'Belum Bayar'}`, 'success');
        
    } catch (error) {
        console.error('Toggle error:', error);
        showMessage('Error memperbarui status', 'error');
    }
}

window.updateStudentStatus = async function(muridId, status) {
    const tahun = parseInt(document.getElementById('tahunSelect').value);
    const key = `${muridId}-${tahun}`;
    const payment = paymentData.get(key);
    
    const updateData = {
        murid_id: muridId,
        tahun: tahun,
        status_murid: status,
        updated_at: new Date().toISOString()
    };
    
    const bulanFields = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 
                        'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    bulanFields.forEach(field => {
        if (payment && payment[field] !== undefined) {
            updateData[field] = payment[field];
        }
    });
    
    try {
        if (payment) {
            await client.from('pembayaran').update(updateData).eq('id', payment.id);
        } else {
            await client.from('pembayaran').insert([updateData]);
        }
        
        paymentData.set(key, { ...(payment || {}), ...updateData });
        showMessage('Status murid diperbarui', 'success');
        
    } catch (error) {
        console.error('Update status error:', error);
        showMessage('Error memperbarui status murid', 'error');
    }
}

// FUNCTION DELETE SUDAH DIHAPUS

function getBulanName(bulan) {
    const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return names[bulan - 1] || '';
}

function getBulanField(bulan) {
    const fields = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 
                   'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    return fields[bulan - 1] || 'januari';
}

function calcAge(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear();
    if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) y--;
    return y + " th";
}

function calcTenure(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    const now = new Date();
    let y = now.getFullYear() - d.getFullYear();
    let m = now.getMonth() - d.getMonth();
    if (now.getDate() < d.getDate()) m--;
    if (m < 0) { y--; m += 12; }
    return (y ? y + " th " : "") + (m ? m + " bln" : "") || "<1 bln";
}

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
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

function filterStudents(students) {
    if (!searchTerm) return students;
    
    return students.filter(student => 
        student.nama?.toLowerCase().includes(searchTerm) ||
        student.sabuk?.toLowerCase().includes(searchTerm)
    );
}

function handleSort(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
    }
    
    document.querySelectorAll('.sortable').forEach(header => {
        header.innerHTML = header.dataset.sort;
        if (header.dataset.sort === field) {
            header.innerHTML += currentSort.direction === 'asc' ? ' ▲' : ' ▼';
        }
    });
    
    renderPaymentTable(parseInt(document.getElementById('tahunSelect').value));
}

function sortStudents(students, field, direction) {
    return [...students].sort((a, b) => {
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
            case 'usia':
                valueA = parseAge(a.tanggal_lahir);
                valueB = parseAge(b.tanggal_lahir);
                break;
            default:
                return 0;
        }
        
        if (valueA < valueB) return direction === 'asc' ? -1 : 1;
        if (valueA > valueB) return direction === 'asc' ? 1 : -1;
        return 0;
    });
}

function parseAge(isoDate) {
    if (!isoDate) return 0;
    const birthDate = new Date(isoDate);
    const today = new Date();
    return today.getFullYear() - birthDate.getFullYear();
}