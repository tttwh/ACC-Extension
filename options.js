document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('name');
  const bioEl = document.getElementById('bio');
  const avatarFile = document.getElementById('avatarFile');
  const avatarPreview = document.getElementById('avatarPreview');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  let currentAvatarData = '';

  chrome.storage.local.get(['acc_profile'], (res) => {
    const p = res.acc_profile || { name: '', bio: '', avatar: '' };
    nameEl.value = p.name || '';
    bioEl.value = p.bio || '';
    currentAvatarData = p.avatar || '';
    if (currentAvatarData) avatarPreview.src = currentAvatarData;
  });

  avatarFile.addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      currentAvatarData = reader.result;
      avatarPreview.src = currentAvatarData;
    };
    reader.readAsDataURL(f);
  });

  saveBtn.addEventListener('click', () => {
    const profile = { name: nameEl.value || '', bio: bioEl.value || '', avatar: currentAvatarData || '' };
    chrome.storage.local.set({ acc_profile: profile }, () => {
      status.textContent = '已保存';
      setTimeout(() => status.textContent = '', 1500);
      chrome.runtime.sendMessage({ type: 'ACC_SET_PROFILE', payload: { profile } });
    });
  });
});