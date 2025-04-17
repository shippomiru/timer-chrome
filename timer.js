// timer.js - 独立窗口计时器逻辑
document.addEventListener('DOMContentLoaded', () => {
  console.log('计时器窗口已加载');
  
  const timeDisplay = document.getElementById('time-display');
  const toggleBtn = document.getElementById('toggle-btn');
  const progressFill = document.querySelector('.timer-progress-fill');
  
  // 获取圆形进度条的总长度
  const circleCircumference = parseFloat(progressFill.getAttribute('stroke-dasharray'));
  
  let timerState = {
    timeLeft: 5 * 60,
    isRunning: false,
    totalTime: 5 * 60
  };
  
  // 从后台获取计时器状态
  chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
    if (response) {
      timerState = response;
      updateUI();
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
    
    // 根据进度更新进度条颜色
    if (timerState.timeLeft <= 10) {
      // 接近结束时显示红色
      progressFill.style.stroke = '#EF4444';
    } else if (timerState.timeLeft <= 60) {
      // 最后一分钟显示黄色
      progressFill.style.stroke = '#F59E0B';
    } else {
      // 正常状态显示紫色/蓝色
      progressFill.style.stroke = '#818CF8';  // 使用浅色模式的默认颜色
    }
    
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
    
    // 更新窗口标题，显示剩余时间
    document.title = `${formatTime(timerState.timeLeft)} - Sense Of Time`;
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
    }
    
    sendResponse({ received: true });
    return true;
  });
  
  // 添加一个闪烁的动画效果
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    @keyframes flash {
      0% { background-color: white; }
      50% { background-color: rgba(239, 68, 68, 0.2); }
      100% { background-color: white; }
    }
  `;
  document.head.appendChild(styleSheet);
}); 