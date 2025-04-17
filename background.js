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

// 监听来自popup和独立窗口的消息
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
  else if (message.action === 'openTimerWindow') {
    // 处理打开独立计时器窗口的请求
    console.log('收到打开计时器窗口请求');
    openTimerWindow();
    sendResponse({ success: true });
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

// 向所有相关页面广播计时器状态
function broadcastTimerState() {
  // 向popup发送消息（如果打开）
  chrome.runtime.sendMessage({ 
    action: 'timerUpdate', 
    timerState: timerState 
  }).catch(err => {
    // 忽略popup关闭错误
    console.log('发送消息到popup失败:', err);
  });
  
  // 向独立计时器窗口发送消息
  chrome.windows.getAll({populate: true}, function(windows) {
    for (let browserWindow of windows) {
      for (let tab of browserWindow.tabs) {
        if (tab.url && tab.url.includes('timer.html')) {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'timerUpdate', 
            timerState: timerState 
          }).catch(err => {
            console.log(`发送消息到计时器窗口 ${tab.id} 失败:`, err);
          });
        }
      }
    }
  });
}

// 计时器完成时通知相关页面
function timerCompleted() {
  timerState.isRunning = false;
  saveTimerState();
  
  // 通知popup（如果打开）
  chrome.runtime.sendMessage({ 
    action: 'timerCompleted'
  }).catch(err => {
    // 忽略popup关闭错误
    console.log('发送计时完成消息到popup失败:', err);
  });
  
  // 通知独立计时器窗口
  chrome.windows.getAll({populate: true}, function(windows) {
    for (let browserWindow of windows) {
      for (let tab of browserWindow.tabs) {
        if (tab.url && tab.url.includes('timer.html')) {
          chrome.tabs.sendMessage(tab.id, { 
            action: 'timerCompleted'
          }).catch(err => {
            console.log(`发送计时完成消息到计时器窗口 ${tab.id} 失败:`, err);
          });
          
          // 将窗口置于顶部
          chrome.windows.update(browserWindow.id, {focused: true});
        }
      }
    }
  });
  
  // 显示系统通知
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/timer.svg',
    title: '时间到！',
    message: '您设置的计时器已完成',
    priority: 2
  });
}

// 监听alarm事件
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === timerState.alarmName) {
    timerCompleted();
  }
});

// 添加打开计时器窗口的功能
function openTimerWindow() {
  // 检查是否已经存在计时器窗口
  chrome.windows.getAll({populate: true}, function(windows) {
    let timerWindowExists = false;
    
    for (let browserWindow of windows) {
      for (let tab of browserWindow.tabs) {
        if (tab.url && tab.url.includes('timer.html')) {
          // 如果找到了计时器窗口，激活它
          chrome.windows.update(browserWindow.id, {focused: true});
          chrome.tabs.update(tab.id, {active: true});
          timerWindowExists = true;
          break;
        }
      }
      if (timerWindowExists) break;
    }
    
    // 如果没有找到计时器窗口，创建一个新的
    if (!timerWindowExists) {
      chrome.windows.create({
        url: chrome.runtime.getURL('timer.html'),
        type: 'popup',
        width: 400,
        height: 500
      });
    }
  });
}

// 监听点击扩展图标事件（如果popup未设置）
chrome.action.onClicked.addListener(function(tab) {
  openTimerWindow();
});

// 添加右键菜单项
chrome.runtime.onInstalled.addListener(function() {
  chrome.contextMenus.create({
    id: 'openTimer',
    title: '打开计时器窗口',
    contexts: ['all']
  });
});

// 监听菜单点击事件
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'openTimer') {
    openTimerWindow();
  }
}); 