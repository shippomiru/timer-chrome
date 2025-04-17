// content.js
console.log('计时器内容脚本加载');

// 音频处理相关变量
let audioContext = null;
let notificationBuffer = null;

// 初始化函数
function init() {
  console.log('初始化计时器内容脚本');
  
  // 预加载通知音效
  initAudio();
}

// 初始化音频上下文
function initAudio() {
  try {
    audioContext = new AudioContext();
    
    // 加载通知音频
    fetch(chrome.runtime.getURL('notification.mp3'))
      .then(response => {
        if (!response.ok) {
          throw new Error('无法加载音频文件');
        }
        return response.arrayBuffer();
      })
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(buffer => {
        notificationBuffer = buffer;
        console.log('音频文件加载成功');
      })
      .catch(error => {
        console.error('加载音频失败:', error);
      });
  } catch (error) {
    console.error('创建音频上下文失败:', error);
  }
}

// 播放通知声音
function playNotificationSound() {
  if (!audioContext || !notificationBuffer) {
    console.log('音频上下文或缓冲区未初始化');
    return;
  }

  if (audioContext.state === 'suspended') {
    console.log('音频上下文被暂停，尝试恢复...');
    audioContext.resume().then(() => {
      console.log('音频上下文已恢复');
      playSound();
    }).catch(error => {
      console.error('恢复音频上下文失败:', error);
    });
  } else {
    playSound();
  }
}

// 实际播放声音
function playSound() {
  console.log('开始播放通知音效...');
  
  const startTime = audioContext.currentTime;
  
  // 播放三次
  for (let i = 0; i < 3; i++) {
    const source = audioContext.createBufferSource();
    source.buffer = notificationBuffer;
    source.connect(audioContext.destination);
    
    // 每次播放间隔1秒
    const playTime = startTime + i * (notificationBuffer.duration + 1);
    source.start(playTime);
    
    console.log(`安排第 ${i+1} 次播放，时间：${playTime}`);
  }
}

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'timerCompleted') {
    playNotificationSound();
  }
  sendResponse({ received: true });
  return true;
});

// 当页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 