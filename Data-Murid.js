// ==== KONEKSI SUPABASE ====
const SUPABASE_URL = "https://bizryujdcymmjjzhurhi.supabase.co"; // ganti dengan Project URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpenJ5dWpkY3ltbWpqemh1cmhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTUzMzAsImV4cCI6MjA3NDg3MTMzMH0.XuKnQ3MStAj6yp2rkxEmISnaJEUUYicBOBucU-rgLqc"; // ganti dengan anon key kamu

// gunakan nama variabel berbeda (bukan supabase)
const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==== ELEMENT DOM ====
const addMuridBtn = document.getElementById("addMuridBtn");
const muridFormContainer = document.getElementById("muridFormContainer");
const muridForm = document.getElementById("muridForm");
const cancelBtn = document.getElementById("cancelBtn");
const tabelBody = document.querySelector("#tabelMurid tbody");
const editIndexInput = document.getElementById("editIndex");

let dataMurid = [];

// ====== SORTING STATE ======
let currentSort = { field: 'nama', direction: 'asc' };
let searchTerm = '';

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

// ==== FUNGSI ====
async function ambilData() {
  try {
    let { data, error } = await client.from("murid").select("*").order("id");
    if (error) {
      console.error("Gagal ambil data:", error);
      showMessage('Error memuat data murid', 'error');
      return;
    }
    dataMurid = data || [];
    tampilkanData();
    showMessage(`Berhasil memuat ${dataMurid.length} data murid`, 'success');
  } catch (error) {
    console.error("Exception:", error);
    showMessage('Terjadi kesalahan saat memuat data', 'error');
  }
}

function tampilkanData() {
  tabelBody.innerHTML = "";
  
  // Filter data berdasarkan pencarian
  let filteredData = filterMurid(dataMurid);
  
  // Sort data
  filteredData = sortMurid(filteredData, currentSort.field, currentSort.direction);
  
  if (filteredData.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="9" style="text-align: center; padding: 20px;">
        ${searchTerm ? 'Tidak ada data yang cocok dengan pencarian' : 'Tidak ada data murid'}
      </td>
    `;
    tabelBody.appendChild(row);
    return;
  }
  
  filteredData.forEach((murid, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${murid.nama}</td>
      <td>${murid.jenis_kelamin}</td>
      <td>${murid.tempat_lahir || '-'}, ${formatDate(murid.tanggal_lahir)}</td>
      <td>${murid.no_telepon || '-'}</td>
      <td>${murid.alamat}</td>
      <td>${formatDate(murid.tanggal_gabung)}</td>
      <td>${murid.sabuk}</td>
      <td>
        <button class="action-btn edit-btn" onclick="editData(${murid.id})">Edit</button>
        <button class="action-btn delete-btn" onclick="hapusData(${murid.id})">Delete</button>
      </td>
    `;
    tabelBody.appendChild(row);
  });
}

function filterMurid(muridList) {
  if (!searchTerm) return muridList;
  
  return muridList.filter(murid => 
    murid.nama?.toLowerCase().includes(searchTerm) ||
    murid.sabuk?.toLowerCase().includes(searchTerm)
  );
}

function sortMurid(muridList, field, direction) {
  return [...muridList].sort((a, b) => {
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

function handleSort(field) {
  if (currentSort.field === field) {
    currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.field = field;
    currentSort.direction = 'asc';
  }
  
  updateSortIndicators();
  tampilkanData();
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

function resetForm() {
  muridForm.reset();
  editIndexInput.value = "";
  muridFormContainer.style.display = "none";
  addMuridBtn.style.display = "inline-block";
}

// ==== EVENT ====
addMuridBtn.addEventListener("click", () => {
  muridForm.reset();
  editIndexInput.value = "";
  muridFormContainer.style.display = "block";
  addMuridBtn.style.display = "none";
});

cancelBtn.addEventListener("click", resetForm);

muridForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const murid = {
    nama: document.getElementById("nama").value,
    jenis_kelamin: document.getElementById("jenisKelamin").value,
    tempat_lahir: document.getElementById('tempatLahir').value,
    tanggal_lahir: document.getElementById("tanggalLahir").value,
    no_telepon: document.getElementById("noTelepon").value,
    alamat: document.getElementById("alamat").value,
    tanggal_gabung: document.getElementById("tanggalGabung").value,
    sabuk: document.getElementById("sabuk").value,
  };

  const editId = editIndexInput.value;

  try {
    if (editId === "") {
      // INSERT
      const { error } = await client.from("murid").insert([murid]);
      if (error) throw error;
      showMessage('Data murid berhasil ditambahkan', 'success');
    } else {
      // UPDATE
      const { error } = await client.from("murid").update(murid).eq("id", editId);
      if (error) throw error;
      showMessage('Data murid berhasil diperbarui', 'success');
    }

    await ambilData();
    resetForm();
  } catch (error) {
    console.error("Database error:", error);
    showMessage('Error menyimpan data murid', 'error');
  }
});

// ==== EDIT ====
function editData(id) {
  const murid = dataMurid.find(m => m.id === id);
  if (!murid) {
    showMessage('Data murid tidak ditemukan', 'error');
    return;
  }
  
  document.getElementById("nama").value = murid.nama;
  document.getElementById("jenisKelamin").value = murid.jenis_kelamin;
  document.getElementById("tempatLahir").value = murid.tempat_lahir || '';
  document.getElementById("tanggalLahir").value = murid.tanggal_lahir;
  document.getElementById("noTelepon").value = murid.no_telepon || '';
  document.getElementById("alamat").value = murid.alamat;
  document.getElementById("tanggalGabung").value = murid.tanggal_gabung;
  document.getElementById("sabuk").value = murid.sabuk;
  editIndexInput.value = murid.id;

  muridFormContainer.style.display = "block";
  addMuridBtn.style.display = "none";
}

// ==== DELETE ====
async function hapusData(id) {
  if (confirm("Yakin ingin menghapus data ini?")) {
    try {
      const { error } = await client.from("murid").delete().eq("id", id);
      if (error) throw error;
      showMessage('Data murid berhasil dihapus', 'success');
      await ambilData();
    } catch (error) {
      console.error("Delete error:", error);
      showMessage('Error menghapus data murid', 'error');
    }
  }
}

// ==== INITIALIZATION ====
function initializeApp() {
  // Update table headers to be sortable
  const tableHeaders = document.querySelectorAll('#tabelMurid thead th');
  tableHeaders.forEach((header, index) => {
    if (index === 1) { // Nama column
      header.innerHTML = '<span class="sortable" data-sort="nama">Nama</span>';
      header.classList.add('sortable-header');
    } else if (index === 7) { // Sabuk column
      header.innerHTML = '<span class="sortable" data-sort="sabuk">Sabuk</span>';
      header.classList.add('sortable-header');
    }
  });

  // Add search functionality
  const searchContainer = document.createElement('div');
  searchContainer.style.marginBottom = '20px';
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
    tampilkanData();
  });
  
  clearSearchBtn.addEventListener('click', function() {
    searchInput.value = '';
    searchTerm = '';
    tampilkanData();
  });
  
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(clearSearchBtn);
  
  // Insert search before the table
  const tableContainer = document.querySelector('.table-container');
  tableContainer.parentNode.insertBefore(searchContainer, tableContainer);
  
  // Add sort event listeners
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('sortable')) {
      handleSort(e.target.dataset.sort);
    }
  });
  
  // Initialize sort indicators
  updateSortIndicators();
}

// ==== LOAD DATA SAAT HALAMAN DIBUKA ====
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  ambilData();
});