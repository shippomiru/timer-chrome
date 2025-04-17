// options.js - Configuration page logic
document.addEventListener('DOMContentLoaded', function() {
  console.log('Configuration page loaded');
  
  // Get DOM elements
  const timeOptions = document.querySelectorAll('.time-option');
  const startTimerBtn = document.getElementById('start-timer-btn');
  
  // Currently selected minutes
  let selectedMinutes = 5; // Default 5 minutes
  
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
    
    // Send message to background to update timer state
    chrome.runtime.sendMessage({
      action: 'updateTimerState',
      timeLeft: selectedMinutes * 60,
      totalTime: selectedMinutes * 60
    }, function(response) {
      if (response) {
        console.log('Timer state updated:', response);
        
        // Open popup window
        // Due to Chrome extension limitations, we can't directly open the popup through JS
        // So we create a new timer window instead
        chrome.runtime.sendMessage({
          action: 'openTimerWindow'
        }, function(response) {
          if (response && response.success) {
            console.log('Timer window opened');
            
            // Close the current options page
            window.close();
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