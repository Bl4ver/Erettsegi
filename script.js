// ==========================================
// MARK: 1. BEÁLLÍTÁSOK (A Te szótárad)
// ==========================================
const fileMapping = {
    'irodalom-tablazat': 'adatok/irodalom-tablazat.xlsx',
    'irodalom-munemek': 'adatok/irodalom-munemek.csv',
    'tori-tablazat': 'adatok/tori-tablazat.xlsx'
};

const db = {};

// Tanulási állapot tároló
let userStatus = JSON.parse(localStorage.getItem('tanulasiAllapot')) || {};

function saveToLocal() {
    localStorage.setItem('tanulasiAllapot', JSON.stringify(userStatus));
    updateSyncDisplay();
}

// Kód generálása (Base64)
function updateSyncDisplay() {
    const code = btoa(JSON.stringify(userStatus));
    document.getElementById('sync-code-input').value = code;
}

function copySyncCode() {
    const input = document.getElementById('sync-code-input');
    input.select();
    document.execCommand('copy');
    alert("Kód lemásolva! Küldd át telefonra és illeszd be a Betöltéshez!");
}

function importSyncCode() {
    const code = document.getElementById('import-code-input').value.trim();
    if (!code) return;
    try {
        const decoded = JSON.parse(atob(code));
        userStatus = decoded;
        saveToLocal();
        location.reload(); // Frissítjük az oldalt a változásokhoz
    } catch (e) {
        alert("Hiba: Ez a kód nem érvényes!");
    }
}

function toggleStatus(id, type) {
    if (!userStatus[id]) userStatus[id] = { fontos: false, kesz: false };
    userStatus[id][type] = !userStatus[id][type];
    saveToLocal();
    // Csak az adott szekciót rajzoljuk újra, hogy ne ugorjon az oldal
    const activeSubId = document.querySelector('.content-section.active').id;
    renderTable(db[activeSubId].data, activeSubId);
}

// ==========================================
// MARK: 2. NAVIGÁCIÓ
// ==========================================
function openSubject(subjectName) {
    document.querySelectorAll('.main-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.querySelectorAll('.sub-nav').forEach(nav => nav.style.display = 'none');
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

    const subNav = document.getElementById(subjectName + '-subnav');
    if (subNav) {
        subNav.style.display = 'flex';
        const firstSubBtn = subNav.querySelector('.sub-nav-btn');
        if (firstSubBtn) firstSubBtn.click();
    } else {
        document.getElementById(subjectName + '-main').classList.add('active');
    }
}

function openSubCategory(subId, subject) {
    if (event && event.currentTarget) {
        const parentNav = event.currentTarget.parentElement;
        parentNav.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(subId).classList.add('active');

    if (fileMapping[subId]) {
        if (!db[subId] || !db[subId].loaded) {
            loadData(fileMapping[subId], subId);
        }
    }
}

// ==========================================
// MARK: 3. SZUPER-OKOS KERESŐ MOTOR (Magyar fonetikával)
// ==========================================
function normalize(str) {
    if (!str) return '';
    let s = str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Fonetikus "magyarosítás": a gyakori irodalmi és gépelési eltérések simítása
    // Így a "Szophoklész" a háttérben "sofokles" lesz, a "zopoklész" pedig "zopokles", ami már nagyon közel van!
    return s.replace(/ph/g, 'f')
        .replace(/sz/g, 's')
        .replace(/cz/g, 'c')
        .replace(/th/g, 't')
        .replace(/y/g, 'i');
}

function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    var matrix = [];
    for (var i = 0; i <= b.length; i++) { matrix[i] = [i]; }
    for (var j = 0; j <= a.length; j++) { matrix[0][j] = j; }
    for (var i = 1; i <= b.length; i++) {
        for (var j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) == a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
            else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
    }
    return matrix[b.length][a.length];
}

function isSmartMatch(text, query) {
    const normText = normalize(text);
    const normQuery = normalize(query);
    if (!normQuery) return true;
    if (normText.includes(normQuery)) return true;

    const queryWords = normQuery.split(/\s+/).filter(w => w.length > 0);
    const textWords = normText.split(/[\s,.;:!?()]+/).filter(w => w.length > 0);

    for (let qw of queryWords) {
        let qwMatched = false;
        if (normText.includes(qw)) {
            qwMatched = true;
        } else {
            for (let tw of textWords) {
                if (qw.length < 3) continue; // 3 betű alatt nem tippelgetünk, mert abból káosz lenne

                // Dinamikus hibahatár: minél hosszabb a szó, annál több elgépelést engedünk
                let threshold = qw.length >= 7 ? 3 : (qw.length >= 5 ? 2 : 1);

                // 1. Teljes szó összehasonlítása
                if (levenshtein(tw, qw) <= threshold) {
                    qwMatched = true; break;
                }

                // 2. Szótöredék vizsgálata (ha még csak a szó felét gépelted be, de abban is van hiba)
                if (tw.length >= qw.length) {
                    let prefix = tw.substring(0, qw.length);
                    let prefix2 = tw.substring(0, qw.length + 1); // Hátha kihagytál egy betűt
                    if (levenshtein(prefix, qw) <= threshold || levenshtein(prefix2, qw) <= threshold) {
                        qwMatched = true; break;
                    }
                }
            }
        }
        if (!qwMatched) return false;
    }
    return true;
}

// ==========================================
// MARK: 4. ADATOK BETÖLTÉSE ÉS KERESŐ GENERÁLÁSA
// ==========================================
function loadData(filePath, subId) {
    const container = document.getElementById(`${subId}-table-container`);
    if (container) container.innerHTML = '<p class="loading-text">📚 Agysejtek izzítása és adatok betöltése... ⏳</p>';

    fetch(filePath)
        .then(response => {
            if (!response.ok) throw new Error(`Nem találom a fájlt: ${filePath}`);

            // Ha CSV, szövegként kérjük le, ha XLSX, akkor ArrayBuffer-ként!
            if (filePath.endsWith('.csv')) {
                return response.text().then(text => ({ type: 'csv', data: text }));
            } else {
                return response.arrayBuffer().then(buffer => ({ type: 'xlsx', data: buffer }));
            }
        })
        .then(result => {
            let rawData;

            if (result.type === 'csv') {
                // Kőkemény saját CSV feldolgozó (pontosvesszőre kiképezve)
                rawData = parseCSV(result.data, ';');
            } else {
                // XLSX fájlokhoz továbbra is a SheetJS-t használjuk
                var workbook = XLSX.read(result.data, { type: 'array' });
                var worksheet = workbook.Sheets[workbook.SheetNames[0]];
                rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
            }

            if (!rawData || rawData.length === 0) {
                if (container) container.innerHTML = '<p>A táblázat teljesen üres. 📭</p>';
                return;
            }

            // 1. DINAMIKUS FEJLÉC
            const headers = rawData[0].map((col, index) => col ? String(col).trim() : `Oszlop ${index + 1}`);

            // 2. ADATOK ÖSSZEÁLLÍTÁSA
            const parsedData = [];
            for (let i = 1; i < rawData.length; i++) {
                let row = rawData[i];
                if (row.join("").trim() !== "") {
                    let rowData = {};
                    headers.forEach((header, colIndex) => {
                        rowData[header] = row[colIndex] !== undefined ? row[colIndex] : "";
                    });
                    parsedData.push(rowData);
                }
            }

            db[subId] = {
                headers: headers,
                data: parsedData,
                loaded: true
            };

            if (parsedData.length > 0) {
                initSearchBar(subId, headers, container);
            }

            renderTable(db[subId].data, subId);
        })
        .catch(error => {
            if (container) container.innerHTML = `<div class="error-text"><strong>Hiba történt:</strong> ${error.message}</div>`;
        });
}

// ==========================================
// ÚJ: SAJÁT, BOMBABIZTOS CSV OLVASÓ
// ==========================================
function parseCSV(str, delimiter = ';') {
    const result = [];
    let row = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        let nextChar = str[i + 1];

        // Ha idézőjelet találunk idézőjelen belül (ez az escape az Excelben)
        if (char === '"' && inQuotes && nextChar === '"') {
            currentVal += '"';
            i++;
        }
        // Sima idézőjel (nyit vagy zár)
        else if (char === '"') {
            inQuotes = !inQuotes;
        }
        // Szeparátor (pontosvessző), ha épp nem egy idézőjeles szöveg belsejében vagyunk
        else if (char === delimiter && !inQuotes) {
            row.push(currentVal.trim());
            currentVal = '';
        }
        // Sor vége (Enter)
        else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; // Windows sortörés átugrása
            row.push(currentVal.trim());
            if (row.join('').trim() !== '') result.push(row);
            row = [];
            currentVal = '';
        }
        // Sima karakter (pl. betűk, normál vesszők)
        else {
            currentVal += char;
        }
    }
    // Legutolsó cella hozzáadása, hogy ne vesszen el a fájl vége
    row.push(currentVal.trim());
    if (row.join('').trim() !== '') result.push(row);

    return result;
}

// A Kereső sáv dinamikus beillesztése a HTML-be
function initSearchBar(subId, headers, tableContainer) {
    if (document.getElementById(`${subId}-search-section`)) return;

    const searchSec = document.createElement('div');
    searchSec.id = `${subId}-search-section`;
    searchSec.className = 'search-container';

    // Legördülő és Keresőmező
    let html = `
        <div class="search-row">
            <select id="${subId}-search-column">
                <option value="Minden">Keresés mindenhol</option>
                ${headers.map(h => `<option value="${h}">${h}</option>`).join('')}
            </select>
            <input type="text" id="${subId}-search-input" placeholder="Keresés (elgépelve is felismeri)..." />
        </div>
        <div class="filter-row">
            <label class="filter-label">
                <input type="checkbox" id="${subId}-filter-fav"> ⭐ Csak fontosak
            </label>
            <label class="filter-label">
                <input type="checkbox" id="${subId}-filter-done" checked> ✅ Készek mutatása
            </label>
        </div>
    `;

    searchSec.innerHTML = html;
    tableContainer.parentNode.insertBefore(searchSec, tableContainer);

    // Eseményfigyelők
    const input = document.getElementById(`${subId}-search-input`);
    const column = document.getElementById(`${subId}-search-column`);
    const favCheck = document.getElementById(`${subId}-filter-fav`);
    const doneCheck = document.getElementById(`${subId}-filter-done`);

    const filterFn = () => {
        const query = input.value;
        const col = column.value;
        const onlyFav = favCheck.checked;
        const showDone = doneCheck.checked;

        const filteredData = db[subId].data.filter(row => {
            const rowId = normalize(subId + row[db[subId].headers[0]]);
            const status = userStatus[rowId] || { fontos: false, kesz: false };

            // 1. Kedvencek szűrő
            if (onlyFav && !status.fontos) return false;

            // 2. Készek szűrő (ha nincs bepipálva, elrejtjük a kész tételeket)
            if (!showDone && status.kesz) return false;

            // 3. Szöveges kereső
            if (col === "Minden") {
                const fullTextRow = Object.values(row).join(" ");
                return isSmartMatch(fullTextRow, query);
            } else {
                return isSmartMatch(row[col], query);
            }
        });
        renderTable(filteredData, subId);
    };

    input.addEventListener('input', filterFn);
    column.addEventListener('change', filterFn);
    favCheck.addEventListener('change', filterFn);
    doneCheck.addEventListener('change', filterFn);
}

// ==========================================
// MARK: 5. AZ "AGYBARÁT" TÁBLÁZAT GENERÁTOR
// ==========================================
function renderTable(data, subId) {
    const container = document.getElementById(`${subId}-table-container`);
    if (!container) return;
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">Nincs találat. 🕵️‍♂️</p>';
        return;
    }

    updateSyncDisplay(); // Frissítjük a kódot a sávban
    const headers = db[subId].headers;

    let tableHTML = '<div class="table-responsive"><table><thead><tr>';
    tableHTML += '<th style="width: 100px; text-align: center;">Állapot</th>'; // Fix szélesség
    headers.forEach(header => { tableHTML += `<th>${header}</th>`; });
    tableHTML += '</tr></thead><tbody>';

    data.forEach((row, index) => {
        // Egyedi azonosító a sornak (subId + az első oszlop tartalma)
        const rowId = normalize(subId + row[headers[0]]);
        const status = userStatus[rowId] || { fontos: false, kesz: false };

        // Ha kész, elhalványítjuk a sort
        const rowStyle = status.kesz ? 'style="opacity: 0.5; background: #f8f9fa;"' : '';

        tableHTML += `<tr ${rowStyle}>`;

        // GOMBOK CELLÁJA
        tableHTML += `
            <td class="status-cell">
                <span onclick="toggleStatus('${rowId}', 'fontos')" class="star ${status.fontos ? 'active' : ''}">★</span>
                <span onclick="toggleStatus('${rowId}', 'kesz')" class="check ${status.kesz ? 'active' : ''}">✔</span>
            </td>`;

        headers.forEach(header => {
            let rawValue = row[header];
            if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '' || rawValue === '-') {
                tableHTML += `<td style="text-align: center; color: #bdc3c7;">&mdash;</td>`;
            } else {
                let cellValue = String(rawValue);
                let contentHTML = cellValue;
                let tdClass = '';
                let lowerHeader = header.toLowerCase();

                if (lowerHeader.includes('kor') || lowerHeader.includes('kategória')) {
                    contentHTML = `<span class="bubble-kor">${cellValue}</span>`;
                } else if (['alkotó', 'évszám', 'fogalom', 'műnem'].includes(lowerHeader)) {
                    contentHTML = `<span class="text-anchor">${cellValue}</span>`;
                } else if (lowerHeader === 'műfajok' || lowerHeader === 'műfaj') {
                    contentHTML = cellValue.split(';').map(tag => `<span class="tag-mufaj">${tag.trim()}</span>`).join(' ');
                } else if (cellValue.length > 40) {
                    tdClass = 'class="long-text"';
                    contentHTML = cellValue.replace(/\n/g, '<br>');
                }
                tableHTML += `<td ${tdClass} data-label="${header}">${contentHTML}</td>`;
            }
        });
        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table></div>';
    container.innerHTML = tableHTML;
}


// ==========================================
// MARK: 6. SÖTÉT MÓD KEZELÉSE
// ==========================================

// Betöltéskor ellenőrizzük a mentett témát
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    document.getElementById('theme-btn').innerText = '☀️';
}

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-btn');
    
    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        themeBtn.innerText = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        themeBtn.innerText = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

// ==========================================
// MARK: MOBIL KÁRTYA LENYITÓ LOGIKA
// ==========================================
document.addEventListener('click', function (e) {
    // Megkeressük a legközelebbi táblázat sort (tr), amire kattintottak
    const row = e.target.closest('tbody tr');
    
    // Csak akkor fut le, ha mobilon vagyunk (768px alatt) és valódi sorra kattintottak
    if (window.innerWidth <= 768 && row) {
        // Ha nem gombra (csillag/pipa) kattintottak, akkor nyitjuk/csukjuk a kártyát
        if (!e.target.classList.contains('star') && !e.target.classList.contains('check')) {
            
            // Opcionális: a többi nyitott sort becsukja (harmonika effektus)
            const currentlyExpanded = row.parentElement.querySelector('.expanded');
            if (currentlyExpanded && currentlyExpanded !== row) {
                currentlyExpanded.classList.remove('expanded');
            }

            row.classList.toggle('expanded');
        }
    }
});