(() => {
  const $ = id => document.getElementById(id);

  const state = {
    S: [],
    T: [],
    keyStream: [],
    ksaHistory: [],
    prgaHistory: []
  };

  const keyInput = $('keyInput');
  const sizeSelect = $('sizeSelect');
  const msgInput = $('msgInput');
  const initBtn = $('initBtn');
  const encryptBtn = $('encryptBtn');
  const decryptBtn = $('decryptBtn');
  const S_table = $('S-table');
  const T_table = $('T-table');
  const prga_S_table = $('prga-S-table');
  const keystreamDiv = $('keystream');
  const ksaInfo = $('ksaInfo');
  const prgaInfo = $('prgaInfo');
  const xorWrap = $('xorTableWrap');
  const ksaIterTable = $('ksaIterTable');
  const prgaIterTable = $('prgaIterTable');

  function buildInitialST(key, size) {
    const S = [...Array(size).keys()];
    const T = [];
    for (let i = 0; i < size; i++) {
      T.push(key.charCodeAt(i % key.length) || 0);
    }
    return { S, T };
  }

  function buildKSAHistory(key, size) {
    const { S: S0, T } = buildInitialST(key, size);
    const S = S0.slice();
    const history = [];
    let j = 0;
    for (let i = 0; i < size; i++) {
      const before = S.slice();
      j = (j + S[i] + T[i]) % size;
      const displayedJ = j;
      const Si_val = before[i];
      const Ti_val = T[i];
      const Ti_chr = (Ti_val >= 32 && Ti_val <= 126) ? String.fromCharCode(Ti_val) : '';
      const after = before.slice();
      [after[i], after[j]] = [after[j], after[i]];
      history.push({
        i, j, displayedJ, Si_val, Ti_val, Ti_chr, S_before: before, S_after: after
      });
      [S[i], S[j]] = [S[j], S[i]];
    }
    return { history, finalS: S, T };
  }

  function buildPRGAHistory(initialS, n) {
    const S = initialS.slice();
    const history = [];
    let i = 0, j = 0;
    for (let step = 0; step < n; step++) {
      i = (i + 1) % S.length;
      j = (j + S[i]) % S.length;
      [S[i], S[j]] = [S[j], S[i]];
      const t = (S[i] + S[j]) % S.length;
      const ks = S[t];
      history.push({
        step, i, j, Si: S[i], Sj: S[j], t, kt: ks, S_snapshot: S.slice()
      });
    }
    return history;
  }

  function renderArrayTable(tableElem, arr, highlight = []) {
    tableElem.innerHTML = '';
    if (!arr || arr.length === 0) return;
    
    const headerRow = document.createElement('tr');
    headerRow.appendChild(Object.assign(document.createElement('th'), { textContent: 'i' }));
    arr.forEach((_, idx) => {
      const th = document.createElement('th');
      th.textContent = idx;
      headerRow.appendChild(th);
    });
    tableElem.appendChild(headerRow);

    const valueRow = document.createElement('tr');
    valueRow.appendChild(Object.assign(document.createElement('th'), { textContent: 'valor' }));
    arr.forEach((val, idx) => {
      const td = document.createElement('td');
      td.textContent = val;
      if (highlight.includes(idx)) td.classList.add('highlight');
      valueRow.appendChild(td);
    });
    tableElem.appendChild(valueRow);
  }

  function renderTTable(tableElem, arr) {
    tableElem.innerHTML = '';
    if (!arr || arr.length === 0) return;
    
    const headerRow = document.createElement('tr');
    headerRow.appendChild(Object.assign(document.createElement('th'), { textContent: 'i' }));
    arr.forEach((_, idx) => {
      const th = document.createElement('th');
      th.textContent = idx;
      headerRow.appendChild(th);
    });
    tableElem.appendChild(headerRow);

    const valueRow = document.createElement('tr');
    valueRow.appendChild(Object.assign(document.createElement('th'), { textContent: 'T[i]' }));
    arr.forEach((val, idx) => {
      const td = document.createElement('td');
      td.textContent = val;
      valueRow.appendChild(td);
    });
    tableElem.appendChild(valueRow);
  }

  function renderKsaIterTable(history) {
    ksaIterTable.innerHTML = '';
    if (!history || history.length === 0) return;
    
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    ['Iteración', 'J', 'S[i]', 'T[i]', 'T(chr)', 'S antes', 'S después'].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    ksaIterTable.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    history.forEach(step => {
      const tr = document.createElement('tr');
      const sBefore = JSON.stringify(step.S_before);
      const sAfter = JSON.stringify(step.S_after);
      const cells = [
        step.i,
        step.displayedJ,
        step.Si_val,
        step.Ti_val,
        step.Ti_chr || '',
        sBefore,
        sAfter
      ];
      cells.forEach(c => {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    ksaIterTable.appendChild(tbody);
  }

  function renderPrgaIterTable(history) {
    prgaIterTable.innerHTML = '';
    if (!history || history.length === 0) return;
    
    const thead = document.createElement('thead');
    const hrow = document.createElement('tr');
    ['k', 'i', 'j', 'S[i]', 'S[j]', 't', 'S[t]', 'S (estado)'].forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      hrow.appendChild(th);
    });
    thead.appendChild(hrow);
    prgaIterTable.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    history.forEach(step => {
      const tr = document.createElement('tr');
      const sState = JSON.stringify(step.S_snapshot);
      const cells = [
        step.step,
        step.i,
        step.j,
        step.Si,
        step.Sj,
        step.t,
        step.kt,
        sState
      ];
      cells.forEach(c => {
        const td = document.createElement('td');
        td.textContent = c;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    prgaIterTable.appendChild(tbody);
  }

  function renderXorTable(msg, keystream) {
    xorWrap.innerHTML = '';
    if (!keystream || keystream.length === 0) return;

    const table = document.createElement('table');
    table.className = 'xor-table';
    
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Pos', 'Carácter', 'ASCII', 'KeyStream', 'XOR', 'Resultado'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (let i = 0; i < msg.length; i++) {
      const char = msg[i];
      const ascii = msg.charCodeAt(i);
      const ks = keystream[i];
      const xor = ascii ^ ks;
      const result = (xor >= 32 && xor <= 126) ? String.fromCharCode(xor) : `\\x${xor.toString(16).padStart(2, '0')}`;
      
      const row = document.createElement('tr');
      [i, char, ascii, ks, xor, result].forEach(value => {
        const td = document.createElement('td');
        td.textContent = value;
        row.appendChild(td);
      });
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    xorWrap.appendChild(table);
  }

  // Event Listeners
  initBtn.addEventListener('click', () => {
    const key = keyInput.value;
    const size = parseInt(sizeSelect.value);
    const msg = msgInput.value;
    
    // Ejecutar KSA
    const { history: ksaHistory, finalS, T } = buildKSAHistory(key, size);
    state.S = finalS;
    state.T = T;
    state.ksaHistory = ksaHistory;
    
    // Ejecutar PRGA
    const n = Math.max(1, msg.length);
    const prgaHistory = buildPRGAHistory(finalS, n);
    state.prgaHistory = prgaHistory;
    state.keyStream = prgaHistory.map(h => h.kt);
    
    // Renderizar resultados
    const initialST = buildInitialST(key, size);
    renderArrayTable(S_table, initialST.S);
    renderTTable(T_table, T);
    renderArrayTable(prga_S_table, prgaHistory[prgaHistory.length - 1].S_snapshot);
    keystreamDiv.textContent = state.keyStream.join(', ');
    
    // Renderizar tablas iterativas
    renderKsaIterTable(ksaHistory);
    renderPrgaIterTable(prgaHistory);
    
    ksaInfo.textContent = `KSA completado. ${ksaHistory.length} iteraciones.`;
    prgaInfo.textContent = `PRGA generó ${state.keyStream.length} bytes de keystream.`;
    xorWrap.innerHTML = '';
  });

  encryptBtn.addEventListener('click', () => {
    if (state.keyStream.length === 0) {
      initBtn.click();
      return;
    }
    
    const msg = msgInput.value;
    renderXorTable(msg, state.keyStream);
  });

  decryptBtn.addEventListener('click', () => {
    encryptBtn.click();
  });

  // Initialize on load
  window.addEventListener('load', () => {
    initBtn.click();
  });
})();
