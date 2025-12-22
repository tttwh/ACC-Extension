function fmtTime(ts) {
  try { return new Date(ts).toLocaleString(); } catch (_) { return String(ts); }
}

function render(list) {
  const root = document.getElementById('list');
  root.innerHTML = '';
  if (!list || list.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = '没有结果';
    root.appendChild(empty);
    return;
  }
  list.forEach(item => {
    const card = document.createElement('div');
    card.className = 'result';
    card.setAttribute('data-id', item.id);
    
    const fullText = item.original_text || '';
    // 【新增】创建一个临时元素来剥离 HTML 标签，只获取纯文本用于预览
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullText;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // 使用剥离后的纯文本来判断长度和截取
    const isLong = plainText.length > 100; // 稍微改短一点
    const snippet = isLong ? plainText.slice(0, 100).replace(/\s+/g, ' ') : plainText;

    
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.style.marginTop = '8px';
    actions.style.display = 'flex';
    actions.style.gap = '8px';
    actions.style.justifyContent = 'flex-end';
    
    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '删除';
    deleteBtn.style.padding = '2px 6px';
    deleteBtn.style.fontSize = '11px';
    deleteBtn.style.border = '1px solid #ef4444';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.background = '#fef2f2';
    deleteBtn.style.color = '#dc2626';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('确定删除这条记录吗？')) {
        chrome.runtime.sendMessage({ type: 'ACC_DELETE_ENTRY', payload: { id: item.id } }, (resp) => {
          if (resp?.ok) doSearch(); // 重新搜索刷新列表
        });
      }
    });
    
    // 展开/收起按钮
    const expandBtn = document.createElement('button');
    expandBtn.textContent = isLong ? '展开' : '';
    expandBtn.style.padding = '2px 6px';
    expandBtn.style.fontSize = '11px';
    expandBtn.style.border = '1px solid #6b7280';
    expandBtn.style.borderRadius = '4px';
    expandBtn.style.background = '#f9fafb';
    expandBtn.style.color = '#374151';
    expandBtn.style.cursor = 'pointer';
    
    let isExpanded = false;
    const textDiv = document.createElement('div');
    textDiv.textContent = snippet + (isLong ? '…' : '');
    
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      isExpanded = !isExpanded;
      textDiv.textContent = isExpanded ? fullText : snippet + '…';
      expandBtn.textContent = isExpanded ? '收起' : '展开';
    });
    
    // 来源按钮
    const sourceBtn = document.createElement('button');
    sourceBtn.textContent = '来源';
    sourceBtn.style.padding = '2px 6px';
    sourceBtn.style.fontSize = '11px';
    sourceBtn.style.border = '1px solid #3b82f6';
    sourceBtn.style.borderRadius = '4px';
    sourceBtn.style.background = '#eff6ff';
    sourceBtn.style.color = '#2563eb';
    sourceBtn.style.cursor = 'pointer';
   // [dashboard.js] sourceBtn 点击事件 - 坐标优先版

    sourceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sourceUrl = item.source_url || item.raw?.source_url;
      
      if (sourceUrl) {
        let anchorHash = '';

        // === 策略 1: 如果有官方 ID (ChatGPT)，这是最准的 ===
        // item.meta_id 是我们刚才存进去的
        const metaId = item.meta_id || item.raw?.meta_id;
        const metaIndex = item.meta_index ?? item.raw?.meta_index; // 注意 index 可能是 0，所以用 ??

        if (metaId) {
          anchorHash = '#acc-id=' + encodeURIComponent(metaId);
        } 
        // === 策略 2: 如果没有 ID，但有座位号 (Index)，用座位号 ===
        else if (metaIndex !== undefined && metaIndex !== null && metaIndex >= 0) {
          anchorHash = '#acc-index=' + metaIndex;
        } 
        // === 策略 3: 旧数据降级方案 (DNA 文字匹配) ===
        else {
          const rawText = plainText || '';
          const dnaText = rawText.replace(/\s+/g, '');
          let fingerPrint = (dnaText.length > 200) ? dnaText.slice(30, 80) : dnaText.slice(0, 50);
          anchorHash = '#acc-highlight=' + encodeURIComponent(fingerPrint);
        }
        
        const fullUrl = sourceUrl + anchorHash;
        
        if (chrome && chrome.tabs) {
          chrome.tabs.create({ url: fullUrl });
        } else {
          window.open(fullUrl, '_blank');
        }
      }
    });
      
    actions.appendChild(deleteBtn);
    if (isLong) actions.appendChild(expandBtn);
    actions.appendChild(sourceBtn);
    
    card.innerHTML = `
      <div class="meta" style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">${fmtTime(item.timestamp)}</div>
    `;
    card.appendChild(textDiv);
    card.appendChild(actions);
    
    root.appendChild(card);
  });
}

function doSearch() {
  const kw = document.getElementById('kw').value.trim();
  chrome.runtime.sendMessage({ type: 'ACC_SEARCH', payload: { keyword: kw } }, (resp) => {
    if (resp?.ok) render(resp.results);
    else render([]);
  });
}

document.getElementById('go').addEventListener('click', doSearch);
document.getElementById('kw').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSearch();
});

const openDashboard = document.getElementById('open-dashboard');
if (openDashboard) {
  openDashboard.addEventListener('click', () => {
    const url = chrome.runtime.getURL('dashboard.html');
    chrome.tabs.create({ url });
  });
}

doSearch();