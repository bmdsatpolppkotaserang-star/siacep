// =========================================================================
// HELPER: EKSTRAKSI & PEMBERSIHAN KODE DARI URL / QR CODE
// =========================================================================
function ekstrakKodeMurni(input) {
  if (!input) return "";
  let str = String(input).trim();

  // 1. Jika QR Code berupa URL (misal: https://site.com/?kode=1.3.2.01.001 atau .../scan/1.3.2.01.001)
  if (str.startsWith("http://") || str.startsWith("https://")) {
    try {
      const urlObj = new URL(str);
      // Cek parameter ?kode= atau ?id=
      const paramKode = urlObj.searchParams.get("kode") || urlObj.searchParams.get("id");
      if (paramKode) return paramKode.trim();
      
      // Jika kode ada di ujung path URL (misal: .../item/1.3.2.01.001)
      const pathSegments = urlObj.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        return pathSegments[pathSegments.length - 1].trim();
      }
    } catch (e) {
      console.warn("Gagal parse URL, menggunakan string mentah:", e);
    }
  }

  return str;
}

// =========================================================================
// PROSES CEK DETAIL ASET (SUDAH DIPERBAIKI)
// =========================================================================
window.prosesCekDetailAset = function (kodeQR, tampilkanHarga = false) {
  const infoDetailAset = document.getElementById("infoDetailAset");
  if (!infoDetailAset) return;

  // Ekstrak kode murni terlebih dahulu!
  const kodeBersih = ekstrakKodeMurni(kodeQR);

  if (!kodeBersih) {
    alert("Kode barang tidak valid atau kosong!");
    return;
  }

  window.tampilkanHalamanInformasi();

  infoDetailAset.innerHTML = `
    <div style="text-align:center; padding: 30px 10px;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:36px; color:#0284c7;"></i>
      <p style="margin-top:12px; color:#475569; font-weight:bold;">Mencari data barang [${kodeBersih}]...</p>
    </div>
  `;

  // Mencegah browser caching request API dengan menambahkan timestamp (_ts)
  const apiUrl = `${SCRIPT_URL}?action=get_detail&kode=${encodeURIComponent(kodeBersih)}&_ts=${new Date().getTime()}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (data.result === "found") {
        const isTerinventaris = data.sudah_inventaris === true;

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
            <p style="margin-top:10px; font-weight:bold; font-size:15px;">Kode [${kodeBersih}] tidak ditemukan dalam Database!</p>
            <p style="font-size:12px; color:#64748b; margin-top:4px;">Pastikan kode barang sudah tercatat di Google Sheets.</p>
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
