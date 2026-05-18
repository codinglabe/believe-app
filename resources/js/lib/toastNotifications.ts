import { toast, ToastOptions } from 'react-hot-toast';

const commonOptions: ToastOptions = {
  position: "top-right",
  duration: 3000,
  style: {
    background: "#4CAF50",
    color: "#fff",
    fontWeight: "bold",
  },
  iconTheme: {
    primary: "#fff",
    secondary: "#4CAF50",
  },
};

export function showSuccess(message: string) {
  toast.success(message, commonOptions);
}

export function showError(message: string) {
  toast.error(message, {
    ...commonOptions,
    style: {
      ...commonOptions.style,
      background: "#F44336",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#F44336",
    },
  });
}

export function showInfo(message: string) {
  toast(message, {
    ...commonOptions,
    icon: "ℹ️",
    style: {
      ...commonOptions.style,
      background: "#2196F3",
    },
    iconTheme: {
      primary: "#fff",
      secondary: "#2196F3",
    },
  });
}