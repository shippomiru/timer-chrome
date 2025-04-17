// background.js
console.log('计时器插件后台服务启动');

let timerState = {
  timeLeft: 5 * 60,
  isRunning: false,
  totalTime: 5 * 60,
  startTime: null,
  alarmName: 'timerAlarm'
};

// 从存储中恢复计时器状态
chrome.storage.local.get(['timerState'], (result) => {
  if (result.timerState) {
    console.log('恢复计时器状态:', result.timerState);
    timerState = result.timerState;
    
    // 如果计时器正在运行，重新计算剩余时间并继续
    if (timerState.isRunning && timerState.startTime) {
      const elapsedSeconds = Math.floor((Date.now() - timerState.startTime) / 1000);
      timerState.timeLeft = Math.max(0, timerState.timeLeft - elapsedSeconds);
      
      if (timerState.timeLeft > 0) {
        startTimer();
      } else {
        timerState.isRunning = false;
        timerState.timeLeft = 0;
        saveTimerState();
      }
    }
  }
});

// 保存计时器状态到本地存储
function saveTimerState() {
  chrome.storage.local.set({ timerState });
  console.log('保存计时器状态:', timerState);
}

// 启动计时器
function startTimer() {
  if (!timerState.isRunning) {
    timerState.isRunning = true;
    timerState.startTime = Date.now();
    saveTimerState();
  }
  
  // 使用chrome.alarms API来确保即使在后台也能维持计时
  chrome.alarms.clear(timerState.alarmName);
  chrome.alarms.create(timerState.alarmName, {
    delayInMinutes: timerState.timeLeft / 60,
    periodInMinutes: 0
  });
  
  // 广播计时器状态
  broadcastTimerState();
}

// 停止计时器
function stopTimer() {
  timerState.isRunning = false;
  timerState.startTime = null;
  chrome.alarms.clear(timerState.alarmName);
  saveTimerState();
  
  // 广播计时器状态
  broadcastTimerState();
}

// 重置计时器
function resetTimer() {
  timerState.isRunning = false;
  timerState.timeLeft = timerState.totalTime;
  timerState.startTime = null;
  chrome.alarms.clear(timerState.alarmName);
  saveTimerState();
  
  // 广播计时器状态
  broadcastTimerState();
}

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);
  
  if (message.action === 'getTimerState') {
    sendResponse(timerState);
  } 
  else if (message.action === 'startTimer') {
    startTimer();
    sendResponse(timerState);
  } 
  else if (message.action === 'stopTimer') {
    stopTimer();
    sendResponse(timerState);
  } 
  else if (message.action === 'resetTimer') {
    resetTimer();
    sendResponse(timerState);
  } 
  else if (message.action === 'updateTimerState') {
    // 更新计时器状态
    if (message.timeLeft !== undefined) {
      timerState.timeLeft = message.timeLeft;
    }
    if (message.totalTime !== undefined) {
      timerState.totalTime = message.totalTime;
    }
    saveTimerState();
    sendResponse(timerState);
  }
  
  return true; // 保持通道开放，以便异步响应
});

// 1秒检查一次计时器状态
setInterval(() => {
  if (timerState.isRunning) {
    const elapsedSeconds = Math.floor((Date.now() - timerState.startTime) / 1000);
    const newTimeLeft = Math.max(0, timerState.totalTime - elapsedSeconds);
    
    // 只在时间发生变化时更新和广播
    if (newTimeLeft !== timerState.timeLeft) {
      timerState.timeLeft = newTimeLeft;
      saveTimerState();
      broadcastTimerState();
      
      // 检查是否完成
      if (timerState.timeLeft === 0) {
        timerCompleted();
      }
    }
  }
}, 1000);

// 广播计时器状态到所有内容脚本
function broadcastTimerState() {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'timerUpdate',
        timerState: timerState
      }).catch(error => {
        // 忽略内容脚本尚未加载导致的错误
        console.log(`Tab ${tab.id} 发送消息失败:`, error);
      });
    });
  });
}

// 计时器完成时处理
function timerCompleted() {
  console.log('计时器完成!');
  stopTimer();
  
  // 显示通知
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/timer.svg',
    title: '计时器完成',
    message: '您的5分钟计时已完成!',
    priority: 2,
    silent: true // 不使用系统声音，我们将使用自定义声音
  });
  
  // 广播计时完成消息，让内容脚本播放声音
  chrome.tabs.query({active: true}, (tabs) => {
    if (tabs.length > 0) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'timerCompleted'
      }).catch(error => {
        // 尝试向所有标签页发送消息
        console.log('发送计时完成消息失败，尝试向所有标签页发送:', error);
        chrome.tabs.query({}, (allTabs) => {
          if (allTabs.length > 0) {
            chrome.tabs.sendMessage(allTabs[0].id, {
              action: 'timerCompleted'
            }).catch(err => {
              console.log('向所有标签页发送消息也失败:', err);
            });
          }
        });
      });
    }
  });
}

// 监听alarm事件
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === timerState.alarmName) {
    timerCompleted();
  }
}); 