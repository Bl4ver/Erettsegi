// ==========================================
// MARK: 1. BEÁLLÍTÁSOK (A Te szótárad)
// ==========================================
const fileMapping = {
    'irodalom-tablazat': ['adatok/irodalom-tablazat.xlsx'],
    'irodalom-munemek': ['adatok/irodalom-munemek.csv'],
    // Hibrid betöltés: Szöveg és táblázat egyszerre!
    'irodalom-mufajok': [
        'adatok/irodalom-mufajok.csv',
        'adatok/irodalom-mufajok.md'
    ],
    'tori-tablazat': ['adatok/tori-tablazat.xlsx'],
    'irodalom-korszakok': ['adatok/irodalom-korszakok.csv']
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
   const jsonStr = JSON.stringify(userStatus);
    const code = btoa(unescape(encodeURIComponent(jsonStr)));
    const input = document.getElementById('sync-code-input');
    if (input) input.value = code;
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
        // Visszafejtésnél fordítva csináljuk: atob() -> escape() -> decodeURIComponent()
        const decodedStr = decodeURIComponent(escape(atob(code)));
        const decoded = JSON.parse(decodedStr);
        userStatus = decoded;
        saveToLocal();
        location.reload(); // Frissítjük az oldalt a változásokhoz
    } catch (e) {
        alert("Hiba: Ez a kód nem érvényes vagy sérült!");
        console.error("Betöltési hiba:", e);
    }
}

function toggleStatus(id, type) {
    if (!userStatus[id]) userStatus[id] = { fontos: false, kesz: false };
    userStatus[id][type] = !userStatus[id][type];
    saveToLocal();
    
    // Csak az adott szekciót rajzoljuk újra
    const activeSubId = document.querySelector('.content-section.active').id;
    const searchInput = document.getElementById(`${activeSubId}-search-input`);
    
    // Ha van keresés/szűrés érvényben, inkább azt frissítjük, hogy ne tűnjenek el a szűrők
    if (searchInput) {
        searchInput.dispatchEvent(new Event('input'));
    } else {
        renderTable(db[activeSubId].data, activeSubId);
    }
}

// ==========================================
// MARK: 2. NAVIGÁCIÓ
// ==========================================
function openSubject(subjectName) {
    document.querySelectorAll('.main-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');

    document.querySelectorAll('.sub-nav').forEach(nav => nav.style.display = 'none');
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));

    const subNav = document.getElementById(subjectName + '-subnav');
    if (subNav) {
        subNav.style.display = 'flex';
        const firstSubBtn = subNav.querySelector('.sub-nav-btn');
        if (firstSubBtn) firstSubBtn.click();
    } else {
        const mainSec = document.getElementById(subjectName + '-main');
        if (mainSec) mainSec.classList.add('active');
    }
}

function openSubCategory(subId, subject) {
    if (event && event.currentTarget) {
        const parentNav = event.currentTarget.parentElement;
        parentNav.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
    }
    
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    const section = document.getElementById(subId);
    if (section) section.classList.add('active');

    if (fileMapping[subId]) {
        if (!db[subId] || !db[subId].loaded) {
            loadData(fileMapping[subId], subId);
        }
    }
}

// ==========================================
// MARK: 3. SZUPER-OKOS KERESŐ MOTOR
// ==========================================
function normalize(str) {
    if (!str) return '';
    let s = str.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return s.replace(/ph/g, 'f').replace(/sz/g, 's').replace(/cz/g, 'c').replace(/th/g, 't').replace(/y/g, 'i');
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
                if (qw.length < 3) continue;
                let threshold = qw.length >= 7 ? 3 : (qw.length >= 5 ? 2 : 1);
                if (levenshtein(tw, qw) <= threshold) {
                    qwMatched = true; break;
                }
                if (tw.length >= qw.length) {
                    let prefix = tw.substring(0, qw.length);
                    let prefix2 = tw.substring(0, qw.length + 1);
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
// MARK: 4. ADATOK BETÖLTÉSE (Hibrid motor)
// ==========================================
function loadData(fileList, subId) {
    const container = document.getElementById(`${subId}-table-container`);
    if (!container) return;

    container.innerHTML = '<p class="loading-text">📚 Tudásanyag összeállítása... ⏳</p>';

    // Fájlok párhuzamos letöltése
    const fetchPromises = fileList.map(filePath => {
        return fetch(filePath).then(response => {
            if (!response.ok) throw new Error(`Hiba: ${filePath}`);
            if (filePath.endsWith('.md')) return response.text().then(d => ({ type: 'md', data: d }));
            if (filePath.endsWith('.csv')) return response.text().then(d => ({ type: 'csv', data: d }));
            return response.arrayBuffer().then(d => ({ type: 'xlsx', data: d }));
        });
    });

    Promise.all(fetchPromises).then(results => {
        container.innerHTML = ''; // Konténer ürítése

        results.forEach((result, index) => {
            if (result.type === 'md') {
                // 1. MARKDOWN SZÖVEG BEILLESZTÉSE
                const textDiv = document.createElement('div');
                textDiv.className = 'text-content';
                textDiv.innerHTML = marked.parse(result.data);
                container.appendChild(textDiv);
            } else {
                // 2. TÁBLÁZAT BEILLESZTÉSE
                const tableWrapper = document.createElement('div');
                tableWrapper.className = 'table-wrapper';
                tableWrapper.id = `${subId}-wrapper-${index}`;
                container.appendChild(tableWrapper);

                let rawData;
                if (result.type === 'csv') {
                    rawData = parseCSV(result.data, ';');
                } else {
                    const workbook = XLSX.read(result.data, { type: 'array' });
                    rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
                }
                
                processAndRender(rawData, subId, tableWrapper);
            }
        });
    }).catch(err => {
        container.innerHTML = `<div class="error-text">Hiba történt a betöltéskor: ${err.message}</div>`;
    });
}

function processAndRender(rawData, subId, targetElement) {
    const headers = rawData[0].map((col, index) => col ? String(col).trim() : `Oszlop ${index + 1}`);
    const parsedData = [];
    
    for (let i = 1; i < rawData.length; i++) {
        if (rawData[i].join("").trim() !== "") {
            let rowData = {};
            headers.forEach((header, colIndex) => {
                rowData[header] = rawData[i][colIndex] !== undefined ? rawData[i][colIndex] : "";
            });
            parsedData.push(rowData);
        }
    }
    
    // Globális adatbázis frissítése (a kereső miatt)
    db[subId] = { headers: headers, data: parsedData, loaded: true };
    
    // UI felépítése az adott tárolóban
    initSearchBar(subId, headers, targetElement);
    renderTable(db[subId].data, subId, targetElement);
}

// ==========================================
// ÚJ: BOMBABIZTOS CSV OLVASÓ
// ==========================================
function parseCSV(str, delimiter = ';') {
    const result = [];
    let row = [];
    let inQuotes = false;
    let currentVal = '';

    for (let i = 0; i < str.length; i++) {
        let char = str[i];
        let nextChar = str[i + 1];

        if (char === '"' && inQuotes && nextChar === '"') {
            currentVal += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            row.push(currentVal.trim());
            currentVal = '';
        } else if ((char === '\n' || char === '\r') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++; 
            row.push(currentVal.trim());
            if (row.join('').trim() !== '') result.push(row);
            row = [];
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    row.push(currentVal.trim());
    if (row.join('').trim() !== '') result.push(row);

    return result;
}

// ==========================================
// KERESŐ SÁV
// ==========================================
function initSearchBar(subId, headers, targetElement) {
    // Ne hozzunk létre duplikált keresőt ugyanahhoz az aloldalhoz
    if (document.getElementById(`${subId}-search-section`)) return;

    const searchSec = document.createElement('div');
    searchSec.id = `${subId}-search-section`;
    searchSec.className = 'search-container';

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
    targetElement.parentNode.insertBefore(searchSec, targetElement);

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
            // JAVÍTÁS: Egyedi azonosító oszlopok összevonásával a szűrőben is
            const firstColValue = String(row[db[subId].headers[0]] || "").trim();
            const secondColValue = db[subId].headers.length > 1 ? String(row[db[subId].headers[1]] || "").trim() : "";
            const rowId = normalize(subId + firstColValue + secondColValue);
            
            const status = userStatus[rowId] || { fontos: false, kesz: false };

            if (onlyFav && !status.fontos) return false;
            if (!showDone && status.kesz) return false;

            if (col === "Minden") {
                const fullTextRow = Object.values(row).join(" ");
                return isSmartMatch(fullTextRow, query);
            } else {
                return isSmartMatch(row[col], query);
            }
        });
        
        // Frissítjük a táblázatot az aktuális targetElementben
        renderTable(filteredData, subId, targetElement);
    };

    input.addEventListener('input', filterFn);
    column.addEventListener('change', filterFn);
    favCheck.addEventListener('change', filterFn);
    doneCheck.addEventListener('change', filterFn);
}

// ==========================================
// MARK: 5. AZ "AGYBARÁT" TÁBLÁZAT GENERÁTOR
// ==========================================
function renderTable(data, subId, targetElement) {
    const container = targetElement || document.querySelector(`#${subId}-table-container .table-wrapper`) || document.getElementById(`${subId}-table-container`);
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">Nincs találat. 🕵️‍♂️</p>';
        return;
    }

    updateSyncDisplay();
    const headers = db[subId].headers;

    let tableHTML = '<div class="table-responsive"><table><thead><tr>';
    tableHTML += '<th style="width: 100px; text-align: center;">Állapot</th>';
    headers.forEach(header => { tableHTML += `<th>${header}</th>`; });
    tableHTML += '</tr></thead><tbody>';

    let currentCatId = 0; // Ezzel számozzuk a kategóriákat

    data.forEach(row => {
        const firstColValue = String(row[headers[0]] || "").trim();
        const isCategory = headers.slice(1).every(h => {
            const val = String(row[h] || "").trim();
            return val === "" || val === "-";
        });

        // Alcím / Kategória
        if (firstColValue !== "" && isCategory) {
            currentCatId++; // Növeljük a kategória sorszámát
            tableHTML += `
                <tr class="category-row" onclick="toggleCategoryRow(this, '${subId}-cat-${currentCatId}')">
                    <td colspan="${headers.length + 1}">
                        <span class="cat-icon">▼</span> ${firstColValue}
                    </td>
                </tr>`;
            return;
        }

        // JAVÍTÁS: Egyedi azonosító generálása az első ÉS második oszlop alapján (pl. Alkotó + Mű)
        const secondColValue = headers.length > 1 ? String(row[headers[1]] || "").trim() : "";
        const rowId = normalize(subId + firstColValue + secondColValue);
        
        const status = userStatus[rowId] || { fontos: false, kesz: false };
        const rowStyle = status.kesz ? 'opacity: 0.5; background: rgba(0,0,0,0.02);' : '';
        
        // Hozzáadjuk a sorhoz, hogy melyik kategóriába (alcím alá) tartozik
        const catClass = currentCatId > 0 ? `${subId}-cat-${currentCatId}` : '';

        tableHTML += `<tr class="data-row ${catClass}" style="${rowStyle}">`;

        // Állapot cella
        tableHTML += `
            <td class="status-cell" data-label="Állapot">
                <span onclick="toggleStatus('${rowId}', 'fontos')" class="star ${status.fontos ? 'active' : ''}">★</span>
                <span onclick="toggleStatus('${rowId}', 'kesz')" class="check ${status.kesz ? 'active' : ''}">✔</span>
            </td>`;

        // Adatcellák
        headers.forEach(header => {
            let rawValue = row[header];
            let contentHTML = "";
            let tdClass = "";
            let lowerHeader = header.toLowerCase();

            if (rawValue === undefined || rawValue === null || String(rawValue).trim() === '' || rawValue === '-') {
                contentHTML = `<span style="color: #bdc3c7;">&mdash;</span>`;
            } else {
                let cellValue = String(rawValue);
                contentHTML = cellValue;

                if (lowerHeader.includes('korszak')) {
                    contentHTML = `<span class="bubble-kor">${cellValue}</span>`;
                } else if (lowerHeader.includes('műfaj')) {
                    contentHTML = cellValue.split(';').map(tag => `<span class="tag-mufaj">${tag.trim()}</span>`).join(' ');
                } else if (['alkotó', 'fogalom', 'műnem'].includes(lowerHeader) || header === headers[0]) {
                    contentHTML = `<span class="text-anchor">${cellValue}</span>`;
                } else if (cellValue.length > 40 || lowerHeader.includes('tartalom') || lowerHeader.includes('elemzés')) {
                    tdClass = 'class="long-text"';
                    contentHTML = cellValue.replace(/\n/g, '<br>');
                }
            }

            tableHTML += `<td ${tdClass} data-label="${header}">${contentHTML}</td>`;
        });

        tableHTML += '</tr>';
    });

    tableHTML += '</tbody></table></div>';
    
    // Ha keresünk, csak a táblázat részt cseréljük le, ne az egész konténert
    const existingTable = container.querySelector('.table-responsive');
    if (existingTable) {
        existingTable.outerHTML = tableHTML;
    } else {
        container.innerHTML += tableHTML;
    }
}

// ==========================================
// MARK: 6. SÖTÉT MÓD KEZELÉSE
// ==========================================
const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') {
    document.body.setAttribute('data-theme', 'dark');
    const themeBtn = document.getElementById('theme-btn');
    if(themeBtn) themeBtn.innerText = '☀️';
}

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('theme-btn');

    if (body.getAttribute('data-theme') === 'dark') {
        body.removeAttribute('data-theme');
        if(themeBtn) themeBtn.innerText = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        body.setAttribute('data-theme', 'dark');
        if(themeBtn) themeBtn.innerText = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}


// ==========================================
// MARK: 7. MOBIL KÁRTYA LENYITÓ LOGIKA
// ==========================================
document.addEventListener('click', function (e) {
    const row = e.target.closest('tbody tr');
    
    if (window.innerWidth <= 800 && row) {
        // KIVÉTEL: Ha az alcímre kattintunk, ne csináljon semmit a mobil kártyákkal!
        if (row.classList.contains('category-row')) return;

        if (!e.target.classList.contains('star') && !e.target.classList.contains('check')) {
            const currentlyExpanded = row.parentElement.querySelector('.expanded');
            if (currentlyExpanded && currentlyExpanded !== row) {
                currentlyExpanded.classList.remove('expanded');
            }
            row.classList.toggle('expanded');
        }
    }
});

// KATEGÓRIÁK LENYITÁSA / ÖSSZECSUKÁSA
function toggleCategoryRow(rowElement, catGroupId) {
    rowElement.classList.toggle('collapsed');
    const isCollapsed = rowElement.classList.contains('collapsed');
    
    // Megkeressük az összes sort, ami ehhez a kategóriához tartozik
    const rows = rowElement.closest('table').querySelectorAll(`.${catGroupId}`);
    
    rows.forEach(r => {
        if (isCollapsed) {
            r.style.display = 'none'; // Elrejtés
        } else {
            r.style.display = '';     // Megjelenítés
        }
    });
}