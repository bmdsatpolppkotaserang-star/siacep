// =========================================================================
// FRONTEND SCRIPT PWA SI-ASEP - INTEGRATED WITH BACKEND GS
// Satuan Polisi Pamong Praja Kota Serang
// =========================================================================

// CONFIGURATION: Ganti URL di bawah ini dengan URL Deployment Web App Google Apps Script Anda!
const GS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwlEZavprex-PUPL4MR57q6k8q3se4qLL33zxRMuOvN89viFT-iagj9vqD2sdkyl-hF/exec";
const PIN_SAH = "123456";

let html5QrcodeScanner = null;
let currentBarangData = null;

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

function initApp() {
    registerServiceWorker();
    setupEventListeners();
    initScanner();
}

// -------------------------------------------------------------------------
// 1. SERVICE WORKER REGISTRATION
// -------------------------------------------------------------------------
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SI-ASEP SW Registered:', reg.scope))
            .catch(err => console.error('SI-ASEP SW Register Failed:', err));
    }
}

// -------------------------------------------------------------------------
// 2. EVENT LISTENERS SETUP
// -------------------------------------------------------------------------
function setupEventListeners() {
    // Search Manual
    const btnCari = document.getElementById('btnCari');
    const inputKode = document.getElementById('inputKode');
    
    if (btnCari) {
        btnCari.addEventListener('click', () => {
            const val = inputKode.value.trim();
            if (val) cariDetailBarang(val);
            else alert("Silakan masukkan Kode Barang/Register!");
        });
    }

    if (inputKode) {
        inputKode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = inputKode.value.trim();
                if (val) cariDetailBarang(val);
            }
        });
    }

    // Action Buttons
    const btnSimpan = document.getElementById('btnSimpan');
    const btnHapus = document.getElementById('btnHapus');
    const btnCetakStiker = document.getElementById('btnCetakStiker');
    const btnCetakKIR = document.getElementById('btnCetakKIR');
    const btnExportExcel = document.getElementById('btnExportExcel');

    if (btnSimpan) btnSimpan.addEventListener('click', handleUpdateInventaris);
    if (btnHapus) btnHapus.addEventListener('click', handleHapusInventaris);
    if (btnCetakStiker) btnCetakStiker.addEventListener('click', handleCetakStiker);
    if (btnCetakKIR) btnCetakKIR.addEventListener('click', handleCetakKIR);
    if (btnExportExcel) btnExportExcel.addEventListener('click', handleExportExcel);
}

// -------------------------------------------------------------------------
// 3. QR CODE SCANNER (html5-qrcode)
// -------------------------------------------------------------------------
function initScanner() {
    if (!document.getElementById("reader")) return;

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText) {
    if (decodedText) {
        document.getElementById('inputKode').value = decodedText;
        cariDetailBarang(decodedText);
    }
}

function onScanFailure(error) {
    // Abaikan error konstan dari proses pengemindaian kamera
}


function initApp() {
    registerServiceWorker();
    setupEventListeners();
    initScanner();
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SI-ASEP SW Registered:', reg.scope))
            .catch(err => console.error('SI-ASEP SW Register Failed:', err));
    }
}

function setupEventListeners() {
    const btnCari = document.getElementById('btnCari');
    const inputKode = document.getElementById('inputKode');
    
    if (btnCari) {
        btnCari.addEventListener('click', () => {
            const val = inputKode.value.trim();
            if (val) cariDetailBarang(val);
            else alert("Silakan masukkan Kode Barang/Register!");
        });
    }

    if (inputKode) {
        inputKode.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const val = inputKode.value.trim();
                if (val) cariDetailBarang(val);
            }
        });
    }

    const btnSimpan = document.getElementById('btnSimpan');
    const btnHapus = document.getElementById('btnHapus');
    const btnCetakStiker = document.getElementById('btnCetakStiker');
    const btnCetakKIR = document.getElementById('btnCetakKIR');
    const btnExportExcel = document.getElementById('btnExportExcel');

    if (btnSimpan) btnSimpan.addEventListener('click', handleUpdateInventaris);
    if (btnHapus) btnHapus.addEventListener('click', handleHapusInventaris);
    if (btnCetakStiker) btnCetakStiker.addEventListener('click', handleCetakStiker);
    if (btnCetakKIR) btnCetakKIR.addEventListener('click', handleCetakKIR);
    if (btnExportExcel) btnExportExcel.addEventListener('click', handleExportExcel);
}

function initScanner() {
    if (!document.getElementById("reader")) return;

    html5QrcodeScanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
    );

    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
}

function onScanSuccess(decodedText) {
    if (decodedText) {
        document.getElementById('inputKode').value = decodedText;
        cariDetailBarang(decodedText);
    }
}

function onScanFailure(error) {
    // Abaikan error konstan scanner kamera
}

// -------------------------------------------------------------------------
// PEMBANTU UTAMA: HELPER KONEKSI API BACKEND (BEBAS CORS)
// -------------------------------------------------------------------------
async function callBackend(params) {
    const urlParams = new URLSearchParams(params).toString();
    const fullUrl = `${GS_WEB_APP_URL}?${urlParams}`;

    // Menggunakan fetch standar dengan penanganan redirect otomatis dari Google
    const response = await fetch(fullUrl, {
        method: 'GET',
        redirect: 'follow', // Penting untuk mengikuti URL redirect Google Apps Script
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
    }

    return await response.json();
}

// -------------------------------------------------------------------------
// FUNGSI AKSI UTAMA
// -------------------------------------------------------------------------
async function cariDetailBarang(kode) {
    showLoading(true);
    try {
        const data = await callBackend({
            action: 'get_detail',
            kode: kode
        });

        showLoading(false);

        if (data.result === "found") {
            currentBarangData = data;
            tampilkanDetailBarang(data);
        } else {
            currentBarangData = null;
            alert(data.message || "Barang tidak ditemukan di database.");
            resetView();
        }
    } catch (err) {
        showLoading(false);
        console.error("Error Detail:", err);
        alert("Gagal terhubung ke backend server. Pastikan URL Deployment Apps Script sudah benar dan hak akses 'Anyone'.");
    }
}

async function handleUpdateInventaris() {
    if (!currentBarangData) return alert("Pilih atau scan barang terlebih dahulu.");

    const pin = prompt("Masukkan PIN Petugas:");
    if (pin !== PIN_SAH) return alert("PIN Petugas Salah!");

    showLoading(true);
    try {
        const data = await callBackend({
            action: 'update_inventaris',
            kode: currentBarangData.kode
        });

        showLoading(false);

        if (data.result === "success") {
            alert("Berhasil! Status inventarisasi digital tersimpan.");
            cariDetailBarang(currentBarangData.kode);
        } else {
            alert(data.message || "Gagal memperbarui status inventaris.");
        }
    } catch (err) {
        showLoading(false);
        alert("Terjadi kesalahan saat menyimpan data.");
    }
}

async function handleHapusInventaris() {
    if (!currentBarangData) return alert("Pilih atau scan barang terlebih dahulu.");

    const pin = prompt("Masukkan PIN Petugas:");
    if (pin !== PIN_SAH) return alert("PIN Petugas Salah!");

    showLoading(true);
    try {
        const data = await callBackend({
            action: 'hapus_inventaris',
            kode: currentBarangData.kode
        });

        showLoading(false);

        if (data.result === "success") {
            alert("Status inventarisasi berhasil dihapus!");
            cariDetailBarang(currentBarangData.kode);
        } else {
            alert(data.message || "Gagal menghapus status.");
        }
    } catch (err) {
        showLoading(false);
        alert("Terjadi kesalahan saat menghapus data.");
    }
}

function handleCetakStiker() {
    let kodeInput = currentBarangData ? currentBarangData.kode : document.getElementById('inputKode').value.trim();

    if (!kodeInput) {
        const masukan = prompt("Masukkan Kode Barang:");
        if (masukan) kodeInput = masukan.trim();
        else return;
    }

    const printUrl = `${GS_WEB_APP_URL}?action=cetak_stiker_massal&kodes=${encodeURIComponent(kodeInput)}`;
    window.open(printUrl, '_blank');
}

function handleCetakKIR() {
    const ruangan = prompt("Masukkan Nama Ruangan / Lokasi (Kosongkan untuk Semua):", "");
    if (ruangan === null) return;

    const printUrl = `${GS_WEB_APP_URL}?action=cetak_kir&ruangan=${encodeURIComponent(ruangan)}`;
    window.open(printUrl, '_blank');
}

async function handleExportExcel() {
    const ruangan = prompt("Masukkan Nama Ruangan untuk Ekspor Excel KIR:", "");
    if (ruangan === null) return;

    showLoading(true);
    try {
        const data = await callBackend({
            action: 'export_kir',
            ruangan: ruangan
        });

        showLoading(false);

        if (data.result === "success" && data.url) {
            alert("File Excel berhasil dibuat! Pengunduhan dimulai.");
            window.open(data.url, '_blank');
        } else {
            alert(data.message || "Gagal mengekspor file Excel.");
        }
    } catch (err) {
        showLoading(false);
        alert("Terjadi kesalahan saat memproses ekspor Excel.");
    }
}

// -------------------------------------------------------------------------
// HELPER UI
// -------------------------------------------------------------------------
function tampilkanDetailBarang(d) {
    const detailBox = document.getElementById('detailBarangBox');
    if (!detailBox) return;

    detailBox.style.display = "block";

    setTextContent('lblKode', d.kode);
    setTextContent('lblReg', d.reg);
    setTextContent('lblNama', d.nama);
    setTextContent('lblMerk', d.merk);
    setTextContent('lblUkuran', d.ukuran);
    setTextContent('lblBahan', d.bahan);
    setTextContent('lblTahun', d.tahun);
    setTextContent('lblKondisi', d.kondisi_status);
    setTextContent('lblHargaSatuan', d.harga_satuan_formatted);
    setTextContent('lblHargaTotal', d.harga_total_formatted);
    setTextContent('lblKeterangan', d.keterangan);

    const badgeStatus = document.getElementById('badgeStatus');
    if (badgeStatus) {
        if (d.sudah_inventaris) {
            badgeStatus.className = "badge status-success";
            badgeStatus.innerText = "Ter-inventarisasi Digital";
        } else {
            badgeStatus.className = "badge status-pending";
            badgeStatus.innerText = "Belum Ter-inventarisasi";
        }
    }
}

function resetView() {
    const detailBox = document.getElementById('detailBarangBox');
    if (detailBox) detailBox.style.display = "none";
}

function setTextContent(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = text || "-";
}

function showLoading(isLoading) {
    const loader = document.getElementById('loadingSpinner');
    if (loader) {
        loader.style.display = isLoading ? "flex" : "none";
    }
}

// -------------------------------------------------------------------------
// 6. UI & DISPLAY HELPERS
// -------------------------------------------------------------------------
function tampilkanDetailBarang(d) {
    const detailBox = document.getElementById('detailBarangBox');
    if (!detailBox) return;

    // Menampilkan kontainer detail
    detailBox.style.display = "block";

    // Mapping nilai elemen HTML
    setTextContent('lblKode', d.kode);
    setTextContent('lblReg', d.reg);
    setTextContent('lblNama', d.nama);
    setTextContent('lblMerk', d.merk);
    setTextContent('lblUkuran', d.ukuran);
    setTextContent('lblBahan', d.bahan);
    setTextContent('lblTahun', d.tahun);
    setTextContent('lblKondisi', d.kondisi_status);
    setTextContent('lblHargaSatuan', d.harga_satuan_formatted);
    setTextContent('lblHargaTotal', d.harga_total_formatted);
    setTextContent('lblKeterangan', d.keterangan);

    // Indikator Status Inventaris
    const badgeStatus = document.getElementById('badgeStatus');
    if (badgeStatus) {
        if (d.sudah_inventaris) {
            badgeStatus.className = "badge status-success";
            badgeStatus.innerText = "Ter-inventarisasi Digital";
        } else {
            badgeStatus.className = "badge status-pending";
            badgeStatus.innerText = "Belum Ter-inventarisasi";
        }
    }
}

function resetView() {
    const detailBox = document.getElementById('detailBarangBox');
    if (detailBox) detailBox.style.display = "none";
}

function setTextContent(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) el.innerText = text || "-";
}

function showLoading(isLoading) {
    const loader = document.getElementById('loadingSpinner');
    if (loader) {
        loader.style.display = isLoading ? "flex" : "none";
    }
}
