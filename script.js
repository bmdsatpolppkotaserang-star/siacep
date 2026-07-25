document.addEventListener("DOMContentLoaded", function () {
  // =========================================================================
  // 1. PENGATURAN KONEKSI GOOGLE SHEETS & APPS SCRIPT
  // =========================================================================
  
  // URL Web App dari Google Apps Script
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzoYO2gElzeSa8hALiamv0oXr21gGc83tfmR9NDxBAjeFXS0uHqxJW6fdxdU-TRuHw6/exec";

  // ID Google Sheets Utama
  const SPREADSHEET_ID = "1ZpZtmGJyqglogaaq1vgKqp38XgvkUHP_wbMfJPp1Zwc";

  // ID Tab Rekapitulasi
  const GID_REKAP = "85327253";

  const infoDetailAset = document.getElementById("infoDetailAset");
  const btnStart = document.getElementById("btnStartCamera");
  const btnStop = document.getElementById("btnStopCamera");
  const btnResetScan = document.getElementById("btnResetScan");

  let scannerAktif = true;
  let html5QrCode = null; // Variabel penampung instance scanner

  // =========================================================================
  // FUNGSI EFEK SUARA BEEP KHAS SCANNER
  // =========================================================================
 // =========================================================================
  // FUNGSI EFEK SUARA BEEP KHAS SCANNER (SEMAKIN KENCANG)
  // =========================================================================
  function playScanBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      // Nada frekuensi 2000Hz (sedikit lebih tinggi & menusuk earphone/speaker HP)
      oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime); 

      // VOLUME DITINGKATKAN KE 0.8 (80% Dari Maksimal)
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime); 
      
      // Durasi dipanjangkan sedikit menjadi 0.15 detik
      gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15); 

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.log("Audio tidak didukung atau diblokir browser:", e);
    }
  }

  // =========================================================================
  // 2. INTEGRASI SCANNER KAMERA DENGAN TOMBOL KUSTOM
  // =========================================================================
  
  // Inisialisasi engine Html5Qrcode
  html5QrCode = new Html5Qrcode("reader");

  // Fungsi untuk Menyalakan Kamera
  function mulaiKamera() {
    const config = { 
      fps: 10, 
      qrbox: { width: 220, height: 220 } 
    };

    html5QrCode.start(
      { facingMode: "environment" }, // Prioritaskan kamera belakang HP
      config,
      (decodedText) => {
        // Jika QR berhasil terbaca
        if (scannerAktif) {
          scannerAktif = false; // Hindari pembacaan ganda dalam waktu singkat
          playScanBeep(); // <--- BEEP! BUNYI KHAS SCANNER SAAT BERHASIL
          prosesScanQR(decodedText);
        }
      },
      (errorMessage) => {
        // Abaikan pencarian QR frame-by-frame
      }
    ).then(() => {
      // Jika kamera berhasil aktif, sesuaikan tampilan tombol
      if (btnStart && btnStop) {
        btnStart.style.display = "none";
        btnStop.style.display = "inline-flex";
      }
    }).catch(err => {
      console.error("Gagal membuka kamera:", err);
      alert("Kamera gagal diakses. Pastikan izin kamera pada browser HP sudah diizinkan!");
    });
  }

  // Fungsi untuk Mematikan Kamera
  function matikanKamera() {
    if (html5QrCode && html5QrCode.isScanning) {
      html5QrCode.stop().then(() => {
        if (btnStart && btnStop) {
          btnStart.style.display = "inline-flex";
          btnStop.style.display = "none";
        }
      }).catch(err => {
        console.error("Gagal menghentikan kamera:", err);
      });
    }
  }

  // Event Listener Klik Tombol Start, Stop, & Reset
  if (btnStart) {
    btnStart.addEventListener("click", function() {
      scannerAktif = true;
      mulaiKamera();
    });
  }

  if (btnStop) {
    btnStop.addEventListener("click", function() {
      matikanKamera();
    });
  }

  if (btnResetScan) {
    btnResetScan.addEventListener("click", function () {
      scannerAktif = true;
      infoDetailAset.innerHTML = `
        <div style="text-align: center; padding: 15px 0;">
          <img src="https://api.iconify.design/lucide:qr-code.svg?color=%230284c7" alt="QR Code" style="width: 36px; height: 36px; margin: 0 auto 8px auto; display: block;" />
          <p style="color: #64748b; margin: 0; font-weight: 500;">
            Arahkan kamera ke stiker QR Code barang selanjutnya...
          </p>
        </div>
      `;
      // Otomatis nyalakan kamera kembali jika dalam keadaan mati
      if (html5QrCode && !html5QrCode.isScanning) {
        mulaiKamera();
      }
    });
  }

  // =========================================================================
  // 3. FUNGSI PROSES SCAN & AMBIL DATA KIB DARI GOOGLE SHEETS
  // =========================================================================
  function prosesScanQR(kodeQR) {
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

            <div style="display: flex; flex-direction: column; gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; word-break: break-word; overflow-wrap: anywhere;">
              
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">KODE BARANG / ID ASET</span>
                <span style="font-size: 15px; font-weight: bold; color: #0284c7; word-break: break-all; font-family: monospace;">${data.kode}</span>
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
          `;
        } else {
          infoDetailAset.innerHTML = `
            <div style="text-align:center; color:#ef4444; padding:15px;">
              <i class="fa-solid fa-circle-xmark" style="font-size:32px;"></i>
              <p style="margin-top:8px; font-weight:bold;">Kode [${kodeQR}] tidak ditemukan dalam Database!</p>
            </div>
          `;
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
      if (!SPREADSHEET_ID || SPREADSHEET_ID.trim() === "") {
        alert("ID Google Sheets belum diisi!");
        return;
      }
      const downloadUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&gid=${GID_REKAP}`;
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
