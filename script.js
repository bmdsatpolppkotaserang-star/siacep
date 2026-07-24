document.addEventListener("DOMContentLoaded", function () {
  // =========================================================================
  // 1. PENGATURAN KONEKSI GOOGLE SHEETS & APPS SCRIPT
  // =========================================================================
  
  // URL Web App dari Google Apps Script
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzoYO2gElzeSa8hALiamv0oXr21gGc83tfmR9NDxBAjeFXS0uHqxJW6fdxdU-TRuHw6/exec";

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
  // Variabel gambar ikon QR Code (SVG Iconify warna biru & putih)
  const qrIconBlue = `<img src="https://api.iconify.design/lucide:qr-code.svg?color=%230284c7" alt="QR Code" style="width: 36px; height: 36px; margin: 0 auto 8px auto; display: block;" />`;
  const qrIconWhite = `<img src="https://api.iconify.design/lucide:qr-code.svg?color=%23ffffff" alt="QR Code" style="width: 18px; height: 18px;" />`;

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
        infoDetailAset.innerHTML = `
          <div style="margin-bottom: 15px; text-align: center;">
            <span style="background-color: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block;">
              <i class="fa-solid fa-circle-check"></i> TER-INVENTARISASI DIGITAL
            </span>
          </div>

          <div style="display: flex; flex-direction: column; gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
            
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">KODE BARANG / ID ASET</span>
              <span style="font-size: 15px; font-weight: bold; color: #0284c7;">${data.kode}</span>
            </div>

            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">NAMA BARANG / MERK / REG</span>
              <span style="font-size: 14px; font-weight: 600; color: #1e293b;">${data.nama} ${data.merk !== '-' ? ' - ' + data.merk : ''} (Reg: ${data.reg})</span>
            </div>

            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">SPESIFIKASI & TAHUN</span>
              <span style="font-size: 13px; color: #334155;">Ukuran: ${data.ukuran} | Bahan: ${data.bahan} | Thn: ${data.tahun}</span>
            </div>

            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">NOMOR LEGALITAS / KENDARAAN</span>
              <span style="font-size: 13px; color: #334155;">Pabrik: ${data.no_pabrik} | Rangka: ${data.no_rangka} | Mesin: ${data.no_mesin} | Polisi: ${data.no_polisi} | BPKB: ${data.no_bpkb}</span>
            </div>

            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">KONDISI & STATUS ASET</span>
              <span style="font-size: 13px; color: #334155;">${data.kondisi_status} (Status: ${data.status_aset})</span>
            </div>

            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">NILAI / HARGA BARANG</span>
              <span style="font-size: 14px; font-weight: bold; color: #166534;">Rp ${data.harga_total ? Number(data.harga_total).toLocaleString('id-ID') : '0'}</span>
            </div>

            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">KETERANGAN DOKUMEN</span>
              <span style="font-size: 13px; color: #334155;">${data.keterangan_aset}</span>
            </div>

            <div>
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">CATATAN WAKTU SCAN</span>
              <span style="font-size: 12px; color: #0284c7; font-weight: 600;">${data.keterangan}</span>
            </div>

          </div>

          <div style="text-align: center; margin-top: 18px;">
            <button id="btnScanLagi" type="button" style="background-color: #0284c7; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
              ${qrIconWhite} Scan Barang Lain
            </button>
          </div>
        `;

        document.getElementById("btnScanLagi").addEventListener("click", function() {
          scannerAktif = true;
          infoDetailAset.innerHTML = `
            <div style="text-align: center; padding: 15px 0;">
              ${qrIconBlue}
              <p style="color: #64748b; margin: 0; font-weight: 500;">
                Arahkan kamera ke stiker QR Code barang selanjutnya...
              </p>
            </div>
          `;
        });

      } else {
        infoDetailAset.innerHTML = `
          <div style="text-align:center; color:#ef4444; padding:15px;">
            <i class="fa-solid fa-circle-xmark" style="font-size:32px;"></i>
            <p style="margin-top:8px; font-weight:bold;">Kode [${kodeQR}] tidak ditemukan dalam Database!</p>
            <button id="btnScanLagi" type="button" style="margin-top:10px; background-color: #0284c7; color: white; border: none; padding: 8px 15px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
              ${qrIconWhite} Coba Scan Lagi
            </button>
          </div>
        `;
        document.getElementById("btnScanLagi").addEventListener("click", function() {
          scannerAktif = true;
          infoDetailAset.innerHTML = `
            <div style="text-align: center; padding: 15px 0;">
              ${qrIconBlue}
              <p style="color: #64748b; margin: 0; font-weight: 500;">
                Arahkan kamera ke stiker QR Code barang selanjutnya...
              </p>
            </div>
          `;
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
