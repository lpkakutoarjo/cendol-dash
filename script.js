// GANTI DENGAN URL DEPLOYMENT GOOGLE APPS SCRIPT ANDA
const scriptUrl = "https://script.google.com/macros/s/AKfycbyEA9wTXmN9AjHzjeHsNxLOTSdn1iPu2cgjcW_5RnEK_IGK-Ji_5b-Duv1gBt3FsEho/exec";

// Variabel Global
let rekapDataGlobal = [];
let logDataGlobal = [];
let anakDataGlobal = [];
let trxChartInstance = null;

// Tampilkan Tanggal Saat Ini
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('date-display').innerText = new Date().toLocaleDateString('id-ID', options);

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebar-overlay').classList.toggle('active');
}
// Navigasi Menu
function switchMenu(menuId, element) {
    document.querySelectorAll('.menu-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    
    document.getElementById('menu-' + menuId).classList.add('active');
    if (element) element.classList.add('active');
    
    const titles = { 'dashboard': 'Dashboard Utama', 'manajemen': 'Manajemen Anak', 'log': 'Log Aktivitas' };
    document.getElementById('page-title').innerText = titles[menuId];

    // Otomatis tutup sidebar di Mobile setelah mengklik menu
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('active');
        document.getElementById('sidebar-overlay').classList.remove('active');
    }
}
// Format Rupiah (Hasil Akhir)
const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

// -------- FITUR AUTO-FORMAT TITIK PADA FORM NOMINAL --------
const inputNominal = document.getElementById('trx-nominal');
inputNominal.addEventListener('input', function(e) {
    // Hanya sisakan angka
    let rawValue = this.value.replace(/[^0-9]/g, '');
    if (rawValue) {
        // Berikan titik setiap 3 digit
        this.value = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    } else {
        this.value = '';
    }
});
// -----------------------------------------------------------

// Ambil Data Utama
// Ambil Data Utama
async function fetchData() {
    const statusEl = document.getElementById('status-koneksi');
    
    // Ubah status menjadi proses memuat saat fungsi dipanggil
    statusEl.className = 'status';
    statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menghubungkan...';

    try {
        const response = await fetch(`${scriptUrl}?action=getDashboard`);
        const data = await response.json();
        
        if (data.status === 'success') {
            rekapDataGlobal = data.rekapSaldo;
            logDataGlobal = data.logAktivitas;
            anakDataGlobal = data.dataAnak;
            
            updateWidgets(data);
            populateDatalist();
            renderAnakTable();
            renderRekapTable();
            renderLogTable();
            renderChart(data.chartData);

            // Ubah status menjadi hijau setelah seluruh data berhasil dirender
            statusEl.className = 'status connected';
            statusEl.innerHTML = '<i class="fa-solid fa-wifi"></i> Terhubung';
        }
    } catch (error) {
        // Ubah status menjadi merah jika koneksi internet terputus atau URL salah
        statusEl.className = 'status disconnected';
        statusEl.innerHTML = '<i class="fa-solid fa-wifi-slash"></i> Terputus';
        Swal.fire({ icon: 'error', title: 'Koneksi Terputus', text: 'Gagal mengambil data dari server database.'});
    }
}

// Render Widget & Ringkasan
function updateWidgets(data) {
    document.getElementById('total-saldo-all').innerText = formatRp(data.totalSaldoKeseluruhan);
    document.getElementById('total-trx-in').innerText = formatRp(data.totalMasukHariIni);
    document.getElementById('total-trx-out').innerText = formatRp(data.totalKeluarHariIni);
    document.getElementById('total-anak').innerText = anakDataGlobal.length + " Orang";
}

// Datalist Saja (Tabel Anak dipisah agar bisa difilter)
function populateDatalist() {
    const listAnak = document.getElementById('list-anak');
    listAnak.innerHTML = '';
    anakDataGlobal.forEach(anak => { listAnak.innerHTML += `<option value="${anak.nama}">`; });
}

// -------- FITUR PENCARIAN & RENDER TABEL MANAJEMEN ANAK --------
function renderAnakTable() {
    const tbodyAnak = document.getElementById('tbody-anak');
    const searchTerm = document.getElementById('anak-search').value.toLowerCase();
    const limitVal = document.getElementById('anak-limit').value;
    
    // Filter data berdasarkan ketikan
    let filtered = anakDataGlobal.filter(anak => anak.nama.toLowerCase().includes(searchTerm));

    // Limit data yang ditampilkan
    if (limitVal !== 'all') {
        filtered = filtered.slice(0, parseInt(limitVal));
    }

    tbodyAnak.innerHTML = '';
    if (filtered.length === 0) {
        tbodyAnak.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Data tidak ditemukan</td></tr>`;
        return;
    }

    filtered.forEach((anak, index) => {
        tbodyAnak.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td><strong>${anak.nama}</strong></td>
                <td class="text-center">
                    <button class="btn-del" onclick="hapusAnak('${anak.nama}')"><i class="fa-solid fa-trash-can"></i> Hapus</button>
                </td>
            </tr>
        `;
    });
}
// ---------------------------------------------------------------

// Render Tabel Rekap
function renderRekapTable() {
    const tbody = document.getElementById('tbody-rekap');
    const searchTerm = document.getElementById('rekap-search').value.toLowerCase();
    const limitVal = document.getElementById('rekap-limit').value;
    
    let filtered = rekapDataGlobal.filter(item => item.nama.toLowerCase().includes(searchTerm));
    if (limitVal !== 'all') filtered = filtered.slice(0, parseInt(limitVal));

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Tidak ada data ditemukan</td></tr>`;
        return;
    }

    filtered.forEach(rekap => {
        let historyHtml = rekap.history.map(h => {
            let cls = h.jenis === 'Masuk' ? 'badge-in' : 'badge-out';
            let icon = h.jenis === 'Masuk' ? '<i class="fa-solid fa-arrow-down"></i>' : '<i class="fa-solid fa-arrow-up"></i>';
            return `<span class="history-badge ${cls}">${icon} ${formatRp(h.nominal)}</span>`;
        }).join('');

        tbody.innerHTML += `
            <tr>
                <td><strong>${rekap.nama}</strong></td>
                <td class="saldo-text">${formatRp(rekap.saldo)}</td>
                <td>${historyHtml || '<span class="text-muted">Belum ada transaksi</span>'}</td>
            </tr>
        `;
    });
}

// Render Tabel Log Aktivitas (Dengan Filter Nama & Limit Baris)
function renderLogTable() {
    const tbody = document.getElementById('tbody-log');
    const searchTerm = document.getElementById('log-search').value.toLowerCase();
    const limitVal = document.getElementById('log-limit').value;
    
    // 1. Filter data berdasarkan pencarian
    let filtered = logDataGlobal.filter(log => 
        log.nama.toLowerCase().includes(searchTerm) || 
        log.jenis.toLowerCase().includes(searchTerm) ||
        log.keterangan.toLowerCase().includes(searchTerm)
    );

    // 2. Terapkan Limit Baris (Default: 10)
    if (limitVal !== 'all') {
        filtered = filtered.slice(0, parseInt(limitVal));
    }

    tbody.innerHTML = '';
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">Tidak ada histori aktivitas ditemukan</td></tr>`;
        return;
    }

    // 3. Render ke Tabel
    filtered.forEach(log => {
        let badgeCls = log.jenis === 'Masuk' ? 'badge-in' : 'badge-out';
        tbody.innerHTML += `
            <tr>
                <td class="text-muted"><i class="fa-regular fa-calendar"></i> ${log.waktu}</td>
                <td><strong>${log.nama}</strong></td>
                <td><span class="history-badge ${badgeCls}">${log.jenis}</span></td>
                <td><strong>${formatRp(log.nominal)}</strong></td>
                <td class="text-muted">${log.keterangan}</td>
            </tr>
        `;
    });
}

// -------- GRAFIK INFORMATIF DENGAN ANGKA DI ATAS BATANG --------
// Plugin kustom untuk menggambar teks (nominal) tepat di atas chart
const inlineLabelsPlugin = {
    id: 'inlineLabels',
    afterDatasetsDraw(chart, args, options) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            chart.getDatasetMeta(i).data.forEach((datapoint, index) => {
                let value = dataset.data[index];
                if(value > 0) { // Hanya gambar teks jika nilainya lebih dari 0
                    ctx.font = 'bold 11px Poppins';
                    ctx.fillStyle = i === 0 ? '#059669' : '#dc2626'; // Warna hijau tua / merah tua
                    ctx.textAlign = 'center';
                    
                    // Sederhanakan angka misal 50.000 jadi 50k
                    let textVal = value >= 1000 ? (value/1000) + 'k' : value;
                    ctx.fillText(textVal, datapoint.x, datapoint.y - 6);
                }
            });
        });
    }
};

function renderChart(chartData) {
    const ctx = document.getElementById('trxChart').getContext('2d');
    if (trxChartInstance) trxChartInstance.destroy();

    trxChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels,
            datasets: [
                { label: 'Masuk', data: chartData.masuk, backgroundColor: '#10b981', borderRadius: 4, barPercentage: 0.7 },
                { label: 'Keluar', data: chartData.keluar, backgroundColor: '#ef4444', borderRadius: 4, barPercentage: 0.7 }
            ]
        },
        plugins: [inlineLabelsPlugin], 
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20 } }, 
            scales: { 
                x: { 
                    grid: { display: false },
                    reverse: true // PERINTAH UNTUK MEMULAI GRAFIK DARI KANAN KE KIRI
                },
                y: { 
                    beginAtZero: true,
                    border: { display: false },
                    grid: { color: '#e2e8f0', drawBorder: false, borderDash: [5, 5] }, 
                    ticks: { display: false } 
                } 
            },
            plugins: { 
                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8 } },
                tooltip: {
                    backgroundColor: '#1e293b', padding: 12,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) label += formatRp(context.parsed.y);
                            return label;
                        }
                    }
                }
            }
        }
    });
}
// ---------------------------------------------------------------

// Fungsi Bantuan POST
async function postDataWithAlert(payload, successMsg) {
    Swal.fire({
        title: 'Memproses Data...', text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        const response = await fetch(scriptUrl, { method: 'POST', body: JSON.stringify(payload) });
        const result = await response.json();
        
        if (result.status === 'success') {
            Swal.fire({ icon: 'success', title: 'Berhasil!', text: successMsg, timer: 2000, showConfirmButton: false });
            fetchData(); 
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal', text: result.message });
        }
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error Server', text: 'Gagal terhubung ke database.' });
    }
}

// Eksekusi Form
async function submitTransaksi(e) {
    e.preventDefault();
    
    // Hilangkan kembali titik sebelum dikirim ke database
    const rawNominal = document.getElementById('trx-nominal').value.replace(/\./g, '');

    const payload = {
        action: 'tambahTransaksi',
        nama: document.getElementById('trx-nama').value,
        jenis: document.querySelector('input[name="trx-jenis"]:checked').value,
        nominal: rawNominal // Kirim nominal mentah
    };
    await postDataWithAlert(payload, 'Transaksi berhasil dicatat.');
    
    document.getElementById('form-transaksi').reset();
    document.querySelector('.radio-card input').checked = false; // Reset radio UI
}

async function submitAnak(e) {
    e.preventDefault();
    const payload = { action: 'tambahAnak', nama: document.getElementById('anak-nama').value };
    await postDataWithAlert(payload, 'Data anak berhasil ditambahkan.');
    document.getElementById('form-anak').reset();
}
async function hapusAnak(nama) {
    Swal.fire({
        title: 'Hapus Data & Riwayat?',
        text: `Menghapus "${nama}" juga akan menghapus seluruh catatan transaksi di tab Transaksi secara permanen!`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus Semua!',
        cancelButtonText: 'Batal'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await postDataWithAlert({ action: 'hapusAnak', nama: nama }, 'Data dan riwayat berhasil dibersihkan.');
        }
    });
}

// Inisialisasi awal saat halaman dimuat
document.addEventListener("DOMContentLoaded", fetchData);