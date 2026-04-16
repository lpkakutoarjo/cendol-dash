// GANTI DENGAN URL DEPLOYMENT GOOGLE APPS SCRIPT ANDA
const scriptUrl = "https://script.google.com/macros/s/AKfycbw3h3zpkZQ0DSKePUSSIlnXssIxrTqAxyPPp3iFggcWxypxap32ykYnAnPRoHw0N3FW/exec";

// Variabel Global
let rekapDataGlobal = [];
let logDataGlobal = [];
let anakDataGlobal = [];
let trxChartInstance = null;

// Tampilkan Tanggal Saat Ini
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('date-display').innerText = new Date().toLocaleDateString('id-ID', options);

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// Navigasi Menu Dashboard
function switchMenu(menuId, element) {
    const targetSection = document.getElementById('menu-' + menuId);

    if (!targetSection) {
        console.error("Section menu-" + menuId + " tidak ditemukan!");
        return;
    }

    // 1. Sembunyikan semua section
    document.querySelectorAll('.menu-section').forEach(el => {
        el.classList.remove('active');
    });

    // 2. Hapus status aktif di semua link sidebar
    document.querySelectorAll('.nav-links li').forEach(el => {
        el.classList.remove('active');
    });

    // 3. Tampilkan section yang dituju
    targetSection.classList.add('active');

    // 4. Tandai menu sidebar sebagai aktif
    if (element) {
        element.classList.add('active');
    }

    // 5. Update Judul Halaman
    const titles = {
        'dashboard': 'Dashboard Utama',
        'manajemen': 'Manajemen Anak',
        'log': 'Log Aktivitas'
    };
    document.getElementById('page-title').innerText = titles[menuId] || 'Dashboard';

    // 6. Tutup sidebar jika di mobile
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
}

// Format Rupiah (Hasil Akhir)
const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);

// -------- FITUR AUTO-FORMAT TITIK PADA FORM NOMINAL --------
const inputNominal = document.getElementById('trx-nominal');
if (inputNominal) {
    inputNominal.addEventListener('input', function (e) {
        // Hanya sisakan angka
        let rawValue = this.value.replace(/[^0-9]/g, '');
        if (rawValue) {
            // Berikan titik setiap 3 digit
            this.value = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        } else {
            this.value = '';
        }
    });
}
// -----------------------------------------------------------

// -------- FITUR AUTO-UPPERCASE NAMA ANAK BINAAN --------
const inputAnakNama = document.getElementById('anak-nama');
if (inputAnakNama) {
    inputAnakNama.addEventListener('input', function () {
        // Mengubah huruf menjadi kapital seketika saat diketik
        this.value = this.value.toUpperCase();
    });
}
// -----------------------------------------------------------

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
        Swal.fire({ icon: 'error', title: 'Koneksi Terputus', text: 'Gagal mengambil data dari server database.' });
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
        // Cari seluruh riwayat anak ini di logDataGlobal
        let childLogs = logDataGlobal.filter(log => log.nama === rekap.nama);

        let historyHtml = rekap.history.map(h => {
            let cls = h.jenis === 'Masuk' ? 'badge-in' : 'badge-out';
            let icon = h.jenis === 'Masuk' ? '<i class="fa-solid fa-arrow-down"></i>' : '<i class="fa-solid fa-arrow-up"></i>';

            // --- LOGIKA BARU UNTUK KETERANGAN ---
            let teksKeterangan = '';
            if (h.jenis === 'Masuk') {
                teksKeterangan = ' (Uang Masuk)'; // Paksa teks untuk uang masuk
            } else if (h.jenis === 'Keluar' && h.keterangan && h.keterangan !== '-') {
                teksKeterangan = ` (${h.keterangan})`; // Ambil dari database jika uang keluar
            }

            return `<span class="history-badge ${cls}">${icon} ${formatRp(h.nominal)}${teksKeterangan}</span>`;
        }).join('');

        // Tampilkan tombol "Lihat Semua" hanya jika transaksi lebih dari 3
        let btnMore = '';
        if (childLogs.length > 3) {
            btnMore = `<button class="btn-more-sm" onclick="showDetailHistory('${rekap.nama}')"><i class="fa-solid fa-list"></i> Lihat Semua (${childLogs.length})</button>`;
        }

        tbody.innerHTML += `
            <tr>
                <td><strong>${rekap.nama}</strong></td>
                <td class="saldo-text">${formatRp(rekap.saldo)}</td>
                <td>
                    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 5px;">
                        <div>${historyHtml || '<span class="text-muted">Belum ada transaksi</span>'}</div>
                        ${btnMore}
                    </div>
                </td>
            </tr>
        `;
    });
}

// Memunculkan Pop-up Seluruh Riwayat per Anak Binaan
function showDetailHistory(nama) {
    let childLogs = logDataGlobal.filter(log => log.nama === nama);

    let tableRows = childLogs.map((log, index) => {
        let badgeCls = log.jenis === 'Masuk' ? 'badge-in' : 'badge-out';
        let sign = log.jenis === 'Masuk' ? '+' : '-';
        let color = log.jenis === 'Masuk' ? '#166534' : '#991b1b';

        // --- LOGIKA BARU UNTUK KOLOM KETERANGAN DI POP-UP ---
        let ketTeks = '';
        if (log.jenis === 'Masuk') {
            ketTeks = 'Uang Masuk'; // Paksa teks untuk uang masuk
        } else {
            ketTeks = (log.keterangan && log.keterangan !== '-') ? log.keterangan : '';
        }

        return `
            <tr>
                <td style="text-align:center; padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem;">${index + 1}</td>
                <td style="text-align:left; padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; color: #64748b;">${log.waktu}</td>
                <td style="text-align:center; padding: 10px; border-bottom: 1px solid #f1f5f9;"><span class="history-badge ${badgeCls}">${log.jenis}</span></td>
                <td style="text-align:left; padding: 10px; border-bottom: 1px solid #f1f5f9; font-size: 0.85rem; color: #64748b; font-weight: 500;">${ketTeks}</td>
                <td style="text-align:right; padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: ${color};">${sign} ${formatRp(log.nominal)}</td>
            </tr>
        `;
    }).join('');

    let htmlContent = `
        <div style="max-height: 350px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 8px;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="position: sticky; top: 0; background: #f8fafc; z-index: 1;">
                    <tr>
                        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 0.8rem; color: #475569;">No</th>
                        <th style="text-align:left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 0.8rem; color: #475569;">Waktu</th>
                        <th style="padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 0.8rem; color: #475569;">Jenis</th>
                        <th style="text-align:left; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 0.8rem; color: #475569;">Keterangan</th>
                        <th style="text-align:right; padding: 10px; border-bottom: 2px solid #cbd5e1; font-size: 0.8rem; color: #475569;">Nominal</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;

    Swal.fire({
        title: `Riwayat Transaksi`,
        html: `<p style="font-size: 0.9rem; margin-bottom: 15px; font-weight: 600;">Data Anak Binaan: <span style="color:#3b82f6;">${nama}</span></p> ${htmlContent}`,
        width: '750px', // Diperlebar agar tabel tidak terlalu sesak
        showCloseButton: true,
        confirmButtonText: 'Tutup',
        confirmButtonColor: '#3b82f6',
        padding: '20px'
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

        // --- LOGIKA BARU UNTUK LOG AKTIVITAS ---
        let tampilKeterangan = '';
        if (log.jenis === 'Masuk') {
            tampilKeterangan = 'Uang Masuk';
        } else {
            tampilKeterangan = (log.keterangan && log.keterangan !== '-') ? log.keterangan : '';
        }

        tbody.innerHTML += `
        <tr>
            <td class="text-muted"><i class="fa-regular fa-calendar"></i> ${log.waktu}</td>
            <td><strong>${log.nama}</strong></td>
            <td><span class="history-badge ${badgeCls}">${log.jenis}</span></td>
            <td><strong>${formatRp(log.nominal)}</strong></td>
            <td class="text-muted">${tampilKeterangan}</td>
        </tr>
    `;
    });
}

// -------- GRAFIK INFORMATIF DENGAN ANGKA DI ATAS BATANG --------
const inlineLabelsPlugin = {
    id: 'inlineLabels',
    afterDatasetsDraw(chart, args, options) {
        const { ctx } = chart;
        chart.data.datasets.forEach((dataset, i) => {
            chart.getDatasetMeta(i).data.forEach((datapoint, index) => {
                let value = dataset.data[index];
                if (value > 0) { 
                    ctx.font = 'bold 11px Poppins';
                    ctx.fillStyle = i === 0 ? '#059669' : '#dc2626'; 
                    ctx.textAlign = 'center';

                    let textVal = value >= 1000 ? (value / 1000) + 'k' : value;
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
                    reverse: true 
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
                        label: function (context) {
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

// -------- LOGIKA TAMPILKAN KETERANGAN JIKA UANG KELUAR --------
const radioJenisTrx = document.querySelectorAll('input[name="trx-jenis"]');
const containerKeterangan = document.getElementById('keterangan-container');
const inputKeterangan = document.getElementById('trx-keterangan');
const containerKeteranganManual = document.getElementById('keterangan-manual-container');
const inputKeteranganManual = document.getElementById('trx-keterangan-manual');

// Listener untuk dropdown keterangan
if (inputKeterangan) {
    inputKeterangan.addEventListener('change', function() {
        if (this.value === 'Lainnya') {
            containerKeteranganManual.style.display = 'flex';
            inputKeteranganManual.setAttribute('required', 'true');
        } else {
            containerKeteranganManual.style.display = 'none';
            inputKeteranganManual.removeAttribute('required');
            inputKeteranganManual.value = '';
        }
    });
}

// Listener untuk radio button Masuk/Keluar
if (radioJenisTrx) {
    radioJenisTrx.forEach(radio => {
        radio.addEventListener('change', function () {
            if (this.value === 'Keluar') {
                containerKeterangan.style.display = 'flex';
                inputKeterangan.setAttribute('required', 'true');
            } else {
                containerKeterangan.style.display = 'none';
                containerKeteranganManual.style.display = 'none'; // Sembunyikan manual jika pindah ke Masuk
                inputKeterangan.removeAttribute('required');
                inputKeteranganManual.removeAttribute('required');
                inputKeterangan.value = '';
                inputKeteranganManual.value = '';
            }
        });
    });
}

// Submit Form Transaksi
async function submitTransaksi(e) {
    e.preventDefault();
    
    const rawNominal = document.getElementById('trx-nominal').value.replace(/\./g, '');
    const jenisTrx = document.querySelector('input[name="trx-jenis"]:checked').value;
    
    const inputKet = document.getElementById('trx-keterangan');
    const inputKetManual = document.getElementById('trx-keterangan-manual');
    
    // Tentukan keterangan yang akan dikirim
    let keteranganFinal = "-";
    if (jenisTrx === 'Keluar') {
        if (inputKet.value === 'Lainnya') {
            keteranganFinal = inputKetManual.value; // Ambil dari input manual
        } else {
            keteranganFinal = inputKet.value; // Ambil dari dropdown
        }
    }

    const payload = {
        action: 'tambahTransaksi',
        nama: document.getElementById('trx-nama').value,
        jenis: jenisTrx,
        nominal: rawNominal,
        keterangan: keteranganFinal 
    };

    await postDataWithAlert(payload, 'Transaksi berhasil dicatat.');
    
    // Reset Form & UI tambahan
    document.getElementById('form-transaksi').reset();
    document.querySelectorAll('.radio-card input').forEach(radio => radio.checked = false); 
    containerKeterangan.style.display = 'none';
    containerKeteranganManual.style.display = 'none';
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
