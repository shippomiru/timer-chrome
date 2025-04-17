// content.js
console.log('计时器内容脚本加载');

let timerState = {
  timeLeft: 5 * 60,
  isRunning: false,
  totalTime: 5 * 60
};

let timerElement = null;
let audioContext = null;
let notificationBuffer = null;

// 初始化函数
function init() {
  console.log('初始化计时器UI');
  
  // 清除之前的计时器（如果存在）
  const existingTimer = document.querySelector('.sense-of-time-timer');
  if (existingTimer) {
    existingTimer.remove();
  }
  
  createTimerUI();
  // 从后台获取计时器状态
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
    if (response) {
      timerState = response;
      updateTimerUI();
    }
  });
  
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

// 创建计时器UI - 完全匹配Timer5.tsx的设计
function createTimerUI() {
  // 创建计时器容器
  timerElement = document.createElement('div');
  timerElement.className = 'sense-of-time-timer';
  timerElement.style.position = 'fixed';
  timerElement.style.top = '20px';
  timerElement.style.right = '20px';
  timerElement.style.zIndex = '10000';
  timerElement.style.fontFamily = 'ui-rounded, "Hiragino Maru Gothic ProN", Quicksand, Comfortaa, Manjari, "Arial Rounded MT", "Arial Rounded MT Bold", Calibri, source-sans-pro, sans-serif';
  
  // 添加拖动功能
  makeElementDraggable(timerElement);
  
  // 计算圆环半径和周长 - 与Timer5.tsx完全一致
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  
  // 使用浅色模式
  const cardBg = 'white';
  const progressBg = '#F3F4F6';
  const progressFill = '#818CF8';
  const textColor = '#1f2937';
  const buttonBg = timerState.isRunning ? '#F3F4F6' : '#1f2937';
  const buttonColor = timerState.isRunning ? '#6b7280' : 'white';
  
  // 创建计时器内容 - 完全遵循Timer5.tsx的结构
  timerElement.innerHTML = `
    <div class="timer-card" style="
      background-color: ${cardBg};
      border-radius: 1.5rem;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      padding: 3rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 0.3s ease, opacity 0.3s ease;
    ">
      <div class="timer-circle-container" style="
        position: relative;
        width: 240px;
        height: 240px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg class="timer-progress" style="
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          transform-origin: center;
        ">
          <circle
            class="timer-progress-bg"
            cx="120"
            cy="120"
            r="${radius}"
            stroke="${progressBg}"
            stroke-width="32"
            fill="none"
          />
          <circle
            class="timer-progress-fill"
            cx="120"
            cy="120"
            r="${radius}"
            stroke="${progressFill}"
            stroke-width="32"
            fill="none"
            stroke-linecap="round"
            style="
              stroke-dasharray: ${circumference};
              stroke-dashoffset: 0;
              transition: stroke-dashoffset 0.3s ease;
            "
          />
        </svg>
      </div>
      
      <div class="timer-time" style="
        font-size: 48px;
        line-height: 1;
        color: ${textColor};
        font-weight: 500;
        font-feature-settings: 'tnum';
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.05em;
        margin-top: 16px;
        margin-bottom: 16px;
        text-align: center;
      ">05:00</div>
      
      <div class="timer-controls" style="
        display: flex;
        justify-content: center;
      ">
        <button class="timer-button timer-start-button" style="
          width: 8rem;
          height: 4rem;
          border-radius: 9999px;
          background-color: ${buttonBg};
          color: ${buttonColor};
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(timerElement);
  
  // 添加事件监听器
  timerElement.querySelector('.timer-start-button').addEventListener('click', toggleTimer);
}

// 更新计时器UI
function updateTimerUI() {
  if (!timerElement) return;
  
  // 更新时间显示
  const timeDisplay = timerElement.querySelector('.timer-time');
  timeDisplay.textContent = formatTime(timerState.timeLeft);
  
  // 更新进度条 - 关键部分，与Timer5.tsx保持一致
  const progressCircle = timerElement.querySelector('.timer-progress-fill');
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const progress = (timerState.timeLeft / timerState.totalTime) * 100;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  progressCircle.style.strokeDashoffset = strokeDashoffset;
  
  // 更新按钮状态
  const startButton = timerElement.querySelector('.timer-start-button');
  
  // 更新按钮状态和样式
  if (timerState.isRunning) {
    startButton.style.backgroundColor = '#F3F4F6';
    startButton.style.color = '#6b7280';
    startButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
  } else {
    startButton.style.backgroundColor = '#1f2937';
    startButton.style.color = 'white';
    
    // 如果时间为0，更改开始按钮为重置图标
    if (timerState.timeLeft === 0) {
      startButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`;
    } else {
      startButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
    }
  }
}

// 格式化时间显示
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 切换计时器状态
function toggleTimer() {
  if (timerState.timeLeft === 0) {
    resetTimer();
  } else {
    chrome.runtime.sendMessage({ 
      action: timerState.isRunning ? 'stopTimer' : 'startTimer'
    }, (response) => {
      if (response) {
        timerState = response;
        updateTimerUI();
      }
    });
  }
}

// 重置计时器
function resetTimer() {
  chrome.runtime.sendMessage({ action: 'resetTimer' }, (response) => {
    if (response) {
      timerState = response;
      updateTimerUI();
    }
  });
}

// 隐藏计时器UI
function hideTimer() {
  if (timerElement) {
    timerElement.style.transform = 'scale(0.9)';
    timerElement.style.opacity = '0';
    
    setTimeout(() => {
      timerElement.style.display = 'none';
    }, 300);
  }
}

// 显示计时器UI
function showTimer() {
  if (timerElement) {
    timerElement.style.display = 'block';
    
    setTimeout(() => {
      timerElement.style.transform = 'scale(1)';
      timerElement.style.opacity = '1';
    }, 10);
  }
}

// 使元素可拖动
function makeElementDraggable(element) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  
  // 创建拖动句柄
  const handle = document.createElement('div');
  handle.style.position = 'absolute';
  handle.style.top = '0';
  handle.style.left = '0';
  handle.style.width = '100%';
  handle.style.height = '24px';
  handle.style.cursor = 'move';
  element.prepend(handle);
  
  handle.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // 获取鼠标初始位置
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // 鼠标移动时调用函数
    document.onmousemove = elementDrag;
    
    // 添加拖动中的样式
    element.classList.add('dragging');
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // 计算新位置
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // 设置元素新位置
    element.style.top = (element.offsetTop - pos2) + "px";
    element.style.left = (element.offsetLeft - pos1) + "px";
    // 如果设置了right属性，清除它
    element.style.right = 'auto';
  }
  
  function closeDragElement() {
    // 停止移动
    document.onmouseup = null;
    document.onmousemove = null;
    
    // 移除拖动中的样式
    element.classList.remove('dragging');
  }
}

// 监听系统颜色模式变化
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  // 只需更新UI，现在我们总是使用浅色模式
  updateTimerUI();
});

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'timerUpdate') {
    timerState = message.timerState;
    updateTimerUI();
  } else if (message.action === 'timerCompleted') {
    showTimer();
    playNotificationSound();
  } else if (message.action === 'toggleVisibility') {
    if (timerElement) {
      if (window.getComputedStyle(timerElement).display === 'none') {
        showTimer();
      } else {
        hideTimer();
      }
    }
  }
  sendResponse({ received: true });
  return true;
});

// 添加键盘快捷键显示/隐藏计时器
document.addEventListener('keydown', (e) => {
  // Alt+T 切换显示/隐藏计时器
  if (e.altKey && e.key === 't') {
    if (timerElement && window.getComputedStyle(timerElement).display === 'none') {
      showTimer();
    } else {
      hideTimer();
    }
  }
});

// 当页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 