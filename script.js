// =========================================================================
// MENCEGAH ERROR EKSTENSI BROWSER (Message Channel Closed Error)
// =========================================================================
window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && event.reason.message && event.reason.message.includes('message channel closed')) {
    event.preventDefault(); // Mencegah log error ekstensi mengganggu aplikasi
  }
});

// =========================================================================
// DEKLARASI VARIABEL GLOBAL & STATE APLIKASI
// =========================================================================
let scannerAktif = true;
let html5QrCode = null;

// Konfigurasi Google Apps Script & Google Sheets
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwA8IqnOINjfWxIeTJtzSGros66R5O7Eo7SjFzAGMzNuVCSaA_FJiwG8MXED5w50tYH/exec";
const SPREADSHEET_ID = "1ZpZtmGJyqglogaaq1vgKqp38XgvkUHP_wbMfJPp1Zwc";
const GID_REKAP = "85327253";
const PIN_PETUGAS_DEFAULT = "123456"; // PIN Akses Petugas Satpol PP

// Helper Sanitasi Teks
const safeStr = (val) => (val !== undefined && val !== null && val !== "" && val !== "null") ? val : "-";

// =========================================================================
// AUDIO BEEP SCANNER (Base64 Audio - Bebas Error & Memory Leak)
// =========================================================================
const scanBeepSound = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUtvT18AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8AZv8=");

function playScanBeep() {
  try {
    scanBeepSound.currentTime = 0;
    scanBeepSound.volume = 1.0;
    const playPromise = scanBeepSound.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => console.warn("Audio autoplay diblokir browser:", error));
    }
  } catch (e) {
    console.error("Gagal memutar suara beep:", e);
  }
}

// =========================================================================
// FUNGSI NAVIGASI / PINDAH HALAMAN
// =========================================================================
window.tampilkanHalamanScanner = function () {
  const pageScanner = document.getElementById("page-scanner");
  const pageInformasi = document.getElementById("page-informasi");
  const inputKodeManual = document.getElementById("inputKodeManual");

  // Clear data temp
  localStorage.removeItem("print_kode");
  localStorage.removeItem("print_nama");
  localStorage.removeItem("print_tahun");

  if (inputKodeManual) inputKodeManual.value = "";

  // Sembunyikan Informasi Aset & Tampilkan Halaman Scanner
  if (pageInformasi) pageInformasi.style.display = "none";
  if (pageScanner) pageScanner.style.display = "block";

  // Aktifkan Kamera Kembali
  scannerAktif = true;
  if (typeof window.mulaiKamera === "function") {
    window.mulaiKamera();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.tampilkanHalamanInformasi = function () {
  const pageScanner = document.getElementById("page-scanner");
  const pageInformasi = document.getElementById("page-informasi");

  if (pageScanner) pageScanner.style.display = "none";
  if (pageInformasi) pageInformasi.style.display = "block";

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

  // Unlock Audio
  function unlockAudio() {
    scanBeepSound.play().then(() => {
      scanBeepSound.pause();
      scanBeepSound.currentTime = 0;
    }).catch(() => {});
    document.removeEventListener("touchstart", unlockAudio);
    document.removeEventListener("click", unlockAudio);
  }
  document.addEventListener("touchstart", unlockAudio, { once: true });
  document.addEventListener("click", unlockAudio, { once: true });

  // INTEGRASI SCANNER KAMERA
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
          matikanKamera();
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

  // INPUT MANUAL KODE
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
    matikanKamera();
    window.prosesCekDetailAset(kodeInput, false);
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

  // ENTER KEY UNTUK MODAL PIN PETUGAS
  const inputPinPetugas = document.getElementById("inputPinPetugas");
  if (inputPinPetugas) {
    inputPinPetugas.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        window.verifikasiPin();
      }
    });
  }

  // AKSI TOMBOL PETUGAS
  if (btnCatatUpdate) {
    btnCatatUpdate.addEventListener("click", function () {
      const kodePrint = localStorage.getItem("print_kode");
      if (kodePrint) {
        window.eksekusiInventarisasi(kodePrint);
      } else {
        alert("Scan atau cari barang terlebih dahulu!");
      }
    });
  }

  if (btnHapusInventaris) {
    btnHapusInventaris.addEventListener("click", function () {
      const kodePrint = localStorage.getItem("print_kode");
      if (kodePrint) {
        window.hapusDataAset(kodePrint);
      } else {
        alert("Scan barang terlebih dahulu!");
      }
    });
  }

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

  window.bukaCetakStikerLabel = function (kodeBarang) {
    window.open("print-label.html", "_blank", "width=420,height=320");
  };
});

// =========================================================================
// FUNGSI CEK DETAIL ASET
// =========================================================================
window.prosesCekDetailAset = function (kodeQR, tampilkanHarga = false) {
  const infoDetailAset = document.getElementById("infoDetailAset");
  if (!infoDetailAset) return;

  window.tampilkanHalamanInformasi();

  infoDetailAset.innerHTML = `
    <div style="text-align:center; padding: 30px 10px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:36px; color:#0284c7;"></i>
      <p style="margin-top:12px; color:#475569; font-weight:bold;">Mencari data barang [${kodeQR}]...</p>
    </div>
  `;

  fetch(`${SCRIPT_URL}?action=get_detail&kode=${encodeURIComponent(kodeQR)}`)
    .then(response => response.json())
    .then(data => {
      if (data.result === "found") {
        const isTerinventaris = data.sudah_inventaris === true;

        // Simpan data di LocalStorage untuk cetak label
        localStorage.setItem("print_kode", data.kode || kodeQR);
        localStorage.setItem("print_nama", data.nama || "-");
        localStorage.setItem("print_tahun", data.tahun_perolehan || data.tahun || "-");

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

          <div style="margin-top: 20px; display: flex; gap: 8px; justify-content: center;">
            <button 
              type="button" 
              onclick="window.tampilkanHalamanScanner()"
              style="background-color: #0284c7; color: white; border: none; padding: 12px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px; width: 100%;">
              <i class="fa-solid fa-arrow-left"></i> Scan Barang Lainnya
            </button>
          </div>
        `;
      } else {
        infoDetailAset.innerHTML = `
          <div style="text-align:center; color:#ef4444; padding:20px 10px;">
            <i class="fa-solid fa-circle-xmark" style="font-size:40px;"></i>
            <p style="margin-top:10px; font-weight:bold; font-size:15px;">Kode [${kodeQR}] tidak ditemukan dalam Database!</p>
            <button 
              type="button" 
              onclick="window.tampilkanHalamanScanner()"
              style="background-color: #0284c7; color: white; border: none; padding: 12px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px; display: inline-flex; align-items: center; gap: 8px;">
              <i class="fa-solid fa-arrow-left"></i> Coba Kode Lain
            </button>
          </div>
        `;
      }
    })
    .catch(err => {
      console.error("Error Fetch:", err);
      infoDetailAset.innerHTML = `
        <div style="text-align:center; padding:20px 10px;">
          <p style="color:#ef4444; font-weight:bold;">Gagal terhubung ke Database. Periksa koneksi internet!</p>
          <button 
            type="button" 
            onclick="window.tampilkanHalamanScanner()"
            style="background-color: #0284c7; color: white; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 15px;">
            <i class="fa-solid fa-arrow-left"></i> Kembali ke Scanner
          </button>
        </div>
      `;
    });
};

// =========================================================================
// FITUR INVENTARISASI & HAPUS
// =========================================================================
window.eksekusiInventarisasi = function (kodeBarang) {
  if (!kodeBarang) return;
  if (!confirm(`Apakah Anda yakin ingin mencatat inventarisasi untuk kode: ${kodeBarang}?`)) return;

  const infoDetailAset = document.getElementById("infoDetailAset");
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
        alert("Gagal memperbarui inventaris: " + (res.message || "Kesalahan server"));
        window.prosesCekDetailAset(kodeBarang, true);
      }
    })
    .catch(err => {
      alert("Terjadi kesalahan jaringan.");
      window.prosesCekDetailAset(kodeBarang, true);
    });
};

window.hapusDataAset = function (kodeBarang) {
  if (!kodeBarang) return;
  if (!confirm(`Apakah Anda yakin ingin MENGHAPUS status inventaris untuk kode: ${kodeBarang}?`)) return;

  const infoDetailAset = document.getElementById("infoDetailAset");
  if (infoDetailAset) {
    infoDetailAset.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:#ef4444;"></i>
        <p style="margin-top:10px; color:#475569; font-weight:500;">Menghapus status inventaris...</p>
      </div>
    `;
  }

  fetch(`${SCRIPT_URL}?action=hapus_inventaris&kode=${encodeURIComponent(kodeBarang)}`)
    .then(res => res.json())
    .then(res => {
      if (res.result === "success") {
        alert("Status inventarisasi berhasil dihapus!");
        window.prosesCekDetailAset(kodeBarang, true);
      } else {
        alert("Gagal menghapus status: " + (res.message || "Kesalahan server"));
        window.prosesCekDetailAset(kodeBarang, true);
      }
    })
    .catch(err => {
      alert("Terjadi kesalahan jaringan.");
      window.prosesCekDetailAset(kodeBarang, true);
    });
};

// =========================================================================
// MODAL PIN PETUGAS & PANEL KELOLA PETUGAS
// =========================================================================
window.openPinModal = function () {
  const modalPin = document.getElementById("modalPin");
  const inputPin = document.getElementById("inputPinPetugas");
  if (modalPin) {
    modalPin.style.display = "flex";
    if (inputPin) {
      inputPin.value = "";
      inputPin.focus();
    }
  }
};

window.closePinModal = function () {
  const modalPin = document.getElementById("modalPin");
  if (modalPin) modalPin.style.display = "none";
};

window.verifikasiPin = function () {
  const inputPin = document.getElementById("inputPinPetugas");
  if (!inputPin) return;

  if (inputPin.value.trim() === PIN_PETUGAS_DEFAULT) {
    window.closePinModal();
    const panelPetugas = document.getElementById("panelPetugas");
    if (panelPetugas) {
      panelPetugas.style.display = "block";
    }

    // Jika sedang di halaman detail aset, muat ulang harga barang
    const kodePrint = localStorage.getItem("print_kode");
    if (kodePrint) {
      window.prosesCekDetailAset(kodePrint, true);
    } else {
      alert("Akses Petugas Berhasil! Silakan pinda/cari aset untuk kelola data.");
    }
  } else {
    alert("PIN Salah! Akses ditolak.");
    inputPin.value = "";
    inputPin.focus();
  }
};

window.closePanelPetugas = function () {
  const panelPetugas = document.getElementById("panelPetugas");
  if (panelPetugas) panelPetugas.style.display = "none";

  // Sembunyikan kembali informasi sensitif (harga)
  const kodePrint = localStorage.getItem("print_kode");
  if (kodePrint) {
    window.prosesCekDetailAset(kodePrint, false);
  }
};

// =========================================================================
// MODAL CETAK LAPORAN & DOKUMEN KIR
// =========================================================================
window.openModalCetakLaporan = function () {
  const modalCetak = document.getElementById("modalCetakLaporan");
  if (modalCetak) {
    modalCetak.style.display = "flex";
    window.toggleOptionRuangan();
  }
};

window.closeModalCetakLaporan = function () {
  const modalCetak = document.getElementById("modalCetakLaporan");
  if (modalCetak) modalCetak.style.display = "none";
};

window.toggleOptionRuangan = function () {
  const selectJenis = document.getElementById("selectJenisDokumen");
  const containerRuangan = document.getElementById("containerSelectRuangan");
  if (selectJenis && containerRuangan) {
    if (selectJenis.value === "KIR") {
      containerRuangan.style.display = "block";
    } else {
      containerRuangan.style.display = "none";
    }
  }
};

window.eksekusiCetakLaporan = function () {
  const selectJenis = document.getElementById("selectJenisDokumen");
  const selectRuangan = document.getElementById("selectRuanganKIR");

  if (!selectJenis) return;

  if (selectJenis.value === "ALL") {
    // Export Rekap Hasil Inventarisasi Keseluruhan (PDF)
    const urlExport = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=pdf&gid=${GID_REKAP}`;
    window.open(urlExport, "_blank");
  } else if (selectJenis.value === "KIR") {
    const ruangan = selectRuangan ? selectRuangan.value : "";
    if (!ruangan) {
      alert("Pilih ruangan target terlebih dahulu!");
      return;
    }
    
    // Redirect / Buka Cetak KIR dengan Filter Ruangan via Google Apps Script / Printable Page
    const urlKIR = `${SCRIPT_URL}?action=cetak_kir&ruangan=${encodeURIComponent(ruangan)}`;
    window.open(urlKIR, "_blank");
  }

  window.closeModalCetakLaporan();
};
