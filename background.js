// background.js - 完整修复版

importScripts('idb.js');

const DB_NAME = 'acc_db';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

// 1. 数据库打开函数
function openDb() {
  return idbOpen(DB_NAME, DB_VERSION, (db) => {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      store.createIndex('timestamp', 'timestamp', { unique: false });
      store.createIndex('source_url', 'source_url', { unique: false });
      store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      store.createIndex('original_text', 'original_text', { unique: false });
    }
  });
}

// 2. 添加条目
async function addEntry(payload) {
  const db = await openDb();
  return idbAdd(db, STORE_NAME, payload);
}

// 3. 搜索条目
async function searchEntries(keyword) {
  const db = await openDb();
  const all = await idbGetAll(db, STORE_NAME);
  if (!keyword) return all.sort((a, b) => b.timestamp - a.timestamp);
  const kw = keyword.toLowerCase();
  return all
    .filter(e => (e.original_text || '').toLowerCase().includes(kw) ||
                 (e.tags || []).some(t => (t || '').toLowerCase().includes(kw)) ||
                 (e.title || '').toLowerCase().includes(kw))
    .sort((a, b) => b.timestamp - a.timestamp);
}

// 4. 删除单个条目
async function deleteEntry(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// 5. 批量删除条目 (本次核心修复)
async function batchDeleteEntries(ids) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    ids.forEach(id => {
      store.delete(id);
    });
    
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// 6. 清空所有条目
async function clearAllEntries() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// === 核心：统一的消息监听器 (只能有一个) ===
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message || {};
  
  // 使用 async IIFE 处理异步操作
  (async () => {
    try {
      if (type === 'ACC_ADD_ENTRY') {
        const id = await addEntry(payload);
        // 通知其他页面数据变了（比如仪表盘）
        chrome.runtime.sendMessage({ type: 'ACC_DATA_CHANGED' }).catch(() => {});
        sendResponse({ ok: true, id });
        
      } else if (type === 'ACC_SEARCH') {
        const results = await searchEntries(payload?.keyword || '');
        sendResponse({ ok: true, results });
        
      } else if (type === 'ACC_DELETE_ENTRY') {
        await deleteEntry(payload?.id);
        sendResponse({ ok: true });
        
      } else if (type === 'ACC_BATCH_DELETE') {
        // 修复：处理批量删除
        await batchDeleteEntries(payload?.ids || []);
        sendResponse({ ok: true });
        
      } else if (type === 'ACC_CLEAR_ALL_ENTRIES') {
        await clearAllEntries();
        sendResponse({ ok: true });
        
      } else {
        // 如果所有 if 都不匹配，才返回未知类型
        console.warn('Unknown message type:', type);
        sendResponse({ ok: false, error: 'Unknown message type: ' + type });
      }
    } catch (err) {
      console.error('Error in background handler:', err);
      sendResponse({ ok: false, error: String(err) });
    }
  })();
  
  return true; // 保持通道开启，以支持异步 sendResponse
});