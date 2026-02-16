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

const btnSave = document.getElementById('btnSave');

// FUNGSI SIMPAN
btnSave.onclick = function() {
    const name = document.getElementById('itemName').value;
    const qIn = parseInt(document.getElementById('qtyIn').value) || 0;
    const qOut = parseInt(document.getElementById('qtyOut').value) || 0;
    const mIn = parseInt(document.getElementById('moneyIn').value) || 0;
    const mOut = parseInt(document.getElementById('moneyOut').value) || 0;

    if (!name) return alert("Pilih barang terlebih dahulu!");

    db.ref('reports').push({
        name: name,
        qtyIn: qIn,
        qtyOut: qOut,
        moneyIn: mIn,
        moneyOut: mOut,
        timestamp: Date.now()
    }).then(() => {
        document.getElementById('itemName').selectedIndex = 0;
        document.getElementById('qtyIn').value = 0;
        document.getElementById('qtyOut').value = 0;
        document.getElementById('moneyIn').value = 0;
        document.getElementById('moneyOut').value = 0;
    });
};

// FUNGSI HAPUS
function deleteData(id) {
    if (confirm("Hapus data ini secara permanen dari database?")) {
        db.ref('reports/' + id).remove();
    }
}

// RENDER REAL-TIME
db.ref('reports').on('value', (snapshot) => {
    const data = snapshot.val();
    const tableBody = document.getElementById('inventoryTable');
    const stockDashboard = document.getElementById('stockDashboard');
    
    tableBody.innerHTML = '';
    stockDashboard.innerHTML = '';

    let totalModal = 0;
    let totalUangKeluar = 0;
    let stockSummary = {}; 

    if (data) {
        const keys = Object.keys(data).reverse();
        
        keys.forEach(key => {
            const item = data[key];
            totalModal += item.moneyIn;
            totalUangKeluar += item.moneyOut;

            // Hitung Stok Akhir
            if(item.name !== "LAIN-LAIN") {
                if (!stockSummary[item.name]) stockSummary[item.name] = 0;
                stockSummary[item.name] += (item.qtyIn - item.qtyOut);
            }

            // Render Log Tabel
            tableBody.innerHTML += `
                <tr class="text-xs border-b border-slate-50">
                    <td class="p-4 font-bold text-slate-700">${item.name}</td>
                    <td class="p-4">
                        <span class="text-indigo-600">IN: ${item.qtyIn}</span><br>
                        <span class="text-rose-500">OUT: ${item.qtyOut}</span>
                    </td>
                    <td class="p-4">
                        <span class="text-emerald-600">IN: ${item.moneyIn.toLocaleString()}</span><br>
                        <span class="text-slate-400">OUT: ${item.moneyOut.toLocaleString()}</span>
                    </td>
                    <td class="p-4 text-center">
                        <button onclick="deleteData('${key}')" class="btn-delete">Hapus</button>
                    </td>
                </tr>
            `;
        });

        // Render Dashboard Kartu Stok
        for (let barang in stockSummary) {
            const val = stockSummary[barang];
            stockDashboard.innerHTML += `
                <div class="stock-badge ${val < 5 ? 'low-stock' : ''}">
                    <span>${barang}</span>
                    <div>${val}</div>
                </div>
            `;
        }
    }

    document.getElementById('totalIn').innerText = `Rp ${totalModal.toLocaleString('id-ID')}`;
    document.getElementById('totalOut').innerText = `Rp ${totalUangKeluar.toLocaleString('id-ID')}`;
    document.getElementById('totalProfit').innerText = `Rp ${(totalModal - totalUangKeluar).toLocaleString('id-ID')}`;
});
