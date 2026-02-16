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

// LIST BARANG MASTER
const masterBarang = [
    "Tepung Terigu", "Tepung Panir", "Mayonaise", "Susu Kental Manis", "Telur",
    "Sosis", "Tepung Tapioka", "Coklat Bubuk", "Gula Pasir", "Kaju Cheddar",
    "Selai Coklat", "Minyak Goreng", "Garam", "Matcha Bubuk", "Maizena",
    "Pasta Matcha", "Bawang Merah", "Bawang Putih", "Kemiri", "Cabe Keriting",
    "Daun Jeruk", "Sereh", "Daun Bawang", "Dada Ayam", "Kaldu Bubuk"
];

// FUNGSI SIMPAN
document.getElementById('btnSave').onclick = function() {
    const name = document.getElementById('itemName').value;
    const qIn = parseFloat(document.getElementById('qtyIn').value) || 0;
    const qOut = parseFloat(document.getElementById('qtyOut').value) || 0;
    const unit = document.getElementById('unit').value || 'pcs';
    const mIn = parseInt(document.getElementById('moneyIn').value) || 0;
    const mOut = parseInt(document.getElementById('moneyOut').value) || 0;

    if (!name) return alert("Pilih barang!");

    db.ref('reports').push({
        name: name,
        qtyIn: qIn,
        qtyOut: qOut,
        unit: unit,
        moneyIn: mIn,
        moneyOut: mOut,
        timestamp: Date.now()
    }).then(() => {
        // Reset hanya kolom angka
        document.getElementById('qtyIn').value = 0;
        document.getElementById('qtyOut').value = 0;
        document.getElementById('moneyIn').value = 0;
        document.getElementById('moneyOut').value = 0;
    });
};

function deleteData(id) {
    if (confirm("Hapus data ini?")) db.ref('reports/' + id).remove();
}

// RENDER REAL-TIME
db.ref('reports').on('value', (snapshot) => {
    const data = snapshot.val();
    const tableBody = document.getElementById('inventoryTable');
    const stockDashboard = document.getElementById('stockDashboard');
    
    tableBody.innerHTML = '';
    stockDashboard.innerHTML = '';

    let totalIn = 0;
    let totalOut = 0;
    
    // Inisialisasi Objek Stok
    let stockSummary = {};
    masterBarang.forEach(item => {
        stockSummary[item] = { name: item, total: 0, lastUnit: 'pcs' };
    });

    if (data) {
        const keys = Object.keys(data).reverse();
        keys.forEach(key => {
            const item = data[key];
            
            // Proteksi data kosong (undefined) agar toLocaleString tidak error
            const mIn = item.moneyIn || 0;
            const mOut = item.moneyOut || 0;
            const qIn = item.qtyIn || 0;
            const qOut = item.qtyOut || 0;

            totalIn += mIn;
            totalOut += mOut;

            if (stockSummary[item.name]) {
                stockSummary[item.name].total += (qIn - qOut);
                stockSummary[item.name].lastUnit = item.unit || 'pcs';
            }

            const d = new Date(item.timestamp || Date.now());
            const timeStr = `${d.getDate()}/${d.getMonth()+1} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;

            tableBody.innerHTML += `
                <tr class="text-[11px] border-b border-slate-100">
                    <td class="p-4">
                        <div class="text-[8px] text-slate-400 font-bold uppercase">${timeStr}</div>
                        <div class="font-bold text-slate-700">${item.name}</div>
                    </td>
                    <td class="p-4">
                        <span class="text-indigo-600 font-bold">IN: ${qIn} ${item.unit || 'pcs'}</span><br>
                        <span class="text-rose-500 font-bold">OUT: ${qOut} ${item.unit || 'pcs'}</span>
                    </td>
                    <td class="p-4">
                        <span class="text-emerald-600">IN: ${mIn.toLocaleString('id-ID')}</span><br>
                        <span class="text-rose-400">OUT: ${mOut.toLocaleString('id-ID')}</span>
                    </td>
                    <td class="p-4 text-center">
                        <button onclick="deleteData('${key}')" class="text-rose-500 font-bold">Hapus</button>
                    </td>
                </tr>
            `;
        });
    }

    // --- SORTIR: Stok Terisi Di Depan ---
    let displayList = Object.values(stockSummary);
    displayList.sort((a, b) => {
        // Jika stok > 0, taruh paling awal
        if (a.total > 0 && b.total <= 0) return -1;
        if (a.total <= 0 && b.total > 0) return 1;
        return 0; // Tetap jika keduanya sama-sama 0 atau sama-sama terisi
    });

    // Render Kartu Stok
    displayList.forEach(info => {
        const opacity = info.total === 0 ? 'opacity-40' : '';
        const lowStock = (info.total > 0 && info.total < 5) ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200';

        stockDashboard.innerHTML += `
            <div class="p-3 rounded-xl border ${lowStock} ${opacity} text-center shadow-sm">
                <span class="block text-[8px] font-bold text-slate-400 uppercase tracking-tighter">${info.name}</span>
                <div class="text-lg font-black text-slate-800">${info.total}</div>
                <span class="text-[9px] text-slate-400 uppercase">${info.lastUnit}</span>
            </div>
        `;
    });

    document.getElementById('totalIn').innerText = `Rp ${totalIn.toLocaleString('id-ID')}`;
    document.getElementById('totalOut').innerText = `Rp ${totalOut.toLocaleString('id-ID')}`;
    document.getElementById('totalProfit').innerText = `Rp ${(totalIn - totalOut).toLocaleString('id-ID')}`;
});
