// =========================================================================
// FRONTEND SCRIPT (script.js) - SI-ASEP
// Satuan Polisi Pamong Praja Kota Serang
// =========================================================================

window.addEventListener('unhandledrejection', function(event) {
  if (event.reason && event.reason.message && event.reason.message.includes('message channel closed')) {
    event.preventDefault();
  }
});

let scannerAktif = true;
let html5QrCode = null;

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4DcVVh0ORsCAngL3PzQChef8Rzryo1Ts4e1ySKchv_WSa7d2zUY9yXWK7NgVai1yP/exec";
const PIN_PETUGAS_DEFAULT = "123456";

// Helper Keamanan String & URL Ekstraksi
function safeStr(val) {
  if (val === undefined || val === null || val === "" || val === "null") return "-";
  return String(val).trim();
}

function ekstrakKodeMurni(input) {
  if (!input) return "";
  var str = String(input).trim();

  if (str.indexOf("http://") === 0 || str.indexOf("https://") === 0) {
    try {
      var matchParam = str.match(/[?&](?:kode|id)=([^&]+)/i);
      if (matchParam && matchParam[1]) {
        return decodeURIComponent(matchParam[1]).trim();
      }
      var cleanUrl = str.split('?')[0].split('#')[0];
      var segments = cleanUrl.split('/').filter(Boolean);
      if (segments.length > 0) {
        return decodeURIComponent(segments[segments.length - 1]).trim();
      }
    } catch (e) {
      console.warn("Gagal parse URL, fallback ke string murni:", e);
    }
  }
  return str;
}

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

// Navigasi Halaman
window.tampilkanHalamanScanner = function () {
  const pageScanner = document.getElementById("page-scanner");
  const pageInformasi = document.getElementById("page-informasi");
  const inputKodeManual = document.getElementById("inputKodeManual");

  localStorage.removeItem("print_kode");
  localStorage.removeItem("print_nama");
  localStorage.removeItem("print_tahun");

  if (inputKodeManual) inputKodeManual.value = "";

  if (pageInformasi) pageInformasi.style.display = "none";
  if (pageScanner) pageScanner.style.display = "block";

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
// UNDUH EXCEL & CETAK STIKER MASSAL VIA GS
// =========================================================================
function cetakKIR() {
  var ruanganSelect = document.getElementById("selectRuanganKIR") || document.getElementById("selectRuangan");
  var ruangan = ruanganSelect ? ruanganSelect.value : "";

  if (!ruangan) {
    alert("Silakan pilih ruangan terlebih dahulu!");
    return;
  }

  const urlKIR = `${SCRIPT_URL}?action=export_kir_excel&ruangan=${encodeURIComponent(ruangan)}`;
  window.open(urlKIR, "_blank");
}

function cetakHasilInventaris() {
  const urlHasil = `${SCRIPT_URL}?action=export_hasil_excel`;
  window.open(urlHasil, "_blank");
}

window.cetakStikerMassal = function (listKode) {
  let arrayKode = [];
  
  if (Array.isArray(listKode)) {
    arrayKode = listKode;
  } else if (typeof listKode === "string" && listKode.trim() !== "") {
    arrayKode = listKode.split(",").map(k => k.trim()).filter(k => k !== "");
  }

  if (arrayKode.length === 0) {
    alert("Silakan masukkan minimal 1 Kode Barang untuk dicetak stikernya!");
    return;
  }

  const stringKodes = arrayKode.join(",");
  const urlCetak = `${SCRIPT_URL}?action=cetak_stiker_massal&kodes=${encodeURIComponent(stringKodes)}`;
  window.open(urlCetak, "_blank");
};

// =========================================================================
// PENCATATAN & UPDATE INVENTARIS
// =========================================================================
window.eksekusiInventarisasi = function(kodeBarang) {
  const kodeBersih = ekstrakKodeMurni(kodeBarang);
  if (!kodeBersih) {
    alert("Kode barang tidak valid.");
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin mencatat/meng-update status inventaris barang [${kodeBersih}]?`)) {
    return;
  }

  const btnCatat = document.getElementById("btnCatatUpdate");
  if (btnCatat) {
    btnCatat.disabled = true;
    btnCatat.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
  }

  fetch(`${SCRIPT_URL}?action=update_inventaris&kode=${encodeURIComponent(kodeBersih)}`)
    .then(res => res.json())
    .then(data => {
      if (btnCatat) {
        btnCatat.disabled = false;
        btnCatat.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Catat / Update`;
      }
      if (data.result === "success") {
        alert("BERHASIL! " + data.message);
        window.prosesCekDetailAset(kodeBersih, true);
      } else {
        alert("GAGAL: " + (data.message || "Gagal mencatat inventarisasi."));
      }
    })
    .catch(err => {
      if (btnCatat) {
        btnCatat.disabled = false;
        btnCatat.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> Catat / Update`;
      }
      console.error("Error Catat Inventaris:", err);
      alert("Terjadi kesalahan koneksi saat mencatat inventaris ke Google Sheets!");
    });
};

window.hapusDataAset = function(kodeBarang) {
  const kodeBersih = ekstrakKodeMurni(kodeBarang);
  if (!kodeBersih) {
    alert("Kode barang tidak valid.");
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin MENGHAPUS status inventarisasi dari aset [${kodeBersih}]?`)) {
    return;
  }

  fetch(`${SCRIPT_URL}?action=hapus_inventaris&kode=${encodeURIComponent(kodeBersih)}`)
    .then(res => res.json())
    .then(data => {
      if (data.result === "success") {
        alert("BERHASIL: " + data.message);
        window.prosesCekDetailAset(kodeBersih, true);
      } else {
        alert("GAGAL: " + (data.message || "Gagal menghapus inventarisasi."));
      }
    })
    .catch(err => {
      console.error("Error Hapus Inventaris:", err);
      alert("Terjadi kesalahan koneksi saat menghapus data!");
    });
};

// Inisialisasi DOM
document.addEventListener("DOMContentLoaded", function () {
  const btnStart = document.getElementById("btnStartCamera");
  const btnStop = document.getElementById("btnStopCamera");
  const inputKodeManual = document.getElementById("inputKodeManual");
  const btnCariManual = document.getElementById("btnCariManual");

  const btnCatatUpdate = document.getElementById("btnCatatUpdate");
  const btnHapusInventaris = document.getElementById("btnHapusInventaris");
  const btnCetakQR = document.getElementById("btnCetakQR");

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
      () => { }
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

  window.mulaiKamera();

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

  const inputPinPetugas = document.getElementById("inputPinPetugas");
  if (inputPinPetugas) {
    inputPinPetugas.addEventListener("keypress", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        window.verifikasiPin();
      }
    });
  }

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
        window.cetakStikerMassal([kode]);
      } else {
        alert("Scan barang terlebih dahulu untuk mencetak stiker QR Code!");
      }
    });
  }
});

// Cek Detail Aset
window.prosesCekDetailAset = function (kodeQR, tampilkanHarga = false) {
  const infoDetailAset = document.getElementById("infoDetailAset");
  if (!infoDetailAset) return;

  const kodeBersih = ekstrakKodeMurni(kodeQR);
  if (!kodeBersih) {
    alert("Kode barang tidak valid!");
    return;
  }

  window.tampilkanHalamanInformasi();

  infoDetailAset.innerHTML = `
    <div style="text-align:center; padding: 30px 10px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:36px; color:#0284c7;"></i>
      <p style="margin-top:12px; color:#475569; font-weight:bold;">Mencari data barang [${kodeBersih}]...</p>
    </div>
  `;

  const apiUrl = `${SCRIPT_URL}?action=get_detail&kode=${encodeURIComponent(kodeBersih)}&_ts=${new Date().getTime()}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (data && data.result === "found") {
        const isTerinventaris = (data.sudah_inventaris === true);

        localStorage.setItem("print_kode", data.kode || kodeBersih);
        localStorage.setItem("print_nama", data.nama || "-");
        localStorage.setItem("print_tahun", data.tahun_perolehan || data.tahun || "-");

        let teksHarga = `<span style="font-size: 13px; color: #64748b; font-weight: normal; font-style: italic;">*** (Akses via Petugas untuk lihat)</span>`;
        if (tampilkanHarga && data.harga_total !== undefined && data.harga_total !== null) {
          const numHarga = Number(data.harga_total);
          teksHarga = isNaN(numHarga) ? safeStr(data.harga_total) : `Rp ${numHarga.toLocaleString('id-ID')}`;
        }

        infoDetailAset.innerHTML = `
          <div style="margin-bottom: 15px; text-align: center;">
            <span class="info-badge-status ${isTerinventaris ? 'status-good' : 'status-bad'}">
              <i class="fa-solid ${isTerinventaris ? 'fa-circle-check' : 'fa-clock'}"></i> 
              ${isTerinventaris ? 'TER-INVENTARISASI DIGITAL' : 'BELUM DICATAT PERIODE INI'}
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
              <span class="info-value" style="font-size:13px; font-weight:500;">${safeStr(data.keterangan_aset || data.keterangan)}</span>
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
            <p style="margin-top:10px; font-weight:bold; font-size:15px;">Kode [${kodeBersih}] tidak ditemukan dalam Database!</p>
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
          <p style="color:#ef4444; font-weight:bold;">Gagal terhubung ke Database SI-ASEP.</p>
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

// Modals PIN
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
    if (panelPetugas) panelPetugas.style.display = "block";

    const kodePrint = localStorage.getItem("print_kode");
    if (kodePrint) {
      window.prosesCekDetailAset(kodePrint, true);
    } else {
      alert("Akses Petugas Berhasil!");
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

  const kodePrint = localStorage.getItem("print_kode");
  if (kodePrint) {
    window.prosesCekDetailAset(kodePrint, false);
  }
};

// Modals Laporan Excel & Stiker Massal
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

window.openModalCetakStikerMassal = function () {
  const modalStiker = document.getElementById("modalCetakStikerMassal");
  if (modalStiker) {
    modalStiker.style.display = "flex";
    const input = document.getElementById("inputKodesStikerMassal");
    if (input) {
      const kodeAktif = localStorage.getItem("print_kode");
      if (kodeAktif) input.value = kodeAktif;
      input.focus();
    }
  }
};

window.closeModalCetakStikerMassal = function () {
  const modalStiker = document.getElementById("modalCetakStikerMassal");
  if (modalStiker) modalStiker.style.display = "none";
};

window.eksekusiCetakStikerMassalModal = function () {
  const input = document.getElementById("inputKodesStikerMassal");
  if (!input || !input.value.trim()) {
    alert("Masukkan minimal 1 kode barang!");
    return;
  }
  window.cetakStikerMassal(input.value.trim());
  window.closeModalCetakStikerMassal();
};

window.toggleOptionRuangan = function () {
  const selectJenis = document.getElementById("selectJenisDokumen");
  const containerRuangan = document.getElementById("containerSelectRuangan");
  if (selectJenis && containerRuangan) {
    if (selectJenis.value === "KIR_EXCEL") {
      containerRuangan.style.display = "block";
    } else {
      containerRuangan.style.display = "none";
    }
  }
};

window.eksekusiCetakLaporan = function () {
  const selectJenis = document.getElementById("selectJenisDokumen");
  if (!selectJenis) return;

  if (selectJenis.value === "ALL_EXCEL") {
    cetakHasilInventaris();
  } else if (selectJenis.value === "KIR_EXCEL") {
    cetakKIR();
  }

  window.closeModalCetakLaporan();
};
