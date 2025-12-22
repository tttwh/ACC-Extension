// content-script.js
// 最终增强版：精准坐标定位 (ID/Index) + 纯净保存 + DNA搜索降级兼容

const BUTTON_CLASS = 'acc-save-btn';
const PROCESSED_SET = new WeakSet(); // 内存级防重复
let searchAttempts = 0; // 全局重试计数器

// ==========================================
// 1. 基础工具函数
// ==========================================

// 创建保存按钮
function createSaveButton() {
  const btn = document.createElement('button');
  btn.textContent = '保存到ACC';
  btn.className = BUTTON_CLASS;
  btn.style.marginTop = '6px';
  btn.style.marginLeft = '4px';
  btn.style.padding = '4px 10px';
  btn.style.fontSize = '12px';
  btn.style.border = '1px solid #e5e7eb';
  btn.style.borderRadius = '6px';
  btn.style.background = '#ffffff';
  btn.style.color = '#374151';
  btn.style.cursor = 'pointer';
  btn.style.fontWeight = '500';
  btn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
  
  btn.addEventListener('mouseenter', () => btn.style.background = '#f9fafb');
  btn.addEventListener('mouseleave', () => btn.style.background = '#ffffff');
  
  return btn;
}

// 获取纯净内容 (克隆节点，剔除按钮后再获取)
function extractAssistantText(root) {
  const clone = root.cloneNode(true);
  
  // 移除注入的按钮和工具栏
  const buttons = clone.querySelectorAll('.' + BUTTON_CLASS);
  buttons.forEach(b => b.remove());
  
  // 移除工具栏容器 (粗略匹配)
  const toolbars = clone.querySelectorAll('div[style*="z-index: 10"]'); 
  toolbars.forEach(t => t.remove());

  return clone.innerHTML || clone.innerText || '';
}

// 判断是否为用户消息 (不处理用户发的消息)
function isUserMessage(node) {
  let current = node;
  for (let i = 0; i < 8; i++) {
    if (!current || current === document.body) break;
    const cls = (current.className || '').toString().toLowerCase();
    const role = current.getAttribute('data-message-author-role');
    if (
      cls.includes('user') || 
      cls.includes('human') || 
      cls.includes('request') || 
      cls.includes('mine') || 
      cls.includes('flex-row-reverse') || 
      role === 'user'
    ) return true;
    current = current.parentElement;
  }
  return false;
}

// 高亮元素视觉效果
function highlightElement(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  element.style.transition = 'all 0.5s';
  element.style.backgroundColor = '#fef3c7'; // 亮黄色背景
  element.style.boxShadow = '0 0 0 4px #fef3c7';
  element.style.borderRadius = '4px';
  
  // 3秒后淡出
  setTimeout(() => {
    element.style.backgroundColor = '';
    element.style.boxShadow = '';
  }, 3000);
}

// ==========================================
// 2. 注入逻辑 (核心：记录坐标)
// ==========================================

function injectButtons() {
  try {
    // 定义所有支持平台的“消息气泡”选择器
    // 注意：这里的顺序和 querySelectorAll 的结果顺序至关重要
    const selectors = [
      '.ds-markdown', 
      '[data-message-author-role="assistant"]',
      '.markdown-body',
      '.assistant-message',
      '.message.assistant'
    ];

    // 获取页面上所有回复，生成“花名册”
    const nodes = document.querySelectorAll(selectors.join(','));
    
    nodes.forEach((node, index) => {
      if (!(node instanceof HTMLElement)) return;
      if (PROCESSED_SET.has(node)) return;
      
      // 已经有按钮的跳过
      if (node.querySelector('.' + BUTTON_CLASS)) {
        PROCESSED_SET.add(node);
        return;
      }
      
      // 用户消息跳过
      if (isUserMessage(node)) {
        PROCESSED_SET.add(node);
        return;
      }

      // === 核心：获取座位号和身份证号 ===
      const domIndex = index; // 座位号 (第几个回复)
      const messageId = node.getAttribute('data-message-id') || node.id || ''; // 官方ID
      // ==============================

      const toolbar = document.createElement('div');
      toolbar.style.display = 'flex';
      toolbar.style.justifyContent = 'flex-end';
      toolbar.style.marginTop = '4px';
      toolbar.style.marginBottom = '4px';
      toolbar.style.zIndex = '10';
      toolbar.style.position = 'relative';

      const btn = createSaveButton();
      
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        const original_text = extractAssistantText(node);
        if (!original_text || original_text.length < 2) return;

        const originalBtnText = btn.textContent;
        btn.textContent = 'Saving...';
        
        // === 保存 payload ===
        const payload = {
          original_text,
          timestamp: Date.now(),
          source_url: location.href,
          tags: [],
          meta_index: domIndex,       // 保存座位号
          meta_id: messageId          // 保存身份证号
        };
        
        chrome.runtime.sendMessage({ type: 'ACC_ADD_ENTRY', payload }, (resp) => {
          if (!resp?.ok) {
            btn.textContent = 'Error';
            btn.style.color = 'red';
          } else {
            btn.textContent = 'Saved ✓';
            btn.style.color = '#059669';
            setTimeout(() => {
              btn.textContent = originalBtnText;
              btn.style.color = '#374151';
            }, 2000);
          }
        });
      });
      
      toolbar.appendChild(btn);
      node.appendChild(toolbar);
      PROCESSED_SET.add(node);
    });
  } catch (err) {
    // console.error(err);
  }
}

// ==========================================
// 3. DNA 暴力搜索 (降级方案)
// ==========================================

function findAndHighlightText(fingerprint) {
  if (!fingerprint) return false;
  
  // 解码并去空格，获取 DNA
  const targetDNA = decodeURIComponent(fingerprint).replace(/\s+/g, '');
  console.log('ACC: 开始 DNA 搜索，指纹:', targetDNA);

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  while (walker.nextNode()) {
    const node = walker.currentNode;
    // 节点文本去空格
    const nodeText = (node.nodeValue || '').replace(/\s+/g, '');
    
    if (nodeText.length < 5) continue; 

    // DNA 比对
    if (nodeText.includes(targetDNA)) {
      console.log('ACC: 找到目标节点 (DNA匹配)');
      
      let target = node.parentElement;
      let depth = 0;
      // 向上找几层，找个好看的容器高亮
      while (
        target && 
        depth < 3 && 
        (target.tagName === 'SPAN' || target.tagName === 'B' || target.tagName === 'STRONG' || target.tagName === 'CODE')
      ) {
        target = target.parentElement;
        depth++;
      }
      
      if (target) {
        highlightElement(target);
        return true;
      }
    }
  }
  return false;
}

// ==========================================
// 4. 智能定位路由 (核心：策略 A/B/C)
// ==========================================

function handleSmartPositioning() {
  const hash = location.hash;
  if (!hash) return;

  // --- 策略 A: ID 定位 (ChatGPT 等) ---
  if (hash.includes('acc-id=')) {
    const id = decodeURIComponent(hash.split('acc-id=')[1]);
    console.log('ACC: 使用 ID 定位:', id);
    
    const target = document.querySelector(`[data-message-id="${id}"]`) || document.getElementById(id);
    
    if (target) {
      highlightElement(target);
    } else {
      // 没找到可能是页面没加载完
      if (searchAttempts < 5) {
        searchAttempts++;
        setTimeout(handleSmartPositioning, 1000); 
      }
    }
  }
  
  // --- 策略 B: Index 座位号定位 (通用) ---
  else if (hash.includes('acc-index=')) {
    const indexStr = hash.split('acc-index=')[1];
    const index = parseInt(indexStr, 10);
    
    const selectors = [
      '.ds-markdown', 
      '[data-message-author-role="assistant"]',
      '.markdown-body',
      '.assistant-message',
      '.message.assistant'
    ];
    
    const allAssistantNodes = document.querySelectorAll(selectors.join(','));
    console.log(`ACC: Index 定位 -> 第 ${index} 个 (共 ${allAssistantNodes.length} 个)`);

    const target = allAssistantNodes[index];
    
    if (target) {
      highlightElement(target);
      searchAttempts = 0; 
    } else {
      // Index 没找到，多试几次等待加载
      if (searchAttempts < 15) { 
         searchAttempts++;
         setTimeout(handleSmartPositioning, 1000);
      }
    }
  }
  
  // --- 策略 C: DNA 文字匹配 (旧数据兼容) ---
  else if (hash.includes('acc-highlight=')) {
    const rawVal = hash.split('acc-highlight=')[1];
    if (rawVal) {
      const highlightText = decodeURIComponent(rawVal);
      console.log('ACC: 降级使用文字定位');
      findAndHighlightText(highlightText); 
    }
  }
}

// ==========================================
// 5. 初始化与监听
// ==========================================

// 监听 URL 变化 (处理跳转)
window.addEventListener('hashchange', handleSmartPositioning);

// 页面加载完成后尝试一次定位
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(handleSmartPositioning, 1000));
} else {
  setTimeout(handleSmartPositioning, 1000);
}

// 启动按钮注入监听器 (使用 MutationObserver 应对动态加载)
const observer = new MutationObserver(() => injectButtons());
observer.observe(document.body || document.documentElement, { childList: true, subtree: true });

// 首次运行注入
setTimeout(injectButtons, 1000);

// ==========================================
// 6. 悬浮按钮 (保存用户手动选中的文字)
// ==========================================

function createFloatingSaveWidget() {
  // 防止重复创建
  if (document.getElementById('acc-floating-widget')) return;

  const wrap = document.createElement('div');
  wrap.id = 'acc-floating-widget';
  wrap.style.cssText = 'position:fixed;right:20px;bottom:20px;z-index:2147483647;display:flex;align-items:center;justify-content:center;';
  
  const btn = document.createElement('button');
  btn.textContent = '保存所选';
  // 美化样式：圆角阴影白底，和整体风格一致
  btn.style.cssText = `
    padding: 8px 16px;
    border: 1px solid #e5e7eb;
    border-radius: 20px;
    background: #ffffff;
    color: #374151;
    cursor: pointer;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s;
  `;
  
  // 鼠标悬停动效
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-1px)';
    btn.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
  });
  
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translateY(0)';
    btn.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
  });
  
  btn.onclick = () => {
     const sel = window.getSelection();
     const text = sel.toString().trim();
     
     if(text) {
         // 手动保存的内容没有“座位号” (meta_index) 和 ID，设为 null 即可
         const payload = {
            original_text: text, 
            timestamp: Date.now(), 
            source_url: location.href, 
            tags: ['Selection'],
            meta_index: null, // 标记为无座位号
            meta_id: null
         };
         
         const originalText = btn.textContent;
         btn.textContent = 'Saving...';
         
         chrome.runtime.sendMessage({type:'ACC_ADD_ENTRY', payload}, (resp) => {
             if(resp && resp.ok) {
                btn.textContent = '已保存 ✓';
                btn.style.color = '#059669';
             } else {
                btn.textContent = '失败';
                btn.style.color = 'red';
             }
             // 2秒后恢复按钮原状
             setTimeout(()=>{
                 btn.textContent = originalText;
                 btn.style.color = '#374151';
             }, 2000);
         });
     } else {
         // 如果没选文字，提示一下
         const originalText = btn.textContent;
         btn.textContent = '请先选择文字';
         btn.style.color = '#d97706';
         setTimeout(() => {
            btn.textContent = originalText;
            btn.style.color = '#374151';
         }, 1500);
     }
  };
  
  wrap.appendChild(btn);
  document.body.appendChild(wrap);
}

// 确保在最后调用一次
try { createFloatingSaveWidget(); } catch(e){}