document.addEventListener("DOMContentLoaded", function () {
  // =========================================================================
  // 1. PENGATURAN KONEKSI GOOGLE SHEETS & APPS SCRIPT
  // =========================================================================
  
  // URL Web App dari Google Apps Script
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwtlESbcHwjU_O3LMqkGFfNY4SQWZzigLKqIp85FCQ5mTtLbAyQstMV5Q9L6mPDcNG9/exec";

  // ID Google Sheets Utama
  const SPREADSHEET_ID = "1ZpZtmGJyqglogaaq1vgKqp38XgvkUHP_wbMfJPp1Zwc";

  // ID Tab Rekapitulasi
  const GID_REKAP = "85327253";

  const infoDetailAset = document.getElementById("infoDetailAset");
  const btnStart = document.getElementById("btnStartCamera");
  const btnStop = document.getElementById("btnStopCamera");
  const btnResetScan = document.getElementById("btnResetScan");

  // Element untuk Fitur Input Manual
  const inputKodeManual = document.getElementById("inputKodeManual");
  const btnCariManual = document.getElementById("btnCariManual");

  let scannerAktif = true;
  let html5QrCode = null; // Variabel penampung instance scanner

  // =========================================================================
  // FUNGSI EFEK SUARA BEEP KHAS SCANNER
  // =========================================================================
  function playScanBeep() {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(2000, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime); 
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
  
  html5QrCode = new Html5Qrcode("reader");

  function mulaiKamera() {
    const config = { 
      fps: 10, 
      qrbox: { width: 220, height: 220 } 
    };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (scannerAktif) {
          scannerAktif = false;
          playScanBeep();
          mintaPinDanProses(decodedText);
        }
      },
      (errorMessage) => {}
    ).then(() => {
      if (btnStart && btnStop) {
        btnStart.style.display = "none";
        btnStop.style.display = "inline-flex";
      }
    }).catch(err => {
      console.error("Gagal membuka kamera:", err);
      alert("Kamera gagal diakses. Pastikan izin kamera pada browser HP sudah diizinkan!");
    });
  }

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
      if (html5QrCode && !html5QrCode.isScanning) {
        mulaiKamera();
      }
    });
  }

  // =========================================================================
  // 3. FITUR PENELUSURAN KODE BARANG MANUAL
  // =========================================================================
  function eksekusiCariManual() {
    if (!inputKodeManual) return;
    
    const kodeInput = inputKodeManual.value.trim();

    if (!kodeInput) {
      alert("Masukkan Kode Barang, ID Awal, atau ID Barang terlebih dahulu!");
      inputKodeManual.focus();
      return;
    }

    playScanBeep();
    scannerAktif = false;
    mintaPinDanProses(kodeInput);
    inputKodeManual.value = "";
  }

  if (btnCariManual) {
    btnCariManual.addEventListener("click", eksekusiCariManual);
  }

  if (inputKodeManual) {
    inputKodeManual.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        eksekusiCariManual();
      }
    });
  }

  // =========================================================================
  // 4. FUNGSI VERIFIKASI PIN SEBELUM PROSES SCAN
  // =========================================================================
  function mintaPinDanProses(kodeQR) {
    const pinInput = prompt("🔒 Masukkan PIN Petugas Aset untuk memproses:");
    
    if (pinInput === null || pinInput.trim() === "") {
      alert("Akses dibatalkan. PIN Petugas wajib diisi!");
      scannerAktif = true;
      return;
    }

    prosesScanQR(kodeQR, pinInput.trim());
  }

  // =========================================================================
  // 5. FUNGSI PROSES SCAN & AMBIL DATA KIB DARI GOOGLE SHEETS
  // =========================================================================
  function prosesScanQR(kodeQR, pin) {
    infoDetailAset.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:#0284c7;"></i>
        <p style="margin-top:10px; color:#475569; font-weight:500;">Memverifikasi PIN & mencatat inventarisasi...</p>
      </div>
    `;

    fetch(`${SCRIPT_URL}?action=scan_inventaris&kode=${encodeURIComponent(kodeQR)}&pin=${encodeURIComponent(pin)}`)
      .then(response => response.json())
      .then(data => {
        if (data.result === "wrong_pin") {
          alert("❌ PIN Petugas Salah! Akses ditolak.");
          infoDetailAset.innerHTML = `
            <div style="text-align:center; color:#ef4444; padding:15px;">
              <i class="fa-solid fa-lock" style="font-size:32px;"></i>
              <p style="margin-top:8px; font-weight:bold;">PIN Petugas Salah!</p>
              <p style="font-size:12px; color:#64748b;">Silakan coba scan/input kembali dengan PIN yang benar.</p>
            </div>
          `;
          scannerAktif = true;
          return;
        }

        if (data.result === "found") {
          infoDetailAset.innerHTML = `
            <div style="margin-bottom: 15px; text-align: center;">
              <span style="background-color: #dcfce7; color: #166534; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; display: inline-block;">
                <i class="fa-solid fa-circle-check"></i> TER-INVENTARISASI DIGITAL
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; word-break: break-word; overflow-wrap: anywhere;">
              
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">KODE BARANG / ID AWAL / ID BARANG</span>
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

            <!-- TOMBOL MERAH UNTUK BATAL / HAPUS STATUS REKAP -->
            <div style="margin-top: 15px; text-align: center;">
              <button 
                type="button" 
                onclick="hapusDataAset('${data.kode}')"
                style="background-color: #ef4444; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 8px; font-size: 13px;">
                <i class="fa-solid fa-trash-can"></i> Hapus Status Inventaris
              </button>
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
  // 6. FUNGSI EKSEKUSI HAPUS STATUS REKAP DARI SPREADSHEET (DENGAN VERIFIKASI PIN)
  // =========================================================================
  window.hapusDataAset = function(kodeBarang) {
    const pinInput = prompt("🔒 Masukkan PIN Petugas Aset untuk menghapus status:");
    
    if (pinInput === null || pinInput.trim() === "") {
      alert("Penghapusan dibatalkan. PIN Petugas wajib diisi!");
      return;
    }

    const konfirmasi = confirm(`Apakah Anda yakin ingin menghapus status inventarisasi untuk Kode: ${kodeBarang}?`);
    if (!konfirmasi) return;

    infoDetailAset.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:#ef4444;"></i>
        <p style="margin-top:10px; color:#475569; font-weight:500;">Memverifikasi PIN & menghapus status...</p>
      </div>
    `;

    fetch(`${SCRIPT_URL}?action=delete_inventaris&kode=${encodeURIComponent(kodeBarang)}&pin=${encodeURIComponent(pinInput.trim())}`)
      .then(response => response.json())
      .then(res => {
        if (res.result === "wrong_pin") {
          alert("❌ PIN Petugas Salah! Gagal menghapus status.");
          prosesScanQR(kodeBarang, pinInput.trim()); // Kembalikan ke tampilan detail
          return;
        }

        if (res.result === "success") {
          alert("Status inventarisasi berhasil dihapus!");
          infoDetailAset.innerHTML = `
            <div style="text-align:center; color:#059669; padding:15px;">
              <i class="fa-solid fa-circle-check" style="font-size:32px;"></i>
              <p style="margin-top:8px; font-weight:bold;">Status [${kodeBarang}] Berhasil Direset!</p>
              <p style="font-size:12px; color:#64748b;">Silakan scan QR aset lain...</p>
            </div>
          `;
          scannerAktif = true;
        } else {
          alert("Gagal menghapus status atau kode tidak ditemukan.");
        }
      })
      .catch(err => {
        alert("Gagal terhubung ke server saat menghapus data.");
      });
  };

  // =========================================================================
  // 7. TOMBOL DOWNLOAD REKAP EXCEL
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
  // 8. TOMBOL CETAK HASIL INVENTARISASI ASET
  // =========================================================================
  const btnPrint = document.querySelector(".btn-print");
  if (btnPrint) {
    btnPrint.addEventListener("click", function () {
      window.print();
    });
  }
});

// Registrasi Service Worker PWA SI-ACEP
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA Service Worker SI-ACEP Berhasil Aktif:', reg.scope))
      .catch(err => console.error('PWA Service Worker Gagal:', err));
  });
}
