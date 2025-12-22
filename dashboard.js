// dashboard.js

const userProfile = {
  name: 'Evelyn Chen',
  gender: 'Female',
  role: 'AI Knowledge Curator',
  email: 'evelyn.chen@acc.app',
  location: 'Hangzhou · China',
  avatar: 'https://api.dicebear.com/7.x/notionists/svg?seed=Evelyn',
  skills: ['Prompt Design', 'Knowledge Ops', 'AI Workflows']
};

const state = {
  entries: [],
  filter: 'all',
  view: 'grid',
  search: '',
  mode: 'signIn',
  isLoggedIn: false,
  resetEmail: '', // Store reset password email
  isEditingName: false, // Name editing state
  currentUserEmail: '', // Store current user email
  selectedIds: new Set(),
};

// Element selectors
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const gridView = document.getElementById('grid-view');
const helpView = document.getElementById('help-view');
const settingsView = document.getElementById('settings-view');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const supportAvatar = document.getElementById('support-avatar');
const supportName = document.getElementById('support-name');
const supportMeta = document.getElementById('support-meta');

// Authentication related elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const mainActionBtn = document.getElementById('main-action-btn');
const statusMessage = document.getElementById('status-message');

// Reset password related elements
const resetEmailInput = document.getElementById('reset-email');
const resetPasswordInput = document.getElementById('reset-password');
const resetConfirmPasswordInput = document.getElementById('reset-confirm-password');

// Step elements
const signinStep = document.getElementById('signin-step');
const signupStep = document.getElementById('signup-step');
const resetStep1 = document.getElementById('reset-step-1');
const resetStep2 = document.getElementById('reset-step-2');

// MOCK API - Fixed reset password issue
function getMockUsers() {
  const usersStr = localStorage.getItem('mockUsers');
  if (!usersStr) {
    // Initialize default users
    const defaultUsers = [
      { email: userProfile.email, password: 'StrongPassword123' }
    ];
    localStorage.setItem('mockUsers', JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(usersStr);
}

function saveMockUsers(users) {
  localStorage.setItem('mockUsers', JSON.stringify(users));
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function mockApiLogin(email, password) {
  await delay(500);
  const users = getMockUsers();
  const user = users.find(u => u.email === email);
  if (!user) return { ok: false, error: 'Account not found. Please sign up first.' };
  if (user.password !== password) return { ok: false, error: 'Incorrect password.' };
  
  // Save current user email
  state.currentUserEmail = email;
  localStorage.setItem('currentUserEmail', email);
  
  // Load user profile from localStorage or use default
  const savedName = localStorage.getItem('userName') || userProfile.name;
  const savedGender = localStorage.getItem('userGender') || userProfile.gender;
  const savedAvatar = localStorage.getItem('userAvatar') || userProfile.avatar;
  
  const currentUserProfile = {
    ...userProfile,
    name: savedName,
    gender: savedGender,
    avatar: savedAvatar,
    email: email
  };
  
  return { ok: true, user: currentUserProfile };
}

async function mockApiSignUp(email, password) {
  await delay(500);
  const users = getMockUsers();
  if (users.find(u => u.email === email)) {
    return { ok: false, error: 'This email is already registered.' };
  }
  if (!/[A-Z]/.test(password) || password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters and contain one uppercase letter.' };
  }
  users.push({ email, password });
  saveMockUsers(users);
  return { ok: true };
}

async function mockApiResetPassword(email, newPassword) {
  await delay(500);
  const users = getMockUsers();
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex === -1) return { ok: false, error: 'Account not found for password reset.' };
  if (!/[A-Z]/.test(newPassword) || newPassword.length < 8) {
    return { ok: false, error: 'New password must be at least 8 characters and contain one uppercase letter.' };
  }
  users[userIndex].password = newPassword;
  saveMockUsers(users);
  return { ok: true };
}

// Helper functions
function displayMessage(elementId, text, isError = false) {
  const messageElement = document.getElementById(elementId);
  if (messageElement) {
    messageElement.textContent = text;
    messageElement.style.color = isError ? 'var(--apple-red)' : 'var(--apple-green)';
    if (text) {
      setTimeout(() => {
        messageElement.textContent = '';
        messageElement.style.color = '';
      }, 5000);
    }
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.top = '20px';
  toast.style.right = '20px';
  toast.style.background = type === 'success' ? '#10b981' : 
                          type === 'error' ? '#ef4444' : 
                          type === 'warning' ? '#f59e0b' : '#3b82f6';
  toast.style.color = 'white';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.fontSize = '14px';
  toast.style.zIndex = '2147483647';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  toast.style.transition = 'opacity 0.3s ease';
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 300);
  }, 2000);
}

// Jump highlight function
function highlightElement(element) {
  element.classList.add('highlight');
  setTimeout(() => {
    element.classList.remove('highlight');
  }, 1500);
}

// Switch authentication step
function switchAuthStep(stepName) {
  // Hide all steps
  signinStep.classList.remove('active');
  signupStep.classList.remove('active');
  resetStep1.classList.remove('active');
  resetStep2.classList.remove('active');

  const lockStep = document.getElementById('lock-step');
  if (lockStep) lockStep.classList.remove('active');
  
  // Show specified step
  let stepElement;
  switch(stepName) {
    case 'signin':
      stepElement = signinStep;
      break;
    case 'signup':
      stepElement = signupStep;
      break;
    case 'reset1':
      stepElement = resetStep1;
      break;
    case 'reset2':
      stepElement = resetStep2;
      break;
    case 'lock':
      stepElement = lockStep;
      break;
  }
  
  if (stepElement) {
    stepElement.classList.add('active');
    highlightElement(stepElement);
    
    // Auto focus on first input
    const firstInput = stepElement.querySelector('input');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  displayMessage('status-message', '');
  
  if (!email || !password) {
    displayMessage('status-message', 'Please fill in all fields', true);
    return;
  }
  
  const result = await mockApiLogin(email, password);
  if (result.ok) {
    state.isLoggedIn = true;
    state.currentUserEmail = email;
    
    // Save login state
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('currentUserEmail', email);
    
    await renderDashboard();
    dashboardView.classList.add('active');
    loginView.classList.remove('active');
    hydrateProfile();
    loadSavedProfile(); // Load saved avatar and nickname
    showToast('Login successful!', 'success');
  } else {
    displayMessage('status-message', result.error, true);
  }
}

// Handle signup
async function handleSignup(e) {
  e.preventDefault();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirmPassword = document.getElementById('signup-confirm-password').value;
  
  displayMessage('signup-message', '');
  
  if (!email || !password || !confirmPassword) {
    displayMessage('signup-message', 'Please fill in all fields', true);
    return;
  }
  
  if (password !== confirmPassword) {
    displayMessage('signup-message', 'Passwords do not match', true);
    highlightElement(document.getElementById('signup-confirm-password'));
    return;
  }
  
  const result = await mockApiSignUp(email, password);
  if (result.ok) {
    displayMessage('signup-message', 'Sign up successful! Please sign in.', false);
    setTimeout(() => {
      switchAuthStep('signin');
      emailInput.value = email;
      highlightElement(emailInput);
    }, 1500);
  } else {
    displayMessage('signup-message', result.error, true);
  }
}

// Handle reset password step 1: Send reset link
async function handleResetStep1(e) {
  e.preventDefault();
  const email = resetEmailInput.value.trim();
  
  displayMessage('reset-message-1', '');
  
  if (!email) {
    displayMessage('reset-message-1', 'Please enter your email address', true);
    highlightElement(resetEmailInput);
    return;
  }
  
  // Simulate sending reset email
  displayMessage('reset-message-1', `Sending reset link to ${email}...`, false);
  
  setTimeout(() => {
    // Store email and go to step 2
    state.resetEmail = email;
    switchAuthStep('reset2');
    displayMessage('reset-message-2', 'Please enter your new password');
    highlightElement(resetPasswordInput);
  }, 1500);
}

// Handle reset password step 2: Set new password
async function handleResetStep2(e) {
  e.preventDefault();
  const newPassword = resetPasswordInput.value;
  const confirmPassword = resetConfirmPasswordInput.value;
  
  displayMessage('reset-message-2', '');
  
  if (!newPassword || !confirmPassword) {
    displayMessage('reset-message-2', 'Please fill in both password fields', true);
    if (!newPassword) highlightElement(resetPasswordInput);
    if (!confirmPassword) highlightElement(resetConfirmPasswordInput);
    return;
  }
  
  if (newPassword !== confirmPassword) {
    displayMessage('reset-message-2', 'Passwords do not match', true);
    highlightElement(resetPasswordInput);
    highlightElement(resetConfirmPasswordInput);
    return;
  }
  
  const result = await mockApiResetPassword(state.resetEmail, newPassword);
  if (result.ok) {
    displayMessage('reset-message-2', 'Password reset successful! Please sign in.', false);
    setTimeout(() => {
      switchAuthStep('signin');
      emailInput.value = state.resetEmail;
      highlightElement(emailInput);
      state.resetEmail = '';
    }, 2000);
  } else {
    displayMessage('reset-message-2', result.error, true);
  }
}

// Record rendering and operations
// dashboard.js - 完整替换 renderEntries 函数

async function renderEntries(entries) {
  const container = document.getElementById('entries-container');
  if (!container) return;

  container.innerHTML = '';
  const placeholder = document.getElementById('loading-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  if (!entries || entries.length === 0) {
    container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); margin-top: 50px;">No entries found.</div>';
    return;
  }

  // 遍历每一条记录 (item 必须在这个循环里才有效)
  entries.forEach(item => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    const entryId = item.id || item.raw?.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    card.setAttribute('data-id', entryId);
    
    // --- 新逻辑：处理 HTML 内容、表格和公式 ---
    // 1. 获取原始内容 (HTML)
    const fullHtml = item.original_text || item.fullText || item.desc || '';
    
    if (fullHtml.includes('<table') || fullHtml.includes('<th')) {
      card.classList.add('full-width');
    }

    // 2. 创建临时元素剥离标签，生成纯文本预览 (这样预览时不会显示 <table> 等代码)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = fullHtml;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    
    // 3. 判断长度
    const isLong = plainText.length > 150;
    const snippet = isLong ? plainText.slice(0, 150) + '...' : plainText;
    // --- 新逻辑结束 ---
    
    // Load saved title
    const savedTitle = localStorage.getItem(`entry_title_${entryId}`);
    const displayTitle = savedTitle || item.title || 'Untitled';
    
 // 创建卡片结构 (修正版)
    card.innerHTML = `
      <div class="card-header" style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 12px;">
        <input type="checkbox" class="entry-checkbox" data-id="${entryId}" style="width: 18px; height: 18px; margin-top: 4px; cursor: pointer;">
        
        <div style="flex: 1; min-width: 0;">
           <div class="card-title" style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="font-size: 18px; font-weight: 600; cursor: pointer; min-height: 24px;">
                <span class="card-title-text">${displayTitle}</span>
                <input type="text" class="card-title-edit" value="${displayTitle}" style="display: none; width: 100%; padding: 4px 8px; border: 1px solid #d4d4d8; border-radius: 4px; font-size: 18px; font-weight: 600;">
                <i class="fas fa-edit edit-title-btn" style="font-size: 14px; color: #6b7280; cursor: pointer; margin-left: 8px;"></i>
              </div>
              <div class="card-meta-tag" style="padding: 4px 12px; background: #f3f4f6; border-radius: 20px; font-size: 12px; color: #6b7280; white-space: nowrap; margin-left: 8px;">${item.tag || 'General'}</div>
           </div>
        </div>
      </div>
      
      <div class="card-desc">${snippet}</div>
      
      <div class="card-meta" style="margin-top: 10px;">
        <i class="far fa-clock"></i> ${new Date(item.timestamp).toLocaleString()}
      </div>
    `;
    
    // 按钮区域
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'card-actions';
    actionsDiv.style.display = 'flex';
    actionsDiv.style.gap = '8px';
    actionsDiv.style.justifyContent = 'flex-end';
    actionsDiv.style.marginTop = 'auto';
    
    // 展开按钮
    const expandBtn = document.createElement('button');
    expandBtn.className = 'btn';
    expandBtn.innerHTML = '<i class="fas fa-expand-alt" style="margin-right: 4px;"></i>' + (isLong ? 'Expand' : '');
    expandBtn.style.padding = '6px 12px';
    expandBtn.style.fontSize = '12px';
    expandBtn.style.border = '1px solid #d1d5db';
    expandBtn.style.borderRadius = '6px';
    expandBtn.style.background = '#f9fafb';
    expandBtn.style.color = '#374151';
    expandBtn.style.cursor = 'pointer';
    
    // 删除按钮
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn';
    deleteBtn.innerHTML = '<i class="fas fa-trash-alt" style="margin-right: 4px;"></i>Delete';
    deleteBtn.style.padding = '6px 12px';
    deleteBtn.style.fontSize = '12px';
    deleteBtn.style.border = '1px solid #ef4444';
    deleteBtn.style.borderRadius = '6px';
    deleteBtn.style.background = '#fef2f2';
    deleteBtn.style.color = '#dc2626';
    deleteBtn.style.cursor = 'pointer';
    
    // 来源按钮
    const sourceBtn = document.createElement('button');
    sourceBtn.className = 'btn';
    sourceBtn.innerHTML = '<i class="fas fa-external-link-alt" style="margin-right: 4px;"></i>Source';
    sourceBtn.style.padding = '6px 12px';
    sourceBtn.style.fontSize = '12px';
    sourceBtn.style.border = '1px solid #3b82f6';
    sourceBtn.style.borderRadius = '6px';
    sourceBtn.style.background = '#eff6ff';
    sourceBtn.style.color = '#2563eb';
    sourceBtn.style.cursor = 'pointer';
    
    const descDiv = card.querySelector('.card-desc');
    let isExpanded = false;
    
    // 展开/收起 逻辑 (这里处理 HTML 和 公式渲染)
    if (isLong) {
      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        isExpanded = !isExpanded;
        
        if (isExpanded) {
          // 展开时：显示完整的 HTML (包括表格、公式)
          descDiv.innerHTML = fullHtml; 
          // 渲染数学公式 (如果有 MathJax)
          if (window.MathJax) {
            window.MathJax.typesetPromise([descDiv]).catch((err) => console.log(err));
          }
        } else {
          // 收起时：显示纯文本预览
          descDiv.textContent = snippet;
        }
        
        expandBtn.innerHTML = `<i class="fas fa-${isExpanded ? 'compress-alt' : 'expand-alt'}" style="margin-right: 4px;"></i>${isExpanded ? 'Collapse' : 'Expand'}`;
      });
    } else {
      expandBtn.style.display = 'none';
    }
    
    // 删除逻辑
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to delete this record?')) {
        const idToDelete = item.id || item.raw?.id;
        // 调用后台删除
        chrome.runtime.sendMessage({ type: 'ACC_DELETE_ENTRY', payload: { id: idToDelete } }, (resp) => {
           if (resp?.ok) {
             // 从本地数组移除
             const idx = state.entries.findIndex(e => (e.id || e.raw?.id) === idToDelete);
             if (idx > -1) {
                state.entries.splice(idx, 1);
                localStorage.removeItem(`entry_title_${entryId}`);
                renderEntries(state.entries);
                showToast('Record deleted', 'success');
             }
           }
        });
      }
    });
    
    // 来源跳转逻辑

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

    const checkbox = card.querySelector('.entry-checkbox');
    checkbox.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.selectedIds.add(entryId);
        card.style.borderColor = 'var(--apple-blue)'; // 选中高亮边框
        card.style.background = '#f0f9ff';
      } else {
        state.selectedIds.delete(entryId);
        card.style.borderColor = '#e5e7eb'; // 恢复边框
        card.style.background = '#ffffff';
      }
      updateBatchBtnState();
    });
    
    actionsDiv.appendChild(expandBtn);
    actionsDiv.appendChild(deleteBtn);
    actionsDiv.appendChild(sourceBtn);
    card.appendChild(actionsDiv);
    
    container.appendChild(card);
  });
  
  // Reinitialize functionalities
  initEntryTitleEditing();
  updateCardButtonsForDarkMode();
}

// [dashboard.js] 新增批量操作相关函数

// 更新批量删除按钮的显示状态
function updateBatchBtnState() {
  const btn = document.getElementById('batch-delete-btn');
  const countSpan = document.getElementById('selected-count');
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  
  if (btn && countSpan) {
    const count = state.selectedIds.size;
    countSpan.textContent = count;
    
    if (count > 0) {
      btn.style.display = 'inline-flex';
      btn.style.alignItems = 'center';
      btn.style.gap = '6px';
    } else {
      btn.style.display = 'none';
    }
  }
  
  // 更新全选框状态：如果选中的数量等于当前显示的数量，则全选框打钩
  if (selectAllCheckbox) {
    const visibleEntries = document.querySelectorAll('.grid-card').length;
    selectAllCheckbox.checked = visibleEntries > 0 && state.selectedIds.size === visibleEntries;
  }
}

// 初始化批量操作监听器
function initBatchActions() {
  // 1. 全选/取消全选
  const selectAllCheckbox = document.getElementById('select-all-checkbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const checkboxes = document.querySelectorAll('.entry-checkbox');
      
      checkboxes.forEach(cb => {
        cb.checked = isChecked;
        const card = cb.closest('.grid-card');
        const id = cb.dataset.id;
        
        if (isChecked) {
          state.selectedIds.add(id);
          if (card) {
            card.style.borderColor = 'var(--apple-blue)';
            card.style.background = '#f0f9ff';
          }
        } else {
          state.selectedIds.delete(id);
          if (card) {
            card.style.borderColor = '#e5e7eb';
            card.style.background = '#ffffff';
          }
        }
      });
      updateBatchBtnState();
    });
  }

  // 2. 批量删除按钮
  const batchDeleteBtn = document.getElementById('batch-delete-btn');
  if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', async () => {
      const count = state.selectedIds.size;
      if (count === 0) return;

      if (confirm(`Are you sure you want to delete ${count} selected items?`)) {
        const idsToDelete = Array.from(state.selectedIds);
        
        chrome.runtime.sendMessage({ type: 'ACC_BATCH_DELETE', payload: { ids: idsToDelete } }, (resp) => {
          if (resp?.ok) {
            showToast(`${count} items deleted`, 'success');
            // 从本地状态移除
            state.entries = state.entries.filter(e => !state.selectedIds.has(e.id || e.raw?.id));
            state.selectedIds.clear();
            renderEntries(state.entries); // 重新渲染
            updateBatchBtnState();
          } else {
            showToast('Delete failed: ' + resp?.error, 'error');
          }
        });
      }
    });
  }

  // 3. 一键清空按钮
  const clearAllBtn = document.getElementById('clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      // 这里的清空针对的是数据库里的所有数据，还是当前筛选出的数据？
      // 通常 "Clear All" 意味着清空整个数据库。
      const entryCount = state.entries.length;
      if (entryCount === 0) {
        showToast('No entries to clear', 'info');
        return;
      }

      if (confirm(`⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to delete ALL ${entryCount} entries?\nThis action cannot be undone!`)) {
        // 为了安全，要求二次确认
        if (confirm('Really delete everything?')) {
           chrome.runtime.sendMessage({ type: 'ACC_CLEAR_ALL_ENTRIES' }, (resp) => {
             if (resp?.ok) {
               state.entries = [];
               renderEntries([]);
               showToast('All data cleared', 'success');
             } else {
               showToast('Failed to clear data', 'error');
             }
           });
        }
      }
    });
  }
}

// Search function
async function handleSearch() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  
  if (!searchTerm) {
    renderEntries(state.entries);
    return;
  }
  
  const filtered = state.entries.filter(item => {
    const savedTitle = localStorage.getItem(`entry_title_${item.id || item.raw?.id}`);
    const displayTitle = savedTitle || item.title || '';
    
    const titleMatch = displayTitle.toLowerCase().includes(searchTerm);
    const descMatch = (item.desc || '').toLowerCase().includes(searchTerm);
    const tagMatch = (item.tag || '').toLowerCase().includes(searchTerm);
    const textMatch = (item.original_text || item.fullText || '').toLowerCase().includes(searchTerm);
    
    return titleMatch || descMatch || tagMatch || textMatch;
  });
  
  renderEntries(filtered);
}

// Load data from background
async function loadEntriesFromBackground() {
  return new Promise((resolve) => {
    if (chrome && chrome.runtime) {
      chrome.runtime.sendMessage({ type: 'ACC_SEARCH', payload: { keyword: '' } }, (resp) => {
        if (resp?.ok) {
          resolve(resp.results || []);
        } else {
          resolve([]);
        }
      });
    } else {
      resolve([]);
    }
  });
}

async function renderDashboard() {
  state.entries = await loadEntriesFromBackground();
  
  // Use sample data if no data
  if (state.entries.length === 0) {
    state.entries = [];
  }
  
  renderEntries(state.entries);
  
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  document.getElementById('nav-grid').classList.add('active');

  gridView.style.display = 'block';
  helpView.style.display = 'none';
  settingsView.style.display = 'none';
}

function hydrateProfile() {
  // Load user information from localStorage
  const savedName = localStorage.getItem('userName') || userProfile.name;
  const savedGender = localStorage.getItem('userGender') || userProfile.gender;
  const savedAvatar = localStorage.getItem('userAvatar') || userProfile.avatar;
  const savedEmail = localStorage.getItem('currentUserEmail') || userProfile.email;
  
  // Update user profile
  userProfile.name = savedName;
  userProfile.gender = savedGender;
  userProfile.avatar = savedAvatar;
  userProfile.email = savedEmail;
  state.currentUserEmail = savedEmail;
  
  // Update UI
  if (supportAvatar) supportAvatar.src = userProfile.avatar;
  if (supportName) supportName.textContent = userProfile.name;
  updateGenderDisplay();
  updateGenderSelection(userProfile.gender);
}

// Avatar upload related functions
function initAvatarUpload() {
  const avatarOverlay = document.getElementById('avatar-upload-overlay');
  const avatarInput = document.getElementById('avatar-file-input');
  const chooseFileBtn = document.getElementById('choose-file-btn');
  const uploadModal = document.getElementById('upload-modal');
  const avatarPreview = document.getElementById('avatar-preview');
  const saveAvatarBtn = document.getElementById('save-avatar-btn');
  const cancelUploadBtn = document.getElementById('cancel-upload-btn');
  const supportAvatar = document.getElementById('support-avatar');
  
  let selectedFile = null;

  // Open upload modal
  avatarOverlay.addEventListener('click', () => {
    uploadModal.classList.add('active');
    avatarPreview.src = supportAvatar.src;
    selectedFile = null;
  });

  // Choose file button
  chooseFileBtn.addEventListener('click', () => {
    avatarInput.click();
  });

  // File selection event
  avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type and size
      if (!file.type.match('image.*')) {
        showToast('Please select an image file', 'error');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast('Image size cannot exceed 5MB', 'error');
        return;
      }
      
      selectedFile = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarPreview.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Save avatar
  saveAvatarBtn.addEventListener('click', () => {
    if (!selectedFile) {
      showToast('Please select an image first', 'error');
      return;
    }

    // Create compressed avatar
    compressAndSetAvatar(selectedFile);
    uploadModal.classList.remove('active');
  });

  // Cancel upload
  cancelUploadBtn.addEventListener('click', () => {
    uploadModal.classList.remove('active');
    selectedFile = null;
  });

  // Click modal background to close
  uploadModal.addEventListener('click', (e) => {
    if (e.target === uploadModal) {
      uploadModal.classList.remove('active');
      selectedFile = null;
    }
  });
}

// Compress and set avatar
function compressAndSetAvatar(file) {
  const supportAvatar = document.getElementById('support-avatar');
  const MAX_WIDTH = 400; // Maximum width
  const MAX_HEIGHT = 400; // Maximum height
  const QUALITY = 0.8; // Image quality
  
  supportAvatar.classList.add('uploading');
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      
      // Calculate scaling ratio
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to base64 and set as avatar
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          supportAvatar.src = e.target.result;
          supportAvatar.classList.remove('uploading');
          showToast('Avatar updated successfully', 'success');
          
          // Save to localStorage
          localStorage.setItem('userAvatar', e.target.result);
          userProfile.avatar = e.target.result;
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', QUALITY);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// Name editing function
function initNameEditing() {
  const editNameBtn = document.getElementById('edit-name-btn');
  const supportName = document.getElementById('support-name');
  const profileNameDisplay = document.getElementById('profile-name-display');
  
  editNameBtn.addEventListener('click', () => {
    if (state.isEditingName) return;
    
    state.isEditingName = true;
    const currentName = supportName.textContent;
    
    // Create input field
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'profile-name-input';
    input.value = currentName;
    input.maxLength = 20;
    
    // Replace display text with input field
    profileNameDisplay.innerHTML = '';
    profileNameDisplay.appendChild(input);
    input.focus();
    input.select();
    
    // Save function
    const saveName = () => {
      const newName = input.value.trim();
      if (newName && newName !== currentName) {
        supportName.textContent = newName;
        userProfile.name = newName;
        showToast('Nickname updated', 'success');
        
        // Save to localStorage
        localStorage.setItem('userName', newName);
      }
      
      // Restore display
      profileNameDisplay.innerHTML = `
        <span id="support-name">${supportName.textContent}</span>
        <i class="fas fa-edit" id="edit-name-btn" style="font-size: 12px; color: #6b7280; cursor: pointer;"></i>
      `;
      
      state.isEditingName = false;
      initNameEditing(); // Rebind events
    };
    
    // Enter to save
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveName();
      } else if (e.key === 'Escape') {
        // Cancel editing
        profileNameDisplay.innerHTML = `
          <span id="support-name">${currentName}</span>
          <i class="fas fa-edit" id="edit-name-btn" style="font-size: 12px; color: #6b7280; cursor: pointer;"></i>
        `;
        state.isEditingName = false;
        initNameEditing();
      }
    });
    
    // Blur to save
    input.addEventListener('blur', () => {
      setTimeout(saveName, 100);
    });
  });
}

// Gender selection function
function initGenderSelection() {
  const genderOptions = document.querySelectorAll('.gender-option');
  
  // Load saved gender
  const savedGender = localStorage.getItem('userGender');
  if (savedGender) {
    userProfile.gender = savedGender;
    updateGenderSelection(savedGender);
    updateGenderDisplay();
  } else {
    updateGenderSelection(userProfile.gender);
  }
  
  // Gender option click
  genderOptions.forEach(option => {
    option.addEventListener('click', (e) => {
      const selectedGender = option.dataset.value;
      userProfile.gender = selectedGender;
      localStorage.setItem('userGender', userProfile.gender);
      updateGenderSelection(selectedGender);
      updateGenderDisplay();
      showToast(`Gender updated to ${userProfile.gender}`, 'success');
    });
  });
}

// Update gender selection state
function updateGenderSelection(selectedGender) {
  const genderOptions = document.querySelectorAll('.gender-option');
  genderOptions.forEach(option => {
    const genderBox = option.querySelector('.gender-box');
    const genderText = option.querySelector('.gender-text');
    
    if (option.dataset.value === selectedGender) {
      option.classList.add('selected');
      genderBox.classList.add('selected');
      genderText.style.color = document.body.classList.contains('dark-mode') ? '#60a5fa' : 'var(--apple-blue)';
      genderText.style.fontWeight = '600';
    } else {
      option.classList.remove('selected');
      genderBox.classList.remove('selected');
      genderText.style.color = document.body.classList.contains('dark-mode') ? '#9ca3af' : 'var(--text-secondary)';
      genderText.style.fontWeight = 'normal';
    }
  });
}

// Update gender display
function updateGenderDisplay() {
  if (supportMeta) {
    supportMeta.textContent = `${userProfile.role} · ${userProfile.gender}`;
  }
}

// Record title editing function
function initEntryTitleEditing() {
  // Delegate event listener because cards are dynamically generated
  document.addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-title-btn');
    if (editBtn) {
      e.stopPropagation();
      const cardHeader = editBtn.closest('.card-header');
      const titleText = cardHeader.querySelector('.card-title-text');
      const editInput = cardHeader.querySelector('.card-title-edit');
      const card = cardHeader.closest('.grid-card');
      const entryId = card.dataset.id;
      
      // Switch to edit mode
      titleText.style.display = 'none';
      editInput.style.display = 'block';
      editInput.focus();
      editInput.select();
      
      // Save function
      const saveTitle = () => {
        const newTitle = editInput.value.trim() || 'Untitled';
        titleText.textContent = newTitle;
        
        // Save to localStorage (permanently saved)
        localStorage.setItem(`entry_title_${entryId}`, newTitle);
        showToast('Title updated', 'success');
        
        titleText.style.display = 'inline';
        editInput.style.display = 'none';
        
        // Update entry in state
        const entryIndex = state.entries.findIndex(entry => {
          const currentId = entry.id || entry.raw?.id;
          return currentId && currentId.toString() === entryId.toString();
        });
        
        if (entryIndex !== -1) {
          state.entries[entryIndex].title = newTitle;
        }
      };
      
      // Enter to save
      editInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveTitle();
        } else if (e.key === 'Escape') {
          titleText.style.display = 'inline';
          editInput.style.display = 'none';
        }
      });
      
      // Blur to save
      editInput.addEventListener('blur', () => {
        setTimeout(saveTitle, 100);
      });
    }
  });
  
  // Load saved titles
  state.entries.forEach((entry, index) => {
    const entryId = entry.id || entry.raw?.id;
    if (entryId) {
      const savedTitle = localStorage.getItem(`entry_title_${entryId}`);
      if (savedTitle) {
        state.entries[index].title = savedTitle;
      }
    }
  });
}

// Settings page functions
function renderSettingsView() {
  // Load saved font size
  const savedFontSize = localStorage.getItem('fontSize');
  if (savedFontSize) {
    document.getElementById('font-size-slider').value = savedFontSize;
    updateFontSize(savedFontSize);
  }
  
  // Load saved theme
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    setTheme(savedTheme);
  }
}

// Network latency test - using your provided method
function initLatencyTest() {
  const testBtn = document.getElementById('test-latency-btn');
  const latencyResult = document.getElementById('latency-result');
  const latencyProgress = document.getElementById('latency-progress');
  const latencyBar = document.getElementById('latency-bar');
  
  testBtn.addEventListener('click', async () => {
    latencyResult.textContent = 'Testing...';
    latencyProgress.style.display = 'block';
    latencyBar.style.width = '0%';
    
    let totalLatency = 0;
    const tests = 3; // Reduce test count for speed
    const testUrls = [
      'https://www.google.com/favicon.ico',
      'https://www.baidu.com/favicon.ico',
      'https://www.cloudflare.com/favicon.ico'
    ];
    
    for (let i = 0; i < tests; i++) {
      const startTime = performance.now();
      
      try {
        // Use more reliable test method
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch(testUrls[i], {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        const endTime = performance.now();
        const latency = endTime - startTime;
        totalLatency += latency;
        
        // Update progress bar
        latencyBar.style.width = `${((i + 1) / tests) * 100}%`;
      } catch (error) {
        console.error('Network test error:', error);
        // If test fails, use an estimated value
        totalLatency += 300; // Assume 300ms latency
        latencyBar.style.width = `${((i + 1) / tests) * 100}%`;
      }
    }
    
    const avgLatency = Math.round(totalLatency / tests);
    let latencyColor = '#34C759'; // Green
    let latencyStatus = 'Excellent';
    
    if (avgLatency > 100) {
      latencyColor = '#F59E0B'; // Orange
      latencyStatus = 'Good';
    }
    if (avgLatency > 300) {
      latencyColor = '#EF4444'; // Red
      latencyStatus = 'Poor';
    }
    
    latencyResult.innerHTML = `
      <span style="color: ${latencyColor};">${latencyStatus}</span> · 
      Average latency: <strong>${avgLatency}ms</strong>
    `;
    
    // Save result
    localStorage.setItem('lastLatencyTest', JSON.stringify({
      time: new Date().toISOString(),
      latency: avgLatency,
      status: latencyStatus
    }));
    
    // Hide progress bar after 1 second
    setTimeout(() => {
      latencyProgress.style.display = 'none';
    }, 1000);
  });
}

// Font size control - globally applied
// ==================== 修复开始 ====================

// 1. 把 updateFontSize 变成全局函数（放在最外面，任何地方都能用）
function updateFontSize(size) {
  const fontSizeValue = document.getElementById('font-size-value');
  const fontPreview = document.getElementById('font-preview');
  
  // 更新显示的数值
  if (fontSizeValue) fontSizeValue.textContent = `${size}px`;
  // 更新预览区域
  if (fontPreview) fontPreview.style.fontSize = `${size}px`;
  
  // 更新全局 CSS 变量（这行最重要，控制整个页面的字号）
  document.documentElement.style.setProperty('--base-font-size', `${size}px`);
  
  // 强制重新计算所有元素的字体大小
  document.querySelectorAll('*').forEach(el => {
    // 忽略那些已经使用了 var() 变量的，只处理固定像素的
    if (el.style.fontSize && !el.style.fontSize.includes('var')) {
      const rootSizeStr = getComputedStyle(document.documentElement).getPropertyValue('--base-font-size');
      const rootSize = parseInt(rootSizeStr.replace('px', '') || 14);
      const currentSize = parseFloat(el.style.fontSize);
      // 这里的逻辑可以根据需求保留或简化，关键是上面的 setProperty
    }
  });
}

// 2. 初始化滑块控制（只负责监听滑块拖动）
function initFontSizeControl() {
  const fontSizeSlider = document.getElementById('font-size-slider');
  
  if (fontSizeSlider) {
    // 监听滑块拖动
    fontSizeSlider.addEventListener('input', (e) => {
      updateFontSize(e.target.value);
      // 保存设置到本地
      localStorage.setItem('fontSize', e.target.value);
    });
    
    // 初始化时加载保存的值
    const savedSize = localStorage.getItem('fontSize') || '14';
    fontSizeSlider.value = savedSize;
    // 初始化应用一次
    updateFontSize(savedSize);
  }
}

// ==================== 修复结束 ====================

// Theme control
function initThemeControl() {
  const themeOptions = document.querySelectorAll('.theme-option');
  
  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      setTheme(theme);
      
      // Update selected state
      themeOptions.forEach(opt => {
        if (opt === option) {
          opt.style.borderColor = '#007AFF';
        } else {
          opt.style.borderColor = document.body.classList.contains('dark-mode') ? '#374151' : '#e5e7eb';
        }
      });
    });
  });
  
  // Check current theme
  const currentTheme = localStorage.getItem('theme') || 'light';
  themeOptions.forEach(option => {
    if (option.dataset.theme === currentTheme) {
      option.style.borderColor = '#007AFF';
    }
  });
}

// Set theme
function setTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-mode');
    
    // Update Change Avatar modal
    const uploadModal = document.querySelector('.upload-modal-content');
    if (uploadModal) {
      uploadModal.style.background = '#1f2937';
      uploadModal.style.borderColor = '#374151';
      uploadModal.style.color = '#ffffff';
    }
    
    // Update user info area
    const profileName = document.querySelector('.profile-name');
    if (profileName) profileName.style.color = '#ffffff';
    
    const supportName = document.getElementById('support-name');
    if (supportName) supportName.style.color = '#ffffff';
    
    const genderTexts = document.querySelectorAll('.gender-text');
    genderTexts.forEach(text => {
      text.style.color = '#9ca3af';
    });
    
    // Update card buttons
    updateCardButtonsForDarkMode();
    
  } else {
    document.body.classList.remove('dark-mode');
    
    // Restore Change Avatar modal
    const uploadModal = document.querySelector('.upload-modal-content');
    if (uploadModal) {
      uploadModal.style.background = '';
      uploadModal.style.borderColor = '';
      uploadModal.style.color = '';
    }
    
    // Restore user info area
    const profileName = document.querySelector('.profile-name');
    if (profileName) profileName.style.color = '';
    
    const supportName = document.getElementById('support-name');
    if (supportName) supportName.style.color = '';
    
    const genderTexts = document.querySelectorAll('.gender-text');
    genderTexts.forEach(text => {
      text.style.color = '';
    });
    
    // Restore card buttons
    updateCardButtonsForDarkMode();
  }
  
  localStorage.setItem('theme', theme);
}

// Ensure card buttons have correct styles in Dark mode
function updateCardButtonsForDarkMode() {
  const isDarkMode = document.body.classList.contains('dark-mode');
  const cardButtons = document.querySelectorAll('.card-actions .btn');
  
  cardButtons.forEach((btn, index) => {
    if (isDarkMode) {
      if (index === 1) { // Delete button
        btn.style.background = '#7f1d1d';
        btn.style.borderColor = '#991b1b';
        btn.style.color = '#fecaca';
      } else if (index === 2) { // Source button
        btn.style.background = '#1e3a8a';
        btn.style.borderColor = '#2563eb';
        btn.style.color = '#dbeafe';
      } else { // Expand button
        btn.style.background = '#374151';
        btn.style.borderColor = '#4b5563';
        btn.style.color = '#ffffff';
      }
    } else {
      // Reset to light mode styles
      if (index === 1) { // Delete button
        btn.style.background = '#fef2f2';
        btn.style.borderColor = '#ef4444';
        btn.style.color = '#dc2626';
      } else if (index === 2) { // Source button
        btn.style.background = '#eff6ff';
        btn.style.borderColor = '#3b82f6';
        btn.style.color = '#2563eb';
      } else { // Expand button
        btn.style.background = '#f9fafb';
        btn.style.borderColor = '#d1d5db';
        btn.style.color = '#374151';
      }
    }
  });
}

// Load saved avatar and nickname
function loadSavedProfile() {
  const savedAvatar = localStorage.getItem('userAvatar');
  const savedName = localStorage.getItem('userName');
  const savedGender = localStorage.getItem('userGender');
  const savedTheme = localStorage.getItem('theme');
  const savedFontSize = localStorage.getItem('fontSize');
  const savedEmail = localStorage.getItem('currentUserEmail');
  const supportAvatar = document.getElementById('support-avatar');
  const supportName = document.getElementById('support-name');
  
  // Update user profile
  if (savedName) {
    userProfile.name = savedName;
  }
  
  if (savedGender) {
    userProfile.gender = savedGender;
  }
  
  if (savedAvatar) {
    userProfile.avatar = savedAvatar;
  }
  
  if (savedEmail) {
    userProfile.email = savedEmail;
    state.currentUserEmail = savedEmail;
  }
  
  // Update UI
  if (supportAvatar) {
    supportAvatar.src = userProfile.avatar;
  }
  
  if (supportName) {
    supportName.textContent = userProfile.name;
  }
  
  updateGenderSelection(userProfile.gender);
  updateGenderDisplay();
  
  // Apply saved theme
  if (savedTheme === 'dark') {
    setTheme('dark');
  }
  
  // Apply saved font size
  if (savedFontSize) {
    document.getElementById('font-size-slider').value = savedFontSize;
    updateFontSize(savedFontSize);
  }
}

// Delete account function
function initDeleteAccount() {
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  
  if (!deleteAccountBtn) return;
  
  deleteAccountBtn.addEventListener('click', () => {
    // Show confirmation dialog
    if (confirm('Are you sure you want to delete your account? This will permanently remove all your saved entries and settings. This action cannot be undone.')) {
      // User confirmed - delete all data
      deleteAllUserData();
      
      // Log out and return to login page
      state.isLoggedIn = false;
      state.currentUserEmail = '';
      dashboardView.classList.remove('active');
      loginView.classList.add('active');
      switchAuthStep('signin');
      
      // Clear form fields
      emailInput.value = '';
      passwordInput.value = '';
      
      showToast('Account deleted successfully. All data has been removed.', 'success');
    }
  });
}

// Delete all user data
function deleteAllUserData() {
  // Get current user email before clearing
  const currentUserEmail = localStorage.getItem('currentUserEmail') || userProfile.email;
  
  // Clear localStorage data - including user account
  const keysToKeep = []; // Don't keep anything
  const allKeys = Object.keys(localStorage);
  
  allKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Clear IndexedDB data
  clearIndexedDBData();
  
  // Remove user from mockUsers
  const users = JSON.parse(localStorage.getItem('mockUsers') || '[]');
  const updatedUsers = users.filter(user => user.email !== currentUserEmail);
  localStorage.setItem('mockUsers', JSON.stringify(updatedUsers));
  
  // Reset user profile to default
  userProfile.name = 'Evelyn Chen';
  userProfile.gender = 'Female';
  userProfile.avatar = 'https://api.dicebear.com/7.x/notionists/svg?seed=Evelyn';
  userProfile.email = 'evelyn.chen@acc.app';
  
  // Reset state
  state.currentUserEmail = '';
  state.isLoggedIn = false;
  
  // Reset UI
  if (supportAvatar) supportAvatar.src = userProfile.avatar;
  if (supportName) supportName.textContent = userProfile.name;
  updateGenderSelection(userProfile.gender);
  updateGenderDisplay();
  
  console.log('ACC: User account deleted:', currentUserEmail);
}

// Clear IndexedDB data
async function clearIndexedDBData() {
  return new Promise((resolve) => {
    if (chrome && chrome.runtime) {
      // Send message to background script to clear all entries
      chrome.runtime.sendMessage({ type: 'ACC_CLEAR_ALL_ENTRIES' }, (resp) => {
        if (resp?.ok) {
          console.log('ACC: All entries cleared from IndexedDB');
        } else {
          console.error('ACC: Failed to clear entries from IndexedDB:', resp?.error);
        }
        resolve();
      });
    } else {
      // Fallback for standalone dashboard
      const request = indexedDB.deleteDatabase('acc_db');
      request.onsuccess = () => {
        console.log('ACC: IndexedDB database deleted');
        resolve();
      };
      request.onerror = () => {
        console.error('ACC: Failed to delete IndexedDB database');
        resolve();
      };
    }
  });
}

// Check login state on page load
function checkLoginState() {
  const savedLoginState = localStorage.getItem('isLoggedIn');
  const currentUserEmail = localStorage.getItem('currentUserEmail');
  const isLocked = localStorage.getItem('isLocked') === 'true';
  
  if (savedLoginState === 'true' && currentUserEmail) {
    if (isLocked) {
      // 加载用户信息用于显示
      const savedAvatar = localStorage.getItem('userAvatar') || userProfile.avatar;
      const savedName = localStorage.getItem('userName') || userProfile.name;
      
      const lockAvatar = document.getElementById('lock-avatar');
      const lockName = document.getElementById('lock-name');
      if (lockAvatar) lockAvatar.src = savedAvatar;
      if (lockName) lockName.textContent = savedName;

      // 切换到锁屏视图
      loginView.classList.add('active');
      dashboardView.classList.remove('active');
      switchAuthStep('lock');
      return; // 停止执行，停留在锁屏
    }
    // User was previously logged in, auto-login
    state.isLoggedIn = true;
    state.currentUserEmail = currentUserEmail;
    
    // Update user profile
    userProfile.email = currentUserEmail;
    
    // Load saved profile data
    loadSavedProfile();
    
    // Show dashboard
    dashboardView.classList.add('active');
    loginView.classList.remove('active');
    renderDashboard();
    hydrateProfile();
  } else {
    // Show login page
    switchAuthStep('signin');
    loginView.classList.add('active');
    dashboardView.classList.remove('active');
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'ACC_DATA_CHANGED') {
    // 如果仪表盘当前处于打开状态，并且已登录，则刷新列表
    if (state.isLoggedIn) {
      console.log('检测到新数据，正在刷新仪表盘...');
      renderDashboard(); // 重新从数据库加载并渲染
      showToast('New entry synced!', 'info'); // 可选：显示一个提示
    }
  }
});

// Event listeners
// dashboard.js - 完整替换 initEventListeners 函数

function initEventListeners() {
  // 1. 登录表单提交
  const loginForm = document.getElementById('login-form');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  
  // 2. 注册表单提交
  const signupForm = document.getElementById('signup-form');
  if (signupForm) signupForm.addEventListener('submit', handleSignup);
  
  // 3. 重置密码表单
  const resetForm1 = document.getElementById('reset-form-1');
  if (resetForm1) resetForm1.addEventListener('submit', handleResetStep1);
  
  const resetForm2 = document.getElementById('reset-form-2');
  if (resetForm2) resetForm2.addEventListener('submit', handleResetStep2);
  
  // 4. 各种切换链接
  const forgotLink = document.getElementById('forgot-password-link');
  if (forgotLink) forgotLink.addEventListener('click', (e) => { e.preventDefault(); switchAuthStep('reset1'); });
  
  const signupLink = document.getElementById('signup-link');
  if (signupLink) signupLink.addEventListener('click', (e) => { e.preventDefault(); switchAuthStep('signup'); });
  
  const backToLoginFromSignup = document.getElementById('back-to-login-from-signup');
  if (backToLoginFromSignup) backToLoginFromSignup.addEventListener('click', (e) => { e.preventDefault(); switchAuthStep('signin'); });
  
  const backToLoginFromReset = document.getElementById('back-to-login-from-reset');
  if (backToLoginFromReset) backToLoginFromReset.addEventListener('click', (e) => { e.preventDefault(); switchAuthStep('signin'); });
  
  const backToReset1 = document.getElementById('back-to-reset-1');
  if (backToReset1) backToReset1.addEventListener('click', (e) => { e.preventDefault(); switchAuthStep('reset1'); });
  
  const backToLoginLink = document.getElementById('back-to-login-link');
  if (backToLoginLink) backToLoginLink.addEventListener('click', (e) => { e.preventDefault(); switchAuthStep('signin'); });
  
  // 5. 侧边栏 Logout 按钮 -> 改为“锁定”
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    // 先移除旧的监听器（防止重复），虽然是匿名函数移除不掉，但这是个好习惯
    // 这里直接覆盖点击逻辑
    logoutBtn.onclick = () => {
      localStorage.setItem('isLocked', 'true');
      checkLoginState();
      showToast('Dashboard Locked', 'info');
    };
  }

  // 6. 锁屏界面的 Unlock 按钮 (关键修复点!)
  const unlockBtn = document.getElementById('unlock-btn');
  if (unlockBtn) {
    console.log('ACC: Unlock button found, attaching listener...'); // 调试信息
    unlockBtn.addEventListener('click', () => {
      console.log('ACC: Unlock button clicked!'); // 调试信息
      localStorage.removeItem('isLocked');
      checkLoginState();
      showToast('Welcome back!', 'success');
    });
  } else {
    console.error('ACC: Unlock button NOT found!'); // 如果控制台看到这个，说明 HTML ID 写错了
  }

  // 7. 锁屏界面的切换账号按钮
  const switchAccountBtn = document.getElementById('switch-account-link');
  if (switchAccountBtn) {
    switchAccountBtn.addEventListener('click', (e) => {
      e.preventDefault();
      state.isLoggedIn = false;
      state.currentUserEmail = '';
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('isLocked');
      
      if (dashboardView) dashboardView.classList.remove('active');
      if (loginView) loginView.classList.add('active');
      switchAuthStep('signin');
      
      if (emailInput) emailInput.value = '';
      if (passwordInput) passwordInput.value = '';
    });
  }
  
  // 8. 搜索相关
  if (searchBtn) searchBtn.addEventListener('click', handleSearch);
  if (searchInput) {
    searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleSearch(); });
    searchInput.addEventListener('input', () => { if (searchInput.value.trim() === '') handleSearch(); });
  }
  
  // 9. 导航栏点击事件
  const navGrid = document.getElementById('nav-grid');
  if (navGrid) {
    navGrid.addEventListener('click', () => {
      if (state.isLoggedIn) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navGrid.classList.add('active');
        if (gridView) gridView.style.display = 'block';
        if (helpView) helpView.style.display = 'none';
        if (settingsView) settingsView.style.display = 'none';
        renderEntries(state.entries);
      }
    });
  }
  
  const navHelp = document.getElementById('nav-help');
  if (navHelp) {
    navHelp.addEventListener('click', () => {
      if (state.isLoggedIn) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navHelp.classList.add('active');
        if (gridView) gridView.style.display = 'none';
        if (helpView) helpView.style.display = 'block';
        if (settingsView) settingsView.style.display = 'none';
      }
    });
  }
  
  const navSettings = document.getElementById('nav-settings');
  if (navSettings) {
    navSettings.addEventListener('click', () => {
      if (state.isLoggedIn) {
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        navSettings.classList.add('active');
        if (gridView) gridView.style.display = 'none';
        if (helpView) helpView.style.display = 'none';
        if (settingsView) settingsView.style.display = 'block';
        renderSettingsView();
      }
    });
  }
  
  // 10. 帮助页面的折叠展开
  const helpViewEl = document.getElementById('help-view');
  if (helpViewEl) {
    helpViewEl.addEventListener('click', (e) => {
      const item = e.target.closest('.faq-item');
      const question = e.target.closest('.faq-question');
      if (question) {
        const answer = item.querySelector('.faq-answer');
        if (answer) {
          const isActive = answer.style.display === 'block';
          answer.style.display = isActive ? 'none' : 'block';
          question.classList.toggle('active', !isActive);
        }
      }
    });
  }
  
  // 11. 初始化其他功能
  initAvatarUpload();
  initNameEditing();
  initGenderSelection();
  initEntryTitleEditing();
  initLatencyTest();
  initFontSizeControl();
  initThemeControl();
  initDeleteAccount();
  initBatchActions();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkLoginState();
});