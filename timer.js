// timer.js - 独立窗口计时器逻辑
document.addEventListener('DOMContentLoaded', () => {
  console.log('计时器窗口已加载');
  
  const timeDisplay = document.getElementById('time-display');
  const toggleBtn = document.getElementById('toggle-btn');
  const progressFill = document.querySelector('.timer-progress-fill');
  
  // 获取圆形进度条的总长度
  const circleCircumference = parseFloat(progressFill.getAttribute('stroke-dasharray'));
  
  // 设置窗口标题
  document.title = "Sense Of Time";
  
  let timerState = {
    timeLeft: 1 * 60,
    isRunning: false,
    totalTime: 1 * 60
  };
  
  // 通知后台timer窗口已打开
  chrome.runtime.sendMessage({action: 'popupOpened'}, function(response) {
    console.log('已通知后台timer窗口已打开', response);
  });
  
  // 从后台获取计时器状态
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
    if (response) {
      timerState = response;
      updateUI();
      
      // 在timer窗口打开时，自动启动计时器（除非已经运行）
      if (!timerState.isRunning) {
        console.log('自动启动计时器');
        chrome.runtime.sendMessage({action: 'startTimer'}, (startResponse) => {
          if (startResponse) {
            timerState = startResponse;
            updateUI();
          }
        });
      }
    }
  });
  
  // 计时器状态变化时更新UI
  function updateUI() {
    console.log('更新UI，计时器状态:', timerState);
    
    // 更新时间显示
    timeDisplay.textContent = formatTime(timerState.timeLeft);
    
    // 更新圆形进度条
    const progressPercentage = timerState.timeLeft / timerState.totalTime;
    const dashOffset = circleCircumference * (1 - progressPercentage);
    progressFill.style.strokeDashoffset = dashOffset;
    
    // 设置进度条颜色为固定的紫/蓝色
    progressFill.style.stroke = '#818CF8';  // 使用浅色模式的默认颜色
    
    // 保持按钮样式一致，仅更新图标
    toggleBtn.style.backgroundColor = '#1f2937';
    toggleBtn.style.color = 'white';
    
    // 根据计时器状态更新按钮图标
    if (timerState.isRunning) {
      toggleBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
      `;
    } else {
      if (timerState.timeLeft === 0) {
        toggleBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
        `;
      } else {
        toggleBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
        `;
      }
    }
  }
  
  // 格式化时间显示
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  // 启动/暂停计时器
  toggleBtn.addEventListener('click', () => {
    console.log('点击了启动/暂停按钮');
    
    if (timerState.timeLeft === 0) {
      // 如果计时器已结束，重置并开始
      chrome.runtime.sendMessage({ action: 'resetTimer' }, (response) => {
        if (response) {
          timerState = response;
          
          // 然后开始
          chrome.runtime.sendMessage({ action: 'startTimer' }, (startResponse) => {
            if (startResponse) {
              timerState = startResponse;
              updateUI();
            }
          });
        }
      });
    } else {
      // 否则切换启动/暂停
      chrome.runtime.sendMessage({ 
        action: timerState.isRunning ? 'stopTimer' : 'startTimer'
      }, (response) => {
        if (response) {
          timerState = response;
          updateUI();
        }
      });
    }
  });
  
  // 监听来自后台的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('计时器窗口收到消息:', message);
    
    if (message.action === 'timerUpdate' && message.timerState) {
      timerState = message.timerState;
      updateUI();
    } else if (message.action === 'timerCompleted') {
      // 在独立窗口中播放通知效果
      document.body.style.animation = 'flash 0.5s 3';
    } else if (message.action === 'ping') {
      // 响应来自background的ping，表明timer窗口仍然打开
      sendResponse({ alive: true });
      return true;
    }
    
    sendResponse({ received: true });
    return true;
  });
  
  // 添加窗口关闭前的事件监听
  window.addEventListener('beforeunload', () => {
    console.log('计时器窗口即将关闭');
    
    // 尝试直接通知，但可能不会成功
    try {
      chrome.runtime.sendMessage({action: 'popupClosed'});
    } catch (e) {
      console.error('发送Timer窗口关闭消息失败:', e);
    }
  });
  
  // 添加一个闪烁的动画效果
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes flash {
      0% { background-color: white; }
      50% { background-color: rgba(129, 140, 248, 0.2); }
      100% { background-color: white; }
    }
  `;
  document.head.appendChild(styleSheet);
}); 