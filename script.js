// =========================================================================
// DEKLARASI VARIABEL GLOBAL & STATE APLIKASI
// =========================================================================
let scannerAktif = true;
let html5QrCode = null;

// Konfigurasi Google Apps Script
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxLNY3gSte8JgnJJ1gtBQnjnEw-MnWse70M1xJQOHEBDZpWq7adR_eh5o8A5ozuwZWc/exec";
const SPREADSHEET_ID = "1ZpZtmGJyqglogaaq1vgKqp38XgvkUHP_wbMfJPp1Zwc";
const GID_REKAP = "85327253";
const PIN_PETUGAS_DEFAULT = "123456"; // Ganti dengan PIN Petugas Satpol PP Anda

// Helper Sanitasi Teks
const safeStr = (val) => (val !== undefined && val !== null && val !== "" && val !== "null") ? val : "-";

// =========================================================================
// FUNGSI GLOBAL: RESET & KEMBALI KE TAMPILAN AWAL
// =========================================================================
window.kembaliKeAwal = function () {
  const infoDetailAset = document.getElementById("infoDetailAset");
  const inputKodeManual = document.getElementById("inputKodeManual");

  scannerAktif = true;

  if (inputKodeManual) {
    inputKodeManual.value = "";
  }

  if (infoDetailAset) {
    infoDetailAset.innerHTML = `
      <p style="text-align: center; color: #64748b; padding: 15px 0;">
        <i class="fa-solid fa-qrcode" style="font-size: 28px; margin-bottom: 8px; display: block; color: #94a3b8;"></i>
        Silakan scan QR Code barang di atas untuk menampilkan Lembar Informasi Aset...
      </p>
    `;
  }

  if (typeof window.mulaiKamera === "function") {
    window.mulaiKamera();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// =========================================================================
// INISIALISASI SETELAH DOM SIAP
// =========================================================================
document.addEventListener("DOMContentLoaded", function () {
  const infoDetailAset = document.getElementById("infoDetailAset");
  const btnStart = document.getElementById("btnStartCamera");
  const btnStop = document.getElementById("btnStopCamera");
  const inputKodeManual = document.getElementById("inputKodeManual");
  const btnCariManual = document.getElementById("btnCariManual");

  // Tombol Petugas
  const btnCatatUpdate = document.getElementById("btnCatatUpdate");
  const btnHapusInventaris = document.getElementById("btnHapusInventaris");
  const btnCetakQR = document.getElementById("btnCetakQR");
  const btnDownloadRekap = document.getElementById("btnDownloadRekap");

  // =========================================================================
  // EFEK SUARA BEEP SCANNER
  // =========================================================================
  function playScanBeep() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      const audioCtx = new AudioContext();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

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

      setTimeout(() => {
        if (audioCtx.state !== 'closed') audioCtx.close();
      }, 200);
    } catch (e) {
      console.log("Audio diblokir oleh browser:", e);
    }
  }

  // =========================================================================
  // INTEGRASI SCANNER KAMERA (HTML5-QRCODE)
  // =========================================================================
  if (document.getElementById("reader")) {
    html5QrCode = new Html5Qrcode("reader");
  }

  window.mulaiKamera = function () {
    if (!html5QrCode) return;

    if (html5QrCode.isScanning) {
      scannerAktif = true;
      return;
    }

    const config = { fps: 10, qrbox: { width: 220, height: 220 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        if (scannerAktif) {
          scannerAktif = false;
          playScanBeep();
          window.prosesCekDetailAset(decodedText, false);
        }
      },
      (errorMessage) => { }
    ).then(() => {
      if (btnStart && btnStop) {
        btnStart.style.display = "none";
        btnStop.style.display = "inline-flex";
      }
    }).catch(err => {
      console.error("Gagal membuka kamera:", err);
    });
  };

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

  if (btnStart) btnStart.addEventListener("click", () => { scannerAktif = true; window.mulaiKamera(); });
  if (btnStop) btnStop.addEventListener("click", () => matikanKamera());

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) matikanKamera();
  });

  // Autostart kamera
  window.mulaiKamera();

  // =========================================================================
  // INPUT KODE BARANG MANUAL
  // =========================================================================
  function eksekusiCariManual() {
    if (!inputKodeManual) return;
    const kodeInput = inputKodeManual.value.trim();

    if (!kodeInput) {
      alert("Masukkan Kode Barang atau ID Aset terlebih dahulu!");
      inputKodeManual.focus();
      return;
    }

    playScanBeep();
    scannerAktif = false;
    window.prosesCekDetailAset(kodeInput, false);
    inputKodeManual.value = "";
  }

  if (btnCariManual) btnCariManual.addEventListener("click", eksekusiCariManual);

  if (inputKodeManual) {
    inputKodeManual.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        eksekusiCariManual();
      }
    });
  }

  // =========================================================================
  // FUNGSI PROSES CEK DETAIL ASET (EXPOSED TO WINDOW)
  // =========================================================================
  window.prosesCekDetailAset = function (kodeQR, tampilkanHarga = false) {
    if (!infoDetailAset) return;

    infoDetailAset.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:#0284c7;"></i>
        <p style="margin-top:10px; color:#475569; font-weight:500;">Mencari data barang...</p>
      </div>
    `;

    fetch(`${SCRIPT_URL}?action=get_detail&kode=${encodeURIComponent(kodeQR)}`)
      .then(response => response.json())
      .then(data => {
        if (data.result === "found") {
          const isTerinventaris = data.sudah_inventaris === true;

          // Simpan data di LocalStorage untuk dibaca oleh print-label.html
          localStorage.setItem("print_kode", data.kode || kodeQR);
          localStorage.setItem("print_nama", data.nama || "-");
          localStorage.setItem("print_tahun", data.tahun_perolehan || data.tahun || "-");

          // Format Tampilan Harga
          let teksHarga = `<span style="font-size: 13px; color: #64748b; font-weight: normal; font-style: italic;">*** (Akses via Petugas untuk lihat)</span>`;
          if (tampilkanHarga && data.harga_total) {
            teksHarga = `Rp ${Number(data.harga_total).toLocaleString('id-ID')}`;
          }

          infoDetailAset.innerHTML = `
            <div style="margin-bottom: 15px; text-align: center;">
              <span class="info-badge-status ${isTerinventaris ? 'status-good' : 'status-bad'}">
                <i class="fa-solid ${isTerinventaris ? 'fa-circle-check' : 'fa-clock'}"></i> ${isTerinventaris ? 'TER-INVENTARISASI DIGITAL' : 'BELUM DICATAT PERIODE INI'}
              </span>
            </div>

            <div class="info-detail-grid">
              
              <div class="info-item">
                <span class="info-label">KODE BARANG / ID BARANG</span>
                <span class="info-value code-highlight">${safeStr(data.kode)}</span>
              </div>

              <div class="info-item">
                <span class="info-label">NAMA BARANG / MERK / REG</span>
                <span class="info-value">${safeStr(data.nama)} ${data.merk && data.merk !== '-' ? ' - ' + data.merk : ''} (Reg: ${safeStr(data.reg)})</span>
              </div>

              <div class="info-item">
                <span class="info-label">SPESIFIKASI & TAHUN</span>
                <span class="info-value" style="font-size:13px; font-weight:500;">Ukuran: ${safeStr(data.ukuran)} | Bahan: ${safeStr(data.bahan)} | Tahun: ${safeStr(data.tahun_perolehan || data.tahun)}</span>
              </div>

              <div class="info-item">
                <span class="info-label">NOMOR LEGALITAS / KENDARAAN</span>
                <span class="info-value" style="font-size:13px; font-weight:500;">Pabrik: ${safeStr(data.no_pabrik)} | Rangka: ${safeStr(data.no_rangka)} | Mesin: ${safeStr(data.no_mesin)} | Polisi: ${safeStr(data.no_polisi)} | BPKB: ${safeStr(data.no_bpkb)}</span>
              </div>

              <div class="info-item">
                <span class="info-label">KONDISI & STATUS ASET</span>
                <span class="info-value" style="font-size:13px; font-weight:500;">${safeStr(data.kondisi_status)} (Status: ${safeStr(data.status_aset)})</span>
              </div>

              <div class="info-item" style="background-color: ${tampilkanHarga ? '#f0fdf4' : 'transparent'}; padding: 6px; border-radius: 6px;">
                <span class="info-label">NILAI / HARGA BARANG</span>
                <span class="info-value" style="color: #166534;">${teksHarga}</span>
              </div>

              <div class="info-item" style="border-bottom: none;">
                <span class="info-label">KETERANGAN DOKUMEN</span>
                <span class="info-value" style="font-size:13px; font-weight:500;">${safeStr(data.keterangan_aset)}</span>
              </div>

            </div>

            <div style="margin-top: 15px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
              <button 
                type="button" 
                onclick="window.kembaliKeAwal()"
                style="background-color: #0284c7; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; width: 100%; justify-content: center;">
                <i class="fa-solid fa-arrow-left"></i> Scan Barang Lainnya
              </button>
            </div>
          `;
        } else {
          infoDetailAset.innerHTML = `
            <div style="text-align:center; color:#ef4444; padding:15px;">
              <i class="fa-solid fa-circle-xmark" style="font-size:32px;"></i>
              <p style="margin-top:8px; font-weight:bold;">Kode [${kodeQR}] tidak ditemukan dalam Database!</p>
              <button 
                type="button" 
                onclick="window.kembaliKeAwal()"
                style="background-color: #64748b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px;">
                <i class="fa-solid fa-arrow-left"></i> Coba Kode Lain
              </button>
            </div>
          `;
        }
      })
      .catch(err => {
        console.error("Error Fetch:", err);
        infoDetailAset.innerHTML = `
          <div style="text-align:center; padding:15px;">
            <p style="color:#ef4444;">Gagal terhubung ke Google Sheets. Periksa koneksi internet!</p>
            <button 
              type="button" 
              onclick="window.kembaliKeAwal()"
              style="background-color: #64748b; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-top: 10px;">
              Kembali
            </button>
          </div>
        `;
        scannerAktif = true;
      });
  };

  // =========================================================================
  // FUNGSI UPDATE / CATAT INVENTARIS KHUSUS PETUGAS
  // =========================================================================
  window.eksekusiInventarisasi = function (kodeBarang) {
    if (!kodeBarang) {
      alert("Scan atau cari barang terlebih dahulu!");
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin mencatat/memperbarui inventarisasi untuk kode: ${kodeBarang}?`)) return;

    if (infoDetailAset) {
      infoDetailAset.innerHTML = `
        <div style="text-align:center; padding: 20px;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:#0284c7;"></i>
          <p style="margin-top:10px; color:#475569; font-weight:500;">Memproses pencatatan inventaris...</p>
        </div>
      `;
    }

    fetch(`${SCRIPT_URL}?action=update_inventaris&kode=${encodeURIComponent(kodeBarang)}`)
      .then(res => res.json())
      .then(res => {
        if (res.result === "success") {
          alert("Berhasil! Data inventaris telah tercatat.");
          window.prosesCekDetailAset(kodeBarang, true);
        } else {
          alert("Gagal memperbarui inventaris: " + (res.message || "Kesalahan tidak diketahui"));
          window.prosesCekDetailAset(kodeBarang, true);
        }
      })
      .catch(err => {
        alert("Terjadi kesalahan jaringan saat update data.");
        window.prosesCekDetailAset(kodeBarang, true);
      });
  };

  // =========================================================================
  // FUNGSI HAPUS STATUS INVENTARIS
  // =========================================================================
  window.hapusDataAset = function (kodeBarang) {
    if (!kodeBarang) {
      alert("Scan barang terlebih dahulu sebelum menghapus status!");
      return;
    }

    if (!confirm(`Peringatan: Hapus pencatatan inventaris untuk kode ${kodeBarang}?`)) return;

    fetch(`${SCRIPT_URL}?action=hapus_inventaris&kode=${encodeURIComponent(kodeBarang)}`)
      .then(res => res.json())
      .then(res => {
        if (res.result === "success") {
          alert("Status inventarisasi berhasil dihapus.");
          window.prosesCekDetailAset(kodeBarang, true);
        } else {
          alert("Gagal menghapus status: " + (res.message || "Kesalahan server"));
        }
      })
      .catch(err => {
        alert("Gagal terhubung ke server saat menghapus data.");
      });
  };

  // =========================================================================
  // AKSI TOMBOL-TOMBOL DI PANEL MENU PETUGAS
  // =========================================================================
  
  // 1. Tombol Catat / Update
  if (btnCatatUpdate) {
    btnCatatUpdate.addEventListener("click", function () {
      const kodePrint = localStorage.getItem("print_kode");
      if (kodePrint) {
        window.eksekusiInventarisasi(kodePrint);
      } else {
        alert("Silakan scan QR Code atau cari barang terlebih dahulu!");
      }
    });
  }

  // 2. Tombol Hapus Hasil
  if (btnHapusInventaris) {
    btnHapusInventaris.addEventListener("click", function () {
      const kodePrint = localStorage.getItem("print_kode");
      if (kodePrint) {
        window.hapusDataAset(kodePrint);
      } else {
        alert("Silakan scan QR Code barang yang akan dihapus statusnya!");
      }
    });
  }

  // 3. Tombol Cetak QR Code (Membuka print-label.html)
  if (btnCetakQR) {
    btnCetakQR.addEventListener("click", function () {
      const kode = localStorage.getItem("print_kode");
      if (kode) {
        window.bukaCetakStikerLabel(kode);
      } else {
        alert("Scan barang terlebih dahulu untuk mencetak stiker QR Code!");
      }
    });
  }

  // 4. Tombol Cetak Laporan (Download Rekap Google Sheets)
  if (btnDownloadRekap) {
    btnDownloadRekap.addEventListener("click", function () {
      const urlExport = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=pdf&gid=${GID_REKAP}`;
      window.open(urlExport, "_blank");
    });
  }

  // Function Buka Jendela Cetak Stiker (Menggunakan file print-label.html)
  window.bukaCetakStikerLabel = function (kodeBarang) {
    window.open("print-label.html", "_blank", "width=420,height=320");
  };
});

// =========================================================================
// CONTROLLER MODAL PIN & PANEL PETUGAS (DILUAR DOMCONTENTLOADED)
// =========================================================================
window.openPinModal = function () {
  const modalPin = document.getElementById("modalPin");
  const inputPinPetugas = document.getElementById("inputPinPetugas");

  if (modalPin) {
    modalPin.style.display = "flex";
    if (inputPinPetugas) {
      inputPinPetugas.value = "";
      setTimeout(() => inputPinPetugas.focus(), 100);
    }
  }
};

window.closePinModal = function () {
  const modalPin = document.getElementById("modalPin");
  if (modalPin) modalPin.style.display = "none";
};

window.verifikasiPin = function () {
  const inputPin = document.getElementById("inputPinPetugas");
  const panelPetugas = document.getElementById("panelPetugas");

  if (!inputPin) return;

  if (inputPin.value === PIN_PETUGAS_DEFAULT) {
    window.closePinModal();
    if (panelPetugas) {
      panelPetugas.style.display = "block";
      panelPetugas.scrollIntoView({ behavior: 'smooth' });
    }
    alert("Akses Petugas Diberikan!");

    // Jika ada data aset terikat saat ini, muat ulang dengan menampilkan harga
    const kodePrint = localStorage.getItem("print_kode");
    if (kodePrint && typeof window.prosesCekDetailAset === "function") {
      window.prosesCekDetailAset(kodePrint, true);
    }
  } else {
    alert("PIN Salah! Akses ditolak.");
    inputPin.value = "";
    inputPin.focus();
  }
};

window.closePanelPetugas = function () {
  const panelPetugas = document.getElementById("panelPetugas");
  if (panelPetugas) {
    panelPetugas.style.display = "none";
  }
};
