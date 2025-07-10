import { createContext, useContext, useState } from 'react';

export interface IToast {
  summary: string;
  detail?: string;
  type?: string;
}

const ToastController = () => {
  const [toast, setToast] = useState<IToast | null>();

  return {
    toast,
    setToast,
  };
};

const ToastContext = createContext<ReturnType<typeof ToastController>>({
  toast: { summary: '', detail: '', type: 'Success' },
  setToast: () => [],
});

export const ToastProvider = ({ children }: { children: React.ReactNode }) => (
  <ToastContext.Provider value={ToastController()}>
    {children}
  </ToastContext.Provider>
);

export const useToast = () => useContext(ToastContext);
