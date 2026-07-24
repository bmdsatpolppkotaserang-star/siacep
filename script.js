document.addEventListener("DOMContentLoaded", function () {
  // =========================================================================
  // 1. PENGATURAN KONEKSI GOOGLE SHEETS & APPS SCRIPT
  // =========================================================================
  
  // URL Web App dari Google Apps Script
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz0XbMAWA9zY-wWRpiT27C2y5sKaaqhntnKAxk4xs9yzR7YI3YPIK1jVxiEy6nbwGU0/exec";

  // ID Google Sheets Utama (Lihat di URL browser: docs.google.com/spreadsheets/d/ INI_ID_NYA /edit)
  const SPREADSHEET_ID = "1ZpZtmGJyqglogaaq1vgKqp38XgvkUHP_wbMfJPp1Zwc";

  // ID Tab Rekapitulasi saja (Lihat angka di ujung URL saat buka tab Rekap: #gid= INI_ANGKA_GID_NYA)
  const GID_REKAP = "85327253";

  const infoDetailAset = document.getElementById("infoDetailAset");
  let scannerAktif = true;

  // =========================================================================
  // 2. INTEGRASI SCANNER KAMERA
  // =========================================================================
  function onScanSuccess(decodedText) {
    if (!scannerAktif) return; // Mencegah scan berulang-ulang dalam hitungan detik
    
    scannerAktif = false; // Matikan pemindaian sementara saat memproses data
    prosesScanQR(decodedText);
  }

  function onScanFailure(error) {
    // Abaikan error per-frame saat kamera belum menemukan QR Code
  }

  // Inisialisasi Html5QrcodeScanner dengan parameter lengkap
  let html5QrcodeScanner = new Html5QrcodeScanner(
    "reader", 
    { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      rememberLastUsedCamera: true
    },
    /* verbose= */ false
  );

  html5QrcodeScanner.render(onScanSuccess, onScanFailure);

  // =========================================================================
  // 3. FUNGSI PROSES SCAN & AMBIL 17 DATA KIB DARI GOOGLE SHEETS
  // =========================================================================
  function prosesScanQR(kodeQR) {
    // Tampilan Loading saat mencari data
    infoDetailAset.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:#0284c7;"></i>
        <p style="margin-top:10px; color:#475569; font-weight:500;">Mencari data aset & mencatat inventarisasi...</p>
      </div>
    `;

    fetch(`${SCRIPT_URL}?action=scan_inventaris&kode=${encodeURIComponent(kodeQR)}`)
      .then(response => response.json())
      .then(data => {
        if (data.result === "found") {
          // Tampilkan Rincian Lembar Informasi Aset (17 Kolom KIB)
          infoDetailAset.innerHTML = `
            <div class="info-badge-status status-good" style="margin-bottom: 15px; background-color: #dcfce7; color: #166534; padding: 8px 12px; border-radius: 6px; font-weight: bold; display: inline-block;">
              <i class="fa-solid fa-circle-check"></i> Status: TER-INVENTARISASI
            </div>

            <div class="info-detail-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px;">
              <div class="info-item">
                <span class="info-label" style="font-size: 12px; color: #64748b; display: block;">Kode Barang / ID Aset</span>
                <span class="info-value code-highlight" style="font-weight: bold; color: #0284c7;">${data.kode}</span>
              </div>
              <div class="info-item">
                <span class="info-label" style="font-size: 12px; color: #64748b; display: block;">Nama Barang & Merk/Type</span>
                <span class="info-value" style="font-weight: 600;">${data.nama} ${data.merk ? ' - ' + data.merk : ''}</span>
              </div>
              <div class="info-item">
                <span class="info-label" style="font-size: 12px; color: #64748b; display: block;">No. Reg & Tahun Perolehan</span>
                <span class="info-value">Reg: ${data.reg || '-'} | Tahun: ${data.tahun || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label" style="font-size: 12px; color: #64748b; display: block;">Ukuran/CC & Bahan</span>
                <span class="info-value">${data.ukuran || '-'} / ${data.bahan || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label" style="font-size: 12px; color: #64748b; display: block;">No. Rangka / Mesin / Polisi</span>
                <span class="info-value">${data.no_rangka || '-'} / ${data.no_mesin || '-'} / ${data.no_polisi || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label" style="font-size: 12px; color: #64748b; display: block;">Kondisi & Status Penggunaan</span>
                <span class="info-value">${data.kondisi_status || '-'}</span>
              </div>
              <div class="info-item">
                <span class="info-label" style="font-size: 12px; color: #64748b; display: block;">Harga Satuan</span>
                <span class="info-value">Rp ${data.harga ? Number(data.harga).toLocaleString('id-ID') : '-'}</span>
              </div>
              <div class="info-item" style="grid-column: 1 / -1;">
                <span class="info-label" style="font-size: 12px; color: #64748b; display: block;">Catatan Status Digital</span>
                <span class="info-value" style="color: #0284c7; font-weight: bold;">${data.keterangan}</span>
              </div>
            </div>

            <!-- TOMBOL SCAN BARANG LAIN (MUNCUL OTOMATIS TANPA REFRESH HALAMAN) -->
            <div style="text-align: center; margin-top: 20px;">
              <button id="btnScanLagi" type="button" style="background-color: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer;">
                <i class="fa-solid fa-qrcode"></i> Scan Barang Lain
              </button>
            </div>
          `;

          // Fungsi saat tombol "Scan Barang Lain" diklik
          document.getElementById("btnScanLagi").addEventListener("click", function() {
            scannerAktif = true; // Aktifkan pembacaan QR kembali
            infoDetailAset.innerHTML = `
              <p style="text-align: center; color: #64748b; padding: 15px 0;">
                <i class="fa-solid fa-qrcode" style="font-size: 28px; margin-bottom: 8px; display: block; color: #94a3b8;"></i>
                Arahkan kamera ke stiker QR Code barang selanjutnya...
              </p>
            `;
          });

        } else {
          // Jika Kode QR tidak ditemukan di Google Sheets
          infoDetailAset.innerHTML = `
            <div style="text-align:center; color:#ef4444; padding:15px;">
              <i class="fa-solid fa-circle-xmark" style="font-size:32px;"></i>
              <p style="margin-top:8px; font-weight:bold;">Kode [${kodeQR}] tidak ditemukan dalam Database Google Sheets!</p>
              <button id="btnScanLagi" type="button" style="margin-top:10px; background-color: #0284c7; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer;">
                Coba Scan Lagi
              </button>
            </div>
          `;
          document.getElementById("btnScanLagi").addEventListener("click", function() {
            scannerAktif = true;
          });
        }
      })
      .catch(err => {
        infoDetailAset.innerHTML = `<p style="color:#ef4444; text-align:center; padding:15px;">Gagal terhubung ke Google Sheets. Periksa koneksi internet!</p>`;
        scannerAktif = true;
      });
  }

  // =========================================================================
  // 4. TOMBOL DOWNLOAD REKAP EXCEL (.xlsx KHUSUS TAB REKAPITULASI)
  // =========================================================================
  const btnDownload = document.querySelector(".btn-download");
if (btnDownload) {
  btnDownload.addEventListener("click", function () {
    // Validasi sederhana: Cek apakah variabel tidak kosong
    if (!SPREADSHEET_ID || SPREADSHEET_ID.trim() === "") {
      alert("ID Google Sheets belum diisi!");
      return;
    }
    
    // Tautan ekspor file Excel khusus tab rekap
    const downloadUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&gid=${GID_REKAP}`;
    
    // Buka tab baru untuk mulai mengunduh file
    window.open(downloadUrl, '_blank');
  });
}
  // =========================================================================
  // 5. TOMBOL CETAK HASIL INVENTARISASI ASET
  // =========================================================================
  const btnPrint = document.querySelector(".btn-print");
  if (btnPrint) {
    btnPrint.addEventListener("click", function () {
      window.print();
    });
  }
});
