// SweetAlert2 Dark Mode Support - Load this AFTER SweetAlert2 CDN
(function() {
  // Wait for Swal to be available
  if (typeof Swal === 'undefined') {
    console.warn('SweetAlert2 not loaded yet');
    return;
  }

  function isDarkMode() {
    return document.documentElement.classList.contains('dark') || localStorage.theme === 'dark';
  }

  function getDarkModeOptions() {
    if (isDarkMode()) {
      return {
        background: '#1E2128',
        color: '#d1d5db',
        confirmButtonColor: '#3082CF',
        cancelButtonColor: '#4b5563',
      };
    }
    return {};
  }

  // Override Swal.fire to apply dark mode styling
  const originalSwalFire = Swal.fire.bind(Swal);
  Swal.fire = function(...args) {
    const darkOptions = getDarkModeOptions();
    
    // If first argument is an object, merge in dark mode settings
    if (args.length > 0 && typeof args[0] === 'object') {
      // In dark mode, force dark background/color
      if (isDarkMode()) {
        args[0] = {
          ...args[0],
          background: darkOptions.background,
          color: darkOptions.color,
          confirmButtonColor: args[0].confirmButtonColor || darkOptions.confirmButtonColor,
          cancelButtonColor: args[0].cancelButtonColor || darkOptions.cancelButtonColor,
        };
      }
    } else if (args.length >= 1 && typeof args[0] === 'string') {
      // Simple Swal.fire(title, text, icon) format
      const options = {
        title: args[0],
        text: args[1] || '',
        icon: args[2] || undefined,
        ...darkOptions
      };
      return originalSwalFire(options);
    }
    return originalSwalFire.apply(this, args);
  };
})();
