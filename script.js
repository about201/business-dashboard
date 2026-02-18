const firebaseConfig = {
    apiKey: "AIzaSyCSysTc__gQBBYtVnkm0aCvUFfknBo5mhk",
    authDomain: "business-dashboard-bc41a.firebaseapp.com",
    databaseURL: "https://business-dashboard-bc41a-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "business-dashboard-bc41a",
    storageBucket: "business-dashboard-bc41a.firebasestorage.app",
    messagingSenderId: "220314664034",
    appId: "1:220314664034:web:9ef49b3a65e7fde0fbe53b",
    measurementId: "G-PY4H3JSRQ4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
let myChart = null;

const masterBarang = [
    "Tepung Terigu", "Tepung Panir", "Mayonaise", "Susu Kental Manis", "Telur",
    "Sosis", "Tepung Tapioka", "Coklat Bubuk", "Gula Pasir", "Kaju Cheddar",
    "Selai Coklat", "Minyak Goreng", "Garam", "Matcha Bubuk", "Maizena",
    "Pasta Matcha", "Bawang Merah", "Bawang Putih", "Kemiri", "Cabe Keriting",
    "Daun Jeruk", "Sereh", "Daun Bawang", "Dada Ayam", "Kaldu Bubuk"
];

document.getElementById('btnSave').onclick = function() {
    const name = document.getElementById('itemName').value;
    const qIn = parseFloat(document.getElementById('qtyIn').value) || 0;
    const qOut = parseFloat(document.getElementById('qtyOut').value) || 0;
    const unit = document.getElementById('unit').value || 'pcs';
    const mIn = parseInt(document.getElementById('moneyIn').value) || 0;
    const mOut = parseInt(document.getElementById('moneyOut').value) || 0;

    if (!name) return alert("Nama transaksi wajib diisi!");

    db.ref('reports').push({
        name: name, qtyIn: qIn, qtyOut: qOut, unit: unit,
        moneyIn: mIn, moneyOut: mOut, timestamp: Date.now()
    }).then(() => {
        document.getElementById('itemName').value = '';
        document.getElementById('qtyIn').value = 0;
        document.getElementById('qtyOut').value = 0;
        document.getElementById('moneyIn').value = 0;
        document.getElementById('moneyOut').value = 0;
    });
};

function deleteData(id) { if (confirm("Hapus permanen data ini?")) db.ref('reports/' + id).remove(); }

// Event Listeners for Filters
['startDate', 'endDate', 'filterTime'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => db.ref('reports').once('value', renderData));
});

db.ref('reports').on('value', renderData);

function renderData(snapshot) {
    const data = snapshot.val();
    const tableBody = document.getElementById('inventoryTable');
    const stockDashboard = document.getElementById('stockDashboard');
    const filter = document.getElementById('filterTime').value;
    const sDate = document.getElementById('startDate').value; // format: YYYY-MM-DD
    const eDate = document.getElementById('endDate').value;
    
    tableBody.innerHTML = '';
    stockDashboard.innerHTML = '';

    let sisaModal = 0, uangLaba = 0, totalPengeluaran = 0;
    let chartData = {}; 
    let stockSummary = {};
    masterBarang.forEach(i => stockSummary[i] = { name: i, total: 0, lastUnit: 'pcs' });

    if (data) {
        const keys = Object.keys(data);
        keys.forEach(key => {
            const item = data[key];
            const ts = item.timestamp || Date.now();
            const d = new Date(ts);
            const dateStr = d.toISOString().split('T')[0];
            const name = item.name.toUpperCase();
            const mIn = item.moneyIn || 0;
            const mOut = item.moneyOut || 0;

            // --- GLOBAL ACCOUNTING (Dihitung dari seluruh riwayat agar saldo akurat) ---
            if (name.includes("ISI MODAL")) sisaModal += mIn;
            else if (name.includes("LABA") && name.includes("UANG")) uangLaba += mIn;
            else if (name.includes("TARIK") && name.includes("LABA")) { uangLaba -= mOut; sisaModal += mOut; }
            else { 
                if (mOut > 0) { sisaModal -= mOut; totalPengeluaran += mOut; } 
                if (mIn > 0) sisaModal += mIn; 
            }

            // STOK
            if (!name.includes("MODAL") && !name.includes("LABA")) {
                if (!stockSummary[item.name]) stockSummary[item.name] = { name: item.name, total: 0, lastUnit: item.unit };
                stockSummary[item.name].total += (item.qtyIn - item.qtyOut);
                stockSummary[item.name].lastUnit = item.unit;
            }

            // --- FILTER LOGIC ---
            let isVisible = true;
            const now = new Date();
            if (sDate && eDate) {
                if (dateStr < sDate || dateStr > eDate) isVisible = false;
            } else if (filter === 'today' && d.toDateString() !== now.toDateString()) isVisible = false;
            else if (filter === 'month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) isVisible = false;
            else if (filter === 'year' && d.getFullYear() !== now.getFullYear()) isVisible = false;

            if (isVisible) {
                // Group for Chart
                if (!chartData[dateStr]) chartData[dateStr] = { in: 0, out: 0 };
                chartData[dateStr].in += mIn;
                chartData[dateStr].out += mOut;

                // Table Render
                const timeStr = `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
                tableBody.insertAdjacentHTML('afterbegin', `
                    <tr class="text-[10px] border-b border-slate-100">
                        <td class="p-4"><div class="text-slate-400 text-[8px] uppercase">${timeStr}</div><div class="font-bold">${item.name}</div></td>
                        <td class="p-4">IN: ${item.qtyIn} | OUT: ${item.qtyOut} ${item.unit}</td>
                        <td class="p-4"><span class="text-emerald-600 font-bold">Rp ${mIn.toLocaleString()}</span><br><span class="text-rose-400">Rp ${mOut.toLocaleString()}</span></td>
                        <td class="p-4 text-center"><button onclick="deleteData('${key}')" class="text-rose-500 font-bold uppercase text-[8px] hover:underline">Hapus</button></td>
                    </tr>
                `);
            }
        });
    }

    // Update Dashboard UI
    document.getElementById('remainingCapital').innerText = `Rp ${sisaModal.toLocaleString('id-ID')}`;
    document.getElementById('totalLaba').innerText = `Rp ${uangLaba.toLocaleString('id-ID')}`;
    document.getElementById('totalSpending').innerText = `Rp ${totalPengeluaran.toLocaleString('id-ID')}`;
    document.getElementById('netBalance').innerText = `Rp ${(sisaModal + uangLaba).toLocaleString('id-ID')}`;

    // Render Stocks
    Object.values(stockSummary).sort((a,b) => b.total - a.total).forEach(info => {
        if(info.total === 0) return;
        stockDashboard.innerHTML += `
            <div class="p-2 rounded-lg border border-slate-200 text-center shadow-sm bg-white">
                <span class="block text-[7px] font-bold text-slate-400 uppercase">${info.name}</span>
                <div class="text-md font-black text-slate-800">${info.total} <span class="text-[8px] font-normal uppercase">${info.lastUnit}</span></div>
            </div>`;
    });

    updateChart(chartData);
    generateEvaluation(sisaModal, uangLaba, totalPengeluaran);
}

function updateChart(chartData) {
    const ctx = document.getElementById('salesChart').getContext('2d');
    const sortedDates = Object.keys(chartData).sort();
    const dataIn = sortedDates.map(d => chartData[d].in);
    const dataOut = sortedDates.map(d => chartData[d].out);

    if (myChart) myChart.destroy();
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [
                { label: 'Uang Masuk', data: dataIn, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.3, pointRadius: 4 },
                { label: 'Uang Keluar', data: dataOut, borderColor: '#f43f5e', tension: 0.3, pointRadius: 4 }
            ]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
        }
    });
}

function generateEvaluation(modal, laba, belanja) {
    const el = document.getElementById('evaluationContent');
    let report = "HASIL ANALISIS SISTEM:<br><br>";
    
    // Logika Evaluasi
    if (laba > belanja) {
        report += "STATUS PERFORMA: POSITIF. Laba kotor yang dihasilkan saat ini telah melampaui biaya pengeluaran bahan baku. Hal ini menunjukkan efisiensi operasional yang baik.<br>";
    } else {
        report += "STATUS PERFORMA: PERINGATAN. Biaya pengeluaran bahan baku terpantau lebih besar dibandingkan laba yang masuk. Disarankan untuk menunda pembelian inventaris non-darurat.<br>";
    }

    if (modal < 50000) {
        report += "RISIKO LIKUIDITAS: TINGGI. Sisa uang modal berada di bawah ambang batas aman. Segera lakukan penambahan modal atau pemindahan sebagian uang laba untuk menjaga kelancaran belanja operasional besok.<br>";
    } else {
        report += "RISIKO LIKUIDITAS: AMAN. Saldo modal saat ini mencukupi untuk kebutuhan operasional jangka pendek.<br>";
    }

    report += "<br>SARAN STRATEGIS: Fokuskan penjualan pada item dengan stok tertinggi. Hindari pembelanjaan barang yang masih memiliki stok di atas 10 unit guna menjaga perputaran uang tetap stabil.";

    el.innerHTML = report;
}

// Toolbar Logic
function execCmd(command, value = null) {
    document.execCommand(command, false, value);
    // Trigger input event setelah format agar tersimpan
    document.getElementById('digitalNote').dispatchEvent(new Event('input'));
}

// Real-time Notes Sync Logic
const notesRef = db.ref('digital_notes');
const noteEditor = document.getElementById('digitalNote');

// Mendengarkan perubahan dari orang lain
notesRef.on('value', (snapshot) => {
    const content = snapshot.val();
    // Hanya update jika konten berbeda untuk menghindari kursor melompat
    if (content !== null && content !== noteEditor.innerHTML) {
        noteEditor.innerHTML = content;
    }
});

// Mengirim perubahan ke Firebase setiap kali mengetik (Tanpa klik Save)
noteEditor.addEventListener('input', () => {
    const content = noteEditor.innerHTML;
    notesRef.set(content);
});

// Menghindari formatting aneh saat paste dari luar
noteEditor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
});
