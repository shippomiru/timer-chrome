// options.js - Configuration page logic
document.addEventListener('DOMContentLoaded', function() {
  console.log('Configuration page loaded');
  
  // Get DOM elements
  const timeOptions = document.querySelectorAll('.time-option');
  const startTimerBtn = document.getElementById('start-timer-btn');
  
  // Currently selected minutes
  let selectedMinutes = 1; // Default 1 minute (已修改为默认1分钟)
  
  // Add click events to time options
  timeOptions.forEach(option => {
    option.addEventListener('click', function() {
      // Remove selected state from all options
      timeOptions.forEach(opt => opt.classList.remove('selected'));
      
      // Add selected state to current option
      this.classList.add('selected');
      
      // Update selected minutes
      selectedMinutes = parseInt(this.getAttribute('data-minutes'));
      console.log('Time selected:', selectedMinutes, 'minutes');
    });
  });
  
  // Start timer button click event
  startTimerBtn.addEventListener('click', function() {
    console.log('Start timer button clicked, selected', selectedMinutes, 'minutes');
    
    // 先重置计时器，确保每次点击都是重新开始
    chrome.runtime.sendMessage({
      action: 'resetTimer'
    }, function(resetResponse) {
      if (resetResponse) {
        console.log('Timer reset completed');
        
        // 然后更新计时器状态
        chrome.runtime.sendMessage({
          action: 'updateTimerState',
          timeLeft: selectedMinutes * 60,
          totalTime: selectedMinutes * 60
        }, function(updateResponse) {
          if (updateResponse) {
            console.log('Timer state updated:', updateResponse);
            
            // 最后启动计时器
            chrome.runtime.sendMessage({
              action: 'startTimer'
            }, function(startResponse) {
              if (startResponse) {
                console.log('Timer started with new settings');
                
                // 打开独立计时器窗口
                chrome.runtime.sendMessage({
                  action: 'openTimerWindow'
                }, function(windowResponse) {
                  if (windowResponse && windowResponse.success) {
                    console.log('Timer window opened');
                    
                    // 关闭当前选项页面
                    window.close();
                  }
                });
              }
            });
          }
        });
      }
    });
  });
  
  // On init, get current timer state from storage
  chrome.runtime.sendMessage({action: 'getTimerState'}, function(response) {
    if (response) {
      const minutes = Math.round(response.totalTime / 60);
      
      // Find matching time option and select it
      timeOptions.forEach(option => {
        const optionMinutes = parseInt(option.getAttribute('data-minutes'));
        if (optionMinutes === minutes) {
          timeOptions.forEach(opt => opt.classList.remove('selected'));
          option.classList.add('selected');
          selectedMinutes = optionMinutes;
        }
      });
    }
  });
}); 