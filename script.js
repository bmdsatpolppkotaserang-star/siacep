// =========================================================================
// DEKLARASI VARIABEL GLOBAL
// =========================================================================
let scannerAktif = true;
let html5QrCode = null;

// =========================================================================
// FUNGSI GLOBAL: KEMBALI KE HALAMAN AWAL / RESET KELUAR
// =========================================================================
window.kembaliKeAwal = function () {
  const infoDetailAset = document.getElementById("infoDetailAset");
  const inputKodeManual = document.getElementById("inputKodeManual");

  // 1. Reset Status Scanner
  scannerAktif = true;

  // 2. Kosongkan Input Manual
  if (inputKodeManual) {
    inputKodeManual.value = "";
  }

  // 3. Kembalikan Tampilan Info Detail ke Tampilan Standby/Awal
  if (infoDetailAset) {
    infoDetailAset.innerHTML = `
      <div style="text-align: center; padding: 15px 0;">
        <img src="https://api.iconify.design/lucide:qr-code.svg?color=%230284c7" alt="QR Code" style="width: 36px; height: 36px; margin: 0 auto 8px auto; display: block;" />
        <p style="color: #64748b; margin: 0; font-weight: 500;">
          Arahkan kamera ke stiker QR Code barang selanjutnya...
        </p>
      </div>
    `;
  }

  // 4. Aktifkan Kamera Kembali jika Sempat Stop/Matikan (Cek fungsi aman)
  if (typeof window.mulaiKamera === "function") {
    window.mulaiKamera();
  }

  // 5. Gulung Otomatis Layar HP Kembali ke Atas (Kamera)
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.addEventListener("DOMContentLoaded", function () {
  // =========================================================================
  // 1. PENGATURAN KONEKSI GOOGLE SHEETS & APPS SCRIPT (SI-ASEP)
  // =========================================================================
  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzw0-PJAiT52PWo9ZE0ijj-zn_iBR9K09ahGW1oK7jSIEqDrgI5hm4V08wZIpJqdsm7/exec";
  const SPREADSHEET_ID = "1ZpZtmGJyqglogaaq1vgKqp38XgvkUHP_wbMfJPp1Zwc";
  const GID_REKAP = "85327253";

  const infoDetailAset = document.getElementById("infoDetailAset");
  const btnStart = document.getElementById("btnStartCamera");
  const btnStop = document.getElementById("btnStopCamera");
  const btnResetScan = document.getElementById("btnResetScan");

  const inputKodeManual = document.getElementById("inputKodeManual");
  const btnCariManual = document.getElementById("btnCariManual");

  // Helper Sanitasi Teks
  const safeStr = (val) => (val !== undefined && val !== null && val !== "") ? val : "-";

  // =========================================================================
  // FUNGSI EFEK SUARA BEEP KHAS SCANNER
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
  // 2. INTEGRASI SCANNER KAMERA (HTML5-QRCODE)
  // =========================================================================
  if (document.getElementById("reader")) {
    html5QrCode = new Html5Qrcode("reader");
  }

  window.mulaiKamera = function() {
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
          prosesCekDetailAset(decodedText, false);
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
  if (btnResetScan) btnResetScan.onclick = window.kembaliKeAwal;

  document.addEventListener("visibilitychange", function() {
    if (document.hidden) matikanKamera();
  });

  // Jalankan kamera secara otomatis saat aplikasi dimuat
  window.mulaiKamera();

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
    prosesCekDetailAset(kodeInput, false);
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
  // 4. FUNGSI CEK DETAIL ASET & SIMPAN DATA PRINT STAGING
  // =========================================================================
  function prosesCekDetailAset(kodeQR, tampilkanHarga = false) {
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

          // PERBAIKAN: SIMPAN STRUKTUR LENGKAP BIKIN SINKRON DENGAN PRINT-LABEL.HTML
          const printItem = {
            kode: data.kode || kodeQR,
            nama: data.nama || "-",
            merk: (data.merk && data.merk !== '-') ? data.merk : "",
            tahun: data.tahun_perolehan || data.tahun || "-",
            reg: data.reg || "",
            ukuran: data.ukuran || "",
            bahan: data.bahan || ""
          };

          // Simpan format tunggal & format JSON Staging
          localStorage.setItem("print_kode", printItem.kode);
          localStorage.setItem("print_nama", printItem.nama);
          localStorage.setItem("print_tahun", printItem.tahun);
          localStorage.setItem("siasep_print_staging", JSON.stringify(printItem));

          // Format Tampilan Harga
          let teksHarga = `<span style="font-size: 13px; color: #64748b; font-weight: normal; font-style: italic;">*** (Tekan Update untuk lihat)</span>`;
          if (tampilkanHarga && data.harga_total) {
            teksHarga = `Rp ${Number(data.harga_total).toLocaleString('id-ID')}`;
          }

          infoDetailAset.innerHTML = `
            <div style="margin-bottom: 15px; text-align: center;">
              <span style="background-color: ${isTerinventaris ? '#dcfce7' : '#fef3c7'}; color: ${isTerinventaris ? '#166534' : '#92400e'}; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 13px; display: inline-block;">
                <i class="fa-solid ${isTerinventaris ? 'fa-circle-check' : 'fa-clock'}"></i> ${isTerinventaris ? 'TER-INVENTARISASI DIGITAL' : 'BELUM DICATAT PERIODE INI'}
              </span>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; word-break: break-word; overflow-wrap: anywhere;">
              
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">KODE BARANG / ID BARANG</span>
                <span style="font-size: 15px; font-weight: bold; color: #0284c7; word-break: break-all; font-family: monospace;">${safeStr(data.kode)}</span>
              </div>

              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">NAMA BARANG / MERK / REG</span>
                <span style="font-size: 14px; font-weight: 600; color: #1e293b;">${safeStr(data.nama)} ${data.merk && data.merk !== '-' ? ' - ' + data.merk : ''} (Reg: ${safeStr(data.reg)})</span>
              </div>

              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">SPESIFIKASI & TAHUN</span>
                <span style="font-size: 13px; color: #334155;">Ukuran: ${safeStr(data.ukuran)} | Bahan: ${safeStr(data.bahan)} | Tahun: ${safeStr(data.tahun_perolehan || data.tahun)}</span>
              </div>

              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">NOMOR LEGALITAS / KENDARAAN</span>
                <span style="font-size: 13px; color: #334155;">Pabrik: ${safeStr(data.no_pabrik)} | Rangka: ${safeStr(data.no_rangka)} | Mesin: ${safeStr(data.no_mesin)} | Polisi: ${safeStr(data.no_polisi)} | BPKB: ${safeStr(data.no_bpkb)}</span>
              </div>

              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">KONDISI & STATUS ASET</span>
                <span style="font-size: 13px; color: #334155;">${safeStr(data.kondisi_status)} (Status: ${safeStr(data.status_aset)})</span>
              </div>

              <!-- NILAI / HARGA BARANG -->
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; background-color: ${tampilkanHarga ? '#f0fdf4' : 'transparent'}; padding: 8px; border-radius: 6px;">
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">NILAI / HARGA BARANG</span>
                <span style="font-size: 14px; font-weight: bold; color: #166534;">
                  ${teksHarga}
                </span>
              </div>

              <div>
                <span style="font-size: 11px; color: #64748b; font-weight: 700; display: block;">KETERANGAN DOKUMEN</span>
                <span style="font-size: 13px; color: #334155;">${safeStr(data.keterangan_aset)}</span>
              </div>

            </div>

            <div style="margin-top: 15px; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              <button 
                type="button" 
                onclick="eksekusiInventarisasi('${data.kode}')"
                style="background-color: #0284c7; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px;">
                <i class="fa-solid fa-pen-to-square"></i> Update / Catat Inventaris
              </button>

              <button 
                type="button" 
                onclick="bukaCetakStikerLabel('${data.kode}')"
                style="background-color: #059669; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px;">
                <i class="fa-solid fa-qrcode"></i> Cetak Stiker QR
              </button>

              ${isTerinventaris ? `
                <button 
                  type="button" 
                  onclick="hapusDataAset('${data.kode}')"
                  style="background-color: #ef4444; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px;">
                  <i class="fa-solid fa-trash-can"></i> Hapus Status
                </button>
              ` : ''}

              <button 
                type="button" 
                onclick="window.kembaliKeAwal()"
                style="background-color: #64748b; color: white; border: none; padding: 10px 16px; border-radius: 8px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-size: 13px; width: 100%; justify-content: center; margin-top: 5px;">
                <i class="fa-solid fa-arrow-left"></i> Keluar / Scan Barang Lain
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
                <i class="fa-solid fa-arrow-left"></i> Kembali / Coba Lagi
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
  }

  // =========================================================================
  // 5. FUNGSI UPDATE INVENTARIS
  // =========================================================================
  window.eksekusiInventarisasi = function(kodeBarang) {
    const pinInput = prompt("🔒 Khusus Petugas Aset:\nMasukkan PIN Petugas untuk mencatat status & membuka Rincian Nilai:");
    
    if (pinInput === null || pinInput.trim() === "") {
      alert("Akses dibatalkan.");
      return;
    }

    infoDetailAset.innerHTML = `
      <div style="text-align:center; padding: 20px;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:#0284c7;"></i>
        <p style="margin-top:10px; color:#475569; font-weight:500;">Memverifikasi PIN & mencatat inventarisasi...</p>
      </div>
    `;

    fetch(`${SCRIPT_URL}?action=scan_inventaris&kode=${encodeURIComponent(kodeBarang)}&pin=${encodeURIComponent(pinInput.trim())}`)
      .then(response => response.json())
      .then(res => {
        if (res.result === "wrong_pin") {
          alert("❌ PIN Petugas Salah! Data gagal diperbarui.");
          prosesCekDetailAset(kodeBarang, false);
          return;
        }

        if (res.result === "found") {
          const hargaFormatted = res.harga_total 
            ? 'Rp ' + Number(res.harga_total).toLocaleString('id-ID') 
            : 'Tidak Tercatat';

          alert(`✅ BERHASIL DICATAT!\n\nNama Barang: ${res.nama || '-'}\nKode Barang: ${kodeBarang}\nNilai/Harga Aset: ${hargaFormatted}`);
          
          prosesCekDetailAset(kodeBarang, true);
        } else {
          alert("Gagal memperbarui data.");
          prosesCekDetailAset(kodeBarang, false);
        }
      })
      .catch(err => {
        alert("Gagal terhubung ke server.");
        prosesCekDetailAset(kodeBarang, false);
      });
  };

  // =========================================================================
  // 6. FUNGSI HAPUS STATUS INVENTARIS
  // =========================================================================
  window.hapusDataAset = function(kodeBarang) {
    const pinInput = prompt("🔒 Khusus Petugas Aset:\nMasukkan PIN Petugas untuk menghapus status:");
    
    if (pinInput === null || pinInput.trim() === "") {
      alert("Penghapusan dibatalkan.");
      return;
    }

    if (!confirm(`Yakin ingin menghapus status inventarisasi Kode: ${kodeBarang}?`)) return;

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
          prosesCekDetailAset(kodeBarang, false);
          return;
        }

        if (res.result === "success") {
          alert("Status inventarisasi berhasil dihapus!");
          prosesCekDetailAset(kodeBarang, false);
        } else {
          alert("Gagal menghapus status.");
          prosesCekDetailAset(kodeBarang, false);
        }
      })
      .catch(err => {
        alert("Gagal terhubung ke server.");
        prosesCekDetailAset(kodeBarang, false);
      });
  };

  // =========================================================================
  // 7. FUNGSI MEMBUKA HALAMAN CETAK STIKER LABEL QR
  // =========================================================================
  window.bukaCetakStikerLabel = function(kodeBarang) {
    const kode = localStorage.getItem("print_kode") || kodeBarang;
    if (!kode) {
      alert("Pilih atau cari barang terlebih dahulu!");
      return;
    }
    // Buka jendela cetak label
    window.open("print-label.html", "_blank", "width=500,height=400");
  };

  // =========================================================================
  // 8. FITUR REKAPITULASI & KEAMANAN DOWNLOAD
  // =========================================================================
  const btnDownloadRekap = document.getElementById('btnDownloadRekap');
  if (btnDownloadRekap) {
    btnDownloadRekap.addEventListener('click', function() {
      const pinInput = prompt("🔒 Khusus Petugas Aset:\nMasukkan PIN Petugas untuk mengunduh rekap Excel:");
      
      if (pinInput === null || pinInput.trim() === "") {
        alert("Download dibatalkan.");
        return;
      }

      fetch(`${SCRIPT_URL}?action=verify_pin&pin=${encodeURIComponent(pinInput.trim())}`)
        .then(response => response.json())
        .then(res => {
          if (res.result === "success") {
            const downloadUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=xlsx&gid=${GID_REKAP}`;
            window.open(downloadUrl, '_blank');
          } else {
            alert("❌ PIN Petugas Salah! Akses download ditolak.");
          }
        })
        .catch(err => {
          alert("Gagal terhubung ke server untuk verifikasi PIN.");
        });
    });
  });
});

// Registrasi Service Worker PWA SI-ASEP
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA SI-ASEP Aktif:', reg.scope))
      .catch(err => console.error('PWA Gagal:', err));
  });
}
