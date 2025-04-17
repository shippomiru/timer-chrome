// background.js
console.log('计时器插件后台服务启动');

let timerState = {
  timeLeft: 1 * 60,
  isRunning: false,
  totalTime: 1 * 60,
  startTime: null,
  alarmName: 'timerAlarm',
  activeWindowId: null, // 记录活动的popup窗口ID
  popupOpen: false // 记录popup是否打开
};

// 在扩展启动时强制重置计时状态，清除localStorage中的旧状态
resetTimer();
chrome.storage.local.remove(['timerState'], () => {
  console.log('清除存储的计时器状态');
});

// 保存计时器状态到本地存储
function saveTimerState() {
  chrome.storage.local.set({ timerState });
  console.log('保存计时器状态:', timerState);
}

// 启动计时器
function startTimer() {
  // 只有当popup打开时才能启动计时器
  if (!timerState.popupOpen) {
    console.log('popup未打开，不启动计时器');
    resetTimer();
    return;
  }

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
  timerState.activeWindowId = null;
  chrome.alarms.clear(timerState.alarmName);
  saveTimerState();
  
  // 广播计时器状态
  broadcastTimerState();
}

// 监听来自popup和独立窗口的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到消息:', message);
  
  // 记录发送消息的窗口ID
  if (sender.tab && sender.tab.windowId) {
    timerState.activeWindowId = sender.tab.windowId;
    saveTimerState();
  }
  
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
  else if (message.action === 'popupOpened') {
    // 记录popup已打开
    console.log('Popup窗口已打开');
    timerState.popupOpen = true;
    saveTimerState();
    sendResponse({ success: true });
  }
  else if (message.action === 'popupClosed') {
    // 记录popup已关闭
    console.log('Popup窗口已关闭');
    timerState.popupOpen = false;
    // 立即重置计时器
    resetTimer();
    sendResponse({ success: true });
  }
  
  return true; // 保持通道开放，以便异步响应
});

// 定期检查popup是否仍然打开
setInterval(() => {
  // 如果标记为popup打开，但实际已关闭，则重置计时器
  if (timerState.popupOpen || timerState.isRunning) {
    chrome.runtime.sendMessage({ action: 'ping' }, response => {
      const lastError = chrome.runtime.lastError;
      if (lastError || !response) {
        console.log('Popup可能已关闭（ping失败）:', lastError ? lastError.message : 'No response');
        timerState.popupOpen = false;
        if (timerState.isRunning) {
          console.log('自动重置计时器');
          resetTimer();
        }
      }
    });
  }
}, 1000);

// 监听窗口关闭事件
chrome.windows.onRemoved.addListener((windowId) => {
  console.log('窗口关闭:', windowId);
  
  // 检查关闭的是否是当前活动的计时器窗口
  if (windowId === timerState.activeWindowId) {
    console.log('计时器窗口已关闭，停止并重置计时器');
    timerState.popupOpen = false;
    resetTimer();
  } else {
    // 检查是否所有计时器窗口都已关闭
    chrome.windows.getAll({populate: true}, (windows) => {
      let timerWindowExists = false;
      
      for (let browserWindow of windows) {
        for (let tab of browserWindow.tabs) {
          if (tab.url && (tab.url.includes('timer.html') || tab.url.includes('popup.html'))) {
            timerWindowExists = true;
            break;
          }
        }
        if (timerWindowExists) break;
      }
      
      // 如果没有找到计时器窗口，重置计时器
      if (!timerWindowExists) {
        console.log('所有计时器窗口已关闭，重置计时器');
        timerState.popupOpen = false;
        resetTimer();
      }
    });
  }
});

// 1秒检查一次计时器状态
setInterval(() => {
  // 如果popup已关闭但计时器仍在运行，重置计时器
  if (!timerState.popupOpen && timerState.isRunning) {
    console.log('Popup已关闭但计时器仍在运行，自动重置');
    resetTimer();
    return;
  }

  if (timerState.isRunning && timerState.popupOpen) {
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

// 添加一个自定义消息处理端点，用于接收关闭信号
chrome.runtime.onMessageExternal.addListener(function(request, sender, sendResponse) {
  if (request.action === 'popupClosed') {
    console.log('接收到外部发送的窗口关闭信号');
    timerState.popupOpen = false;
    resetTimer();
  }
});

// 设置后备机制，每5秒执行一次，检查是否需要重置计时器
setInterval(() => {
  // 检查是否有无效的计时器状态
  if (timerState.isRunning && (!timerState.popupOpen || !timerState.startTime)) {
    console.log('发现无效的计时器状态，执行重置');
    resetTimer();
  }
}, 5000); 