// ====== KONFIGURASI SUPAABASE ======
const SUPABASE_URL = "https://bizryujdcymmjjzhurhi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpenJ5dWpkY3ltbWpqemh1cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTUzMzAsImV4cCI6MjA3NDg3MTMzMH0.XuKnQ3MStAj6yp2rkxEmISnaJEUUYicBOBucU-rgLqc";

// Buat client Supabase
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// DOM Elements
const btnPengisian = document.getElementById("btnPengisian");
const btnHistory = document.getElementById("btnHistory");
const pengisianSection = document.getElementById("pengisianSection");
const historySection = document.getElementById("historySection");

const newDateInput = document.getElementById("newDateInput");
const addTanggalBtn = document.getElementById("addTanggalBtn");
const saveAttendanceBtn = document.getElementById("saveAttendanceBtn");
const attendanceHeadRow = document.getElementById("attendanceHeadRow");
const attendanceBody = document.getElementById("attendanceBody");

const historyMonth = document.getElementById("historyMonth");
const loadHistoryBtn = document.getElementById("loadHistoryBtn");
const historyHeadRow = document.getElementById("historyHeadRow");
const historyBody = document.getElementById("historyBody");

// State
let students = [];
let selectedStudents = [];
let dateColumns = [];
let attendanceData = new Map();

// Sorting state
let currentSort = { field: 'nama', direction: 'asc' };
let searchTerm = '';

// Utility Functions
function calcAge(iso){
  if(!iso) return "-";
  const d = new Date(iso);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  if(now.getMonth()<d.getMonth() || (now.getMonth()===d.getMonth() && now.getDate()<d.getDate())) y--;
  return y+" th";
}

function calcTenure(iso){
  if(!iso) return "-";
  const d = new Date(iso);
  const now = new Date();
  let y = now.getFullYear() - d.getFullYear();
  let m = now.getMonth() - d.getMonth();
  if(now.getDate()<d.getDate()) m--;
  if(m<0){ y--; m+=12; }
  return (y?y+" th ":"")+(m?m+" bln":"") || "<1 bln";
}

function fmt(iso){
  const d = new Date(iso+"T00:00:00");
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function showMessage(message, type = 'info') {
  const existingMsg = document.querySelector('.message');
  if (existingMsg) existingMsg.remove();

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}-message`;
  messageDiv.textContent = message;
  
  document.querySelector('main').insertBefore(messageDiv, document.querySelector('.mode-select'));
  
  if (type !== 'error') {
    setTimeout(() => messageDiv.remove(), 5000);
  }
}

// Load students data
async function loadStudents(){
  try {
    showMessage('Memuat data murid...', 'info');
    
    const { data, error } = await client.from('murid').select('*');
    
    if(error){
      console.error("Error loading students:", error);
      if (error.code === '42501' || error.status === 401) {
        showMessage('Error: Akses ditolak. Periksa RLS di Supabase.', 'error');
      } else {
        showMessage(`Error: ${error.message}`, 'error');
      }
      return;
    }
    
    students = data || [];
    
    if (students.length === 0) {
      showMessage('Tidak ada data murid. Silakan tambah data di Supabase.', 'warning');
    } else {
      showMessage(`Berhasil memuat ${students.length} murid`, 'success');
    }
    
    selectedStudents = [...students];
    renderStudentSelection();
    
  } catch (err) {
    console.error("Exception:", err);
    showMessage('Terjadi kesalahan saat memuat data', 'error');
  }
}

// Render student selection panel
function renderStudentSelection() {
  const existingPanel = document.getElementById('studentSelectionPanel');
  if (existingPanel) {
    existingPanel.remove();
  }

  if (students.length === 0) {
    const panel = document.createElement('div');
    panel.id = 'studentSelectionPanel';
    panel.className = 'student-selection-panel';
    panel.innerHTML = `
      <h3>Pilih Murid untuk Absensi</h3>
      <div style="text-align: center; padding: 20px;">
        <p>Tidak ada data murid.</p>
        <button onclick="location.reload()" class="primary">Refresh</button>
      </div>
    `;
    pengisianSection.insertBefore(panel, pengisianSection.querySelector('.toolbar'));
    return;
  }

  const panel = document.createElement('div');
  panel.id = 'studentSelectionPanel';
  panel.className = 'student-selection-panel';
  
  panel.innerHTML = `
    <h3>Pilih Murid untuk Absensi</h3>
    <div class="selection-controls">
      <button id="selectAllBtn">Pilih Semua</button>
      <button id="deselectAllBtn">Batal Semua</button>
      <button id="confirmSelectionBtn" class="primary">Konfirmasi Pilihan</button>
    </div>
    <div class="students-list">
      ${students.map(student => `
        <div class="student-item">
          <label>
            <input type="checkbox" value="${student.id}" checked>
            <span class="student-info">
              <strong>${student.nama || 'No Name'}</strong> 
              - ${student.sabuk || "-"} 
              - ${calcAge(student.tanggal_lahir)} 
              - ${calcTenure(student.tanggal_gabung)}
            </span>
          </label>
        </div>
      `).join('')}
    </div>
  `;

  pengisianSection.insertBefore(panel, pengisianSection.querySelector('.toolbar'));

  document.getElementById('selectAllBtn').addEventListener('click', selectAllStudents);
  document.getElementById('deselectAllBtn').addEventListener('click', deselectAllStudents);
  document.getElementById('confirmSelectionBtn').addEventListener('click', confirmStudentSelection);
}

function selectAllStudents() {
  document.querySelectorAll('#studentSelectionPanel input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = true;
  });
}

function deselectAllStudents() {
  document.querySelectorAll('#studentSelectionPanel input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
}

function confirmStudentSelection() {
  const selectedIds = new Set();
  document.querySelectorAll('#studentSelectionPanel input[type="checkbox"]:checked').forEach(checkbox => {
    selectedIds.add(parseInt(checkbox.value));
  });

  selectedStudents = students.filter(student => selectedIds.has(student.id));
  
  if (selectedStudents.length === 0) {
    showMessage('Pilih minimal satu murid!', 'warning');
    return;
  }

  document.getElementById('studentSelectionPanel').style.display = 'none';
  showMessage(`Dipilih ${selectedStudents.length} murid`, 'success');
  renderAttendanceTable();
}

// Render attendance table
function renderAttendanceTable(){
  attendanceHeadRow.innerHTML = `
    <th class="sortable" data-sort="nama">Nama</th>
    <th class="sortable" data-sort="sabuk">Sabuk</th>
    <th class="sortable" data-sort="usia">Usia</th>
    <th class="sortable" data-sort="lama">Lama Latihan</th>
  `;
  attendanceBody.innerHTML = "";
  
  dateColumns.forEach(d => {
    const th = document.createElement("th");
    th.textContent = fmt(d);
    th.className = "date-column";
    attendanceHeadRow.appendChild(th);
  });
  
  // Update sort indicators
  updateSortIndicators();
  
  if (selectedStudents.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = dateColumns.length + 4;
    td.textContent = "Tidak ada murid yang dipilih";
    td.style.textAlign = "center";
    td.style.padding = "20px";
    tr.appendChild(td);
    attendanceBody.appendChild(tr);
    return;
  }
  
  // Filter and sort data
  let filteredStudents = filterStudents(selectedStudents);
  filteredStudents = sortStudents(filteredStudents, currentSort.field, currentSort.direction);
  
  if (filteredStudents.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = dateColumns.length + 4;
    td.textContent = "Tidak ada data yang cocok dengan pencarian";
    td.style.textAlign = "center";
    td.style.padding = "20px";
    tr.appendChild(td);
    attendanceBody.appendChild(tr);
    return;
  }
  
  filteredStudents.forEach(student => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.nama || 'No Name'}</td>
      <td>${student.sabuk || "-"}</td>
      <td>${calcAge(student.tanggal_lahir)}</td>
      <td>${calcTenure(student.tanggal_gabung)}</td>
    `;
    
    dateColumns.forEach(date => {
      const td = document.createElement("td");
      td.className = "attendance-cell";
      
      const key = `${student.id}|${date}`;
      const currentStatus = attendanceData.get(key) || false;
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.muridId = student.id;
      checkbox.dataset.tanggal = date;
      checkbox.checked = currentStatus;
      
      checkbox.addEventListener('change', (e) => {
        handleAttendanceChange(student.id, date, e.target.checked);
      });
      
      td.appendChild(checkbox);
      tr.appendChild(td);
    });
    
    attendanceBody.appendChild(tr);
  });
}

function handleAttendanceChange(muridId, tanggal, status) {
  const key = `${muridId}|${tanggal}`;
  attendanceData.set(key, status);
  console.log(`Attendance updated: ${key} = ${status}`);
  showMessage('Perubahan tersimpan sementara. Klik "Simpan Absen" untuk menyimpan permanen.', 'info');
}

// Add new date column
async function addDateColumn(iso){
  if(!iso) {
    showMessage("Pilih tanggal terlebih dahulu!", 'warning');
    return;
  }
  
  if(dateColumns.includes(iso)) {
    showMessage("Tanggal ini sudah ditambahkan!", 'warning');
    return;
  }
  
  try {
    showMessage('Menambahkan tanggal...', 'info');
    
    dateColumns.push(iso); 
    dateColumns.sort();
    
    const { data, error } = await client.from('Absensi')
      .select('*')
      .eq('tanggal', iso);
      
    if(error) {
      console.error("Error loading attendance:", error);
      if (error.code === '42501' || error.status === 401) {
        showMessage('Error: Akses ditolak ke tabel Absensi. Periksa RLS di Supabase.', 'error');
      } else {
        showMessage(`Error: ${error.message}`, 'error');
      }
      return;
    }
    
    (data||[]).forEach(record => {
      const key = `${record.murid_id}|${record.tanggal}`;
      attendanceData.set(key, record.status);
    });
    
    renderAttendanceTable();
    newDateInput.value = "";
    showMessage(`Tanggal ${fmt(iso)} berhasil ditambahkan`, 'success');
    
  } catch (err) {
    console.error("Error:", err);
    showMessage("Gagal menambahkan tanggal", 'error');
  }
}

// Save all attendance dengan error handling yang lebih baik
async function saveAllAttendance() {
  try {
    if (attendanceData.size === 0) {
      showMessage("Tidak ada data untuk disimpan", 'warning');
      return;
    }

    showMessage('Menyimpan absensi...', 'info');

    const updates = [];
    
    attendanceData.forEach((status, key) => {
      const [muridId, tanggal] = key.split('|');
      updates.push({
        murid_id: parseInt(muridId),
        tanggal: tanggal,
        status: status
      });
    });

    const { error } = await client.from('Absensi').upsert(updates);

    if(error) {
      console.error("Error saving attendance:", error);
      if (error.code === '42501' || error.status === 401) {
        showMessage('ERROR: Akses ditolak. Silakan nonaktifkan RLS untuk tabel Absensi di Supabase.', 'error');
      } else {
        showMessage(`Error: ${error.message}`, 'error');
      }
    } else {
      showMessage(`Berhasil menyimpan ${updates.length} data absensi!`, 'success');
    }
    
  } catch (err) {
    console.error("Exception:", err);
    showMessage("Terjadi kesalahan saat menyimpan", 'error');
  }
}

// Load history data
async function loadHistory(){
  const selectedMonth = historyMonth.value;
  if(!selectedMonth) {
    showMessage("Pilih bulan terlebih dahulu!", 'warning');
    return;
  }

  try {
    showMessage('Memuat history...', 'info');
    
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = `${year}-${month}-${getDaysInMonth(parseInt(year), parseInt(month))}`;

    const { data: attendanceData, error } = await client
      .from('Absensi')
      .select('*')
      .gte('tanggal', startDate)
      .lte('tanggal', endDate);

    if(error) {
      console.error('Error loading history:', error);
      if (error.code === '42501' || error.status === 401) {
        showMessage('Error: Akses ditolak ke tabel Absensi. Periksa RLS di Supabase.', 'error');
      } else {
        showMessage(`Error: ${error.message}`, 'error');
      }
      return;
    }

    const { data: allStudents } = await client.from('murid').select('*');

    renderHistoryTable(attendanceData || [], allStudents || [], year, month);
    showMessage(`History ${month}/${year} berhasil dimuat`, 'success');
    
  } catch (err) {
    console.error('Exception:', err);
    showMessage("Terjadi kesalahan", 'error');
  }
}

// Render history table
function renderHistoryTable(attendanceData, allStudents, year, month) {
  const daysInMonth = getDaysInMonth(parseInt(year), parseInt(month));
  const allDates = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${year}-${month.padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    allDates.push(date);
  }

  const studentAttendance = new Map();
  
  allStudents.forEach(student => {
    studentAttendance.set(student.id, {
      ...student,
      attendance: new Map()
    });
  });

  attendanceData.forEach(record => {
    if (studentAttendance.has(record.murid_id)) {
      studentAttendance.get(record.murid_id).attendance.set(record.tanggal, record.status);
    }
  });

  historyHeadRow.innerHTML = `
    <th class="sortable" data-sort="nama">Nama</th>
    <th class="sortable" data-sort="sabuk">Sabuk</th>
    <th class="sortable" data-sort="usia">Usia</th>
    <th class="sortable" data-sort="lama">Lama Latihan</th>
  `;
  allDates.forEach(date => {
    const th = document.createElement("th");
    th.textContent = fmt(date);
    th.className = "date-column";
    historyHeadRow.appendChild(th);
  });

  // Update sort indicators
  updateSortIndicators();
  
  historyBody.innerHTML = "";
  
  if (allStudents.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = allDates.length + 4;
    td.textContent = "Tidak ada data murid";
    td.style.textAlign = "center";
    td.style.padding = "20px";
    tr.appendChild(td);
    historyBody.appendChild(tr);
    return;
  }

  // Filter and sort data
  let filteredStudents = filterStudents(allStudents);
  filteredStudents = sortStudents(filteredStudents, currentSort.field, currentSort.direction);
  
  if (filteredStudents.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = allDates.length + 4;
    td.textContent = "Tidak ada data yang cocok dengan pencarian";
    td.style.textAlign = "center";
    td.style.padding = "20px";
    tr.appendChild(td);
    historyBody.appendChild(tr);
    return;
  }

  filteredStudents.forEach(student => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${student.nama || 'No Name'}</td>
      <td>${student.sabuk || "-"}</td>
      <td>${calcAge(student.tanggal_lahir)}</td>
      <td>${calcTenure(student.tanggal_gabung)}</td>
    `;

    allDates.forEach(date => {
      const td = document.createElement("td");
      td.className = "history-attendance-cell";
      const studentData = studentAttendance.get(student.id);
      const isPresent = studentData ? studentData.attendance.get(date) : null;
      
      if (isPresent === true) {
        td.textContent = "✓";
        td.style.color = "green";
      } else if (isPresent === false) {
        td.textContent = "✗";
        td.style.color = "red";
      } else {
        td.textContent = "-";
        td.style.color = "gray";
      }
      
      tr.appendChild(td);
    });

    historyBody.appendChild(tr);
  });
}

// Sorting functions
function handleSort(field) {
  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.field = field;
    currentSort.direction = 'asc';
  }
  
  updateSortIndicators();
  
  // Re-render current active table
  if (pengisianSection.classList.contains('hidden')) {
    // We're in history mode
    loadHistory();
  } else {
    // We're in attendance mode
    renderAttendanceTable();
  }
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
    case 'usia': return 'Usia';
    case 'lama': return 'Lama Latihan';
    default: return field;
  }
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
      case 'lama':
        valueA = parseTenure(a.tanggal_gabung);
        valueB = parseTenure(b.tanggal_gabung);
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

function parseTenure(isoDate) {
  if (!isoDate) return 0;
  const joinDate = new Date(isoDate);
  const today = new Date();
  return (today.getFullYear() - joinDate.getFullYear()) * 12 + (today.getMonth() - joinDate.getMonth());
}

function filterStudents(students) {
  if (!searchTerm) return students;
  
  return students.filter(student => 
    student.nama?.toLowerCase().includes(searchTerm) ||
    student.sabuk?.toLowerCase().includes(searchTerm)
  );
}

// Initialize
async function initApp() {
  console.log('Initializing...');
  
  const today = new Date().toISOString().split('T')[0];
  newDateInput.value = today;
  historyMonth.value = today.substring(0, 7);
  
  // Add search functionality
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Cari nama atau sabuk...';
  searchInput.style.padding = '8px';
  searchInput.style.margin = '10px 0';
  searchInput.style.width = '300px';
  searchInput.style.border = '1px solid #ddd';
  searchInput.style.borderRadius = '4px';
  
  searchInput.addEventListener('input', function(e) {
    searchTerm = e.target.value.toLowerCase();
    if (pengisianSection.classList.contains('hidden')) {
      loadHistory();
    } else {
      renderAttendanceTable();
    }
  });
  
  // Add search to both sections
  const pengisianToolbar = pengisianSection.querySelector('.toolbar');
  const historyToolbar = historySection.querySelector('.toolbar');
  
  pengisianToolbar.insertBefore(searchInput.cloneNode(true), pengisianToolbar.firstChild);
  historyToolbar.insertBefore(searchInput.cloneNode(true), historyToolbar.firstChild);
  
  // Add sort event listeners
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('sortable')) {
      handleSort(e.target.dataset.sort);
    }
  });
  
  await loadStudents();
}

// EVENT LISTENERS
btnPengisian.addEventListener('click', () => {
  pengisianSection.classList.remove("hidden");
  historySection.classList.add("hidden");
  btnPengisian.classList.add("active");
  btnHistory.classList.remove("active");
});

btnHistory.addEventListener('click', () => {
  historySection.classList.remove("hidden");
  pengisianSection.classList.add("hidden");
  btnHistory.classList.add("active");
  btnPengisian.classList.remove("active");
});

addTanggalBtn.addEventListener('click', () => {
  addDateColumn(newDateInput.value);
});

saveAttendanceBtn.addEventListener('click', saveAllAttendance);
loadHistoryBtn.addEventListener('click', loadHistory);

newDateInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addDateColumn(newDateInput.value);
  }
});

document.addEventListener('DOMContentLoaded', initApp);