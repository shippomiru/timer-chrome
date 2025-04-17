// popup.js - 弹出页面逻辑
document.addEventListener('DOMContentLoaded', function() {
  console.log('弹出窗口已加载');
  
  // 获取DOM元素
  const timeDisplay = document.getElementById('time-display');
  const toggleBtn = document.getElementById('toggle-btn');
  const openWindowBtn = document.getElementById('open-window-btn');
  const progressFill = document.querySelector('.timer-progress-fill');
  
  // 默认定时器状态
  let timerState = {
    timeLeft: 1 * 60, // 默认1分钟（秒）
    totalTime: 1 * 60,
    isRunning: false
  };
  
  // 通知后台popup已打开
  chrome.runtime.sendMessage({action: 'popupOpened'}, function(response) {
    console.log('已通知后台popup已打开', response);
  });
  
  // 添加window卸载事件，通知后台popup关闭
  window.addEventListener('unload', function() {
    console.log('Popup窗口即将关闭');
    // 尝试直接通知，但可能不会成功
    try {
      chrome.runtime.sendMessage({action: 'popupClosed'});
    } catch (e) {
      console.error('发送popup关闭消息失败:', e);
    }
  });
  
  // 格式化时间显示
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // 更新定时器UI
  function updateTimerUI() {
    console.log('更新定时器UI');
    // 更新时间显示
    timeDisplay.textContent = formatTime(timerState.timeLeft);
    
    // 更新进度圈
    const progressValue = (timerState.timeLeft / timerState.totalTime);
    const circumference = 2 * Math.PI * 64; // 圆周长 = 2πr，r=64
    const dashOffset = circumference * (1 - progressValue);
    progressFill.style.strokeDasharray = `${circumference}`;
    progressFill.style.strokeDashoffset = `${dashOffset}`;
    
    // 更新按钮图标
    toggleBtn.innerHTML = timerState.isRunning 
      ? '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>'
      : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>';
  }
  
  // 切换定时器状态
  function toggleTimer() {
    timerState.isRunning = !timerState.isRunning;
    console.log('定时器状态已切换:', timerState.isRunning ? '运行中' : '已暂停');
    
    if (timerState.isRunning) {
      // 启动定时器
      chrome.runtime.sendMessage({action: 'startTimer'});
    } else {
      // 暂停定时器
      chrome.runtime.sendMessage({action: 'stopTimer'});
    }
    
    updateTimerUI();
  }
  
  // 在新窗口中打开定时器
  function openTimerWindow() {
    console.log('在新窗口中打开定时器');
    chrome.runtime.sendMessage({
      action: 'openTimerWindow'
    });
  }
  
  // 初始化
  function initialize() {
    console.log('初始化定时器状态');
    // 向background请求当前定时器状态
    chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
      if (response) {
        timerState = response;
        
        // 在popup打开时，自动启动计时器（除非已经运行）
        if (!timerState.isRunning) {
          console.log('自动启动计时器');
          chrome.runtime.sendMessage({action: 'startTimer'}, function(startResponse) {
            if (startResponse) {
              timerState = startResponse;
              updateTimerUI();
            }
          });
        } else {
          updateTimerUI();
        }
      }
    });
    
    // 监听来自background的消息
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
      if (request.action === 'timerUpdate' && request.timerState) {
        console.log('收到定时器更新:', request.timerState);
        timerState = request.timerState;
        updateTimerUI();
      } else if (request.action === 'ping') {
        // 响应来自background的ping，表明popup仍然打开
        sendResponse({ alive: true });
        return true;
      }
      return true;
    });
  }
  
  // 添加事件监听器
  toggleBtn.addEventListener('click', toggleTimer);
  openWindowBtn.addEventListener('click', openTimerWindow);
  
  // 初始化定时器
  initialize();
}); 