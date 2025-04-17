// content.js - 已完全移除声音相关代码
console.log('计时器内容脚本加载');

// 初始化函数
function init() {
  console.log('初始化计时器内容脚本');
}

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('内容脚本收到消息:', message);
  sendResponse({ received: true });
  return true;
});

// 当页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 