import { toast } from 'sonner';

export function useToastAlert() {
  const alert = (message, type = 'default') => {
    const toastConfig = {
      default: { description: message },
      success: { description: message },
      error: { description: message },
      info: { description: message }
    };

    if (type === 'success') {
      toast.success(toastConfig.success.description);
    } else if (type === 'error') {
      toast.error(toastConfig.error.description);
    } else if (type === 'info') {
      toast.info(toastConfig.info.description);
    } else {
      toast(toastConfig.default.description);
    }
  };

  return { alert };
}