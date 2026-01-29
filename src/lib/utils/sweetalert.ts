import Swal from 'sweetalert2';

// Custom SweetAlert2 configuration matching app's emerald theme
const customSwal = Swal.mixin({
  customClass: {
    popup: 'rounded-2xl shadow-2xl',
    title: 'text-2xl font-bold text-slate-800 dark:text-slate-100',
    htmlContainer: 'text-slate-600 dark:text-slate-300',
    confirmButton: 'btn-confirm-custom',
    cancelButton: 'btn-cancel-custom',
  },
  buttonsStyling: false,
  showClass: {
    popup: 'animate__animated animate__fadeInDown animate__faster'
  },
  hideClass: {
    popup: 'animate__animated animate__fadeOutUp animate__faster'
  }
});

// Add custom CSS for buttons and styling
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    .btn-confirm-custom {
      background: linear-gradient(to right, #10B981, #059669);
      color: white;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
      box-shadow: 0 4px 14px 0 rgba(16, 185, 129, 0.3);
      border: none;
      cursor: pointer;
      margin: 0 8px;
    }
    
    .btn-confirm-custom:hover {
      background: linear-gradient(to right, #059669, #047857);
      transform: translateY(-1px);
      box-shadow: 0 6px 20px 0 rgba(16, 185, 129, 0.4);
    }
    
    .btn-cancel-custom {
      background: white;
      color: #64748b;
      padding: 12px 24px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 14px;
      border: 2px solid #e2e8f0;
      transition: all 0.2s;
      cursor: pointer;
      margin: 0 8px;
    }
    
    .btn-cancel-custom:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }
    
    .swal2-icon.swal2-success {
      border-color: #10B981 !important;
      color: #10B981 !important;
    }
    
    .swal2-icon.swal2-success [class^='swal2-success-line'] {
      background-color: #10B981 !important;
    }
    
    .swal2-icon.swal2-success .swal2-success-ring {
      border-color: rgba(16, 185, 129, 0.3) !important;
    }
    
    .swal2-icon.swal2-error {
      border-color: #EF4444 !important;
      color: #EF4444 !important;
    }
    
    .swal2-icon.swal2-warning {
      border-color: #F59E0B !important;
      color: #F59E0B !important;
    }
    
    .swal2-icon.swal2-info {
      border-color: #3B82F6 !important;
      color: #3B82F6 !important;
    }
    
    .swal2-popup {
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    /* Sparkle animation */
    @keyframes sparkle {
      0% {
        opacity: 0;
        transform: scale(0) rotate(0deg);
      }
      50% {
        opacity: 1;
        transform: scale(1) rotate(180deg);
      }
      100% {
        opacity: 0;
        transform: scale(0) rotate(360deg);
      }
    }
    
    /* Timer progress bar styling */
    .swal2-timer-progress-bar {
      background: linear-gradient(to right, #10B981, #34D399) !important;
    }
    
    /* Success icon enhancement */
    .swal2-icon.swal2-success {
      border-width: 3px !important;
    }
    
    .swal2-success-ring {
      border: 3px solid rgba(16, 185, 129, 0.2) !important;
    }
    
    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .swal2-popup {
        background: #1e293b !important;
        color: #f1f5f9 !important;
      }
      
      .btn-cancel-custom {
        background: #334155;
        color: #e2e8f0;
        border-color: #475569;
      }
      
      .btn-cancel-custom:hover {
        background: #475569;
        border-color: #64748b;
      }
    }
  `;
  document.head.appendChild(style);
}

// Alert helper functions
export const alert = {
  /**
   * Success notification - Modern & Eye-catching
   */
  success: (title: string, text?: string) => {
    return customSwal.fire({
      title,
      text,
      icon: 'success',
      iconColor: '#10B981',
      background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      showClass: {
        popup: 'animate__animated animate__bounceIn animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__zoomOut animate__faster'
      },
      didOpen: (popup) => {
        // Add sparkle effect
        const sparkles = document.createElement('div');
        sparkles.style.cssText = `
          position: absolute;
          top: -20px;
          left: 50%;
          transform: translateX(-50%);
          width: 100px;
          height: 100px;
          pointer-events: none;
        `;
        sparkles.innerHTML = `
          <div style="position: absolute; top: 10px; left: 10px; width: 8px; height: 8px; background: #10B981; border-radius: 50%; opacity: 0; animation: sparkle 1s ease-out;"></div>
          <div style="position: absolute; top: 15px; right: 15px; width: 6px; height: 6px; background: #34D399; border-radius: 50%; opacity: 0; animation: sparkle 1s 0.1s ease-out;"></div>
          <div style="position: absolute; bottom: 20px; left: 25px; width: 10px; height: 10px; background: #6EE7B7; border-radius: 50%; opacity: 0; animation: sparkle 1s 0.2s ease-out;"></div>
          <div style="position: absolute; bottom: 15px; right: 20px; width: 7px; height: 7px; background: #10B981; border-radius: 50%; opacity: 0; animation: sparkle 1s 0.15s ease-out;"></div>
        `;
        
        const iconContainer = popup.querySelector('.swal2-icon');
        if (iconContainer) {
          iconContainer.appendChild(sparkles);
        }
      }
    });
  },

  /**
   * Error notification
   */
  error: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'OK',
    });
  },

  /**
   * Warning notification
   */
  warning: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'OK',
    });
  },

  /**
   * Info notification
   */
  info: (title: string, text?: string) => {
    return customSwal.fire({
      icon: 'info',
      title,
      text,
      confirmButtonText: 'OK',
    });
  },

  /**
   * Confirmation dialog
   */
  confirm: async (title: string, text?: string, confirmText = 'Ya', cancelText = 'Batal') => {
    const result = await customSwal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      reverseButtons: true,
    });
    return result.isConfirmed;
  },

  /**
   * Loading state
   */
  loading: (title: string, text?: string) => {
    customSwal.fire({
      title,
      text,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });
    
    return {
      close: () => Swal.close(),
      update: (newTitle: string, newText?: string) => {
        customSwal.update({
          title: newTitle,
          text: newText,
        });
      }
    };
  },

  /**
   * Close any open alert
   */
  close: () => {
    Swal.close();
  }
};

export default alert;
