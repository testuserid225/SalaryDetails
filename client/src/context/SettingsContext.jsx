import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { formatCurrency as formatCurrencyUtil } from '../utils/formatters';

const SettingsContext = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    currency: 'INR',
    currencySymbol: '₹',
    financialYearStartMonth: 4,
    theme: 'light',
  });
  const [loading, setLoading] = useState(false);

  const fetchSettings = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (error) {
      console.warn('Failed to fetch user settings:', error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = async (newSettings) => {
    try {
      const res = await api.put('/settings', newSettings);
      if (res.success && res.data) {
        setSettings(res.data);
      }
      return res;
    } catch (error) {
      throw error;
    }
  };

  const formatCurrency = useCallback(
    (amount) => {
      return formatCurrencyUtil(amount, settings.currency, settings.currencySymbol);
    },
    [settings.currency, settings.currencySymbol]
  );

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        fetchSettings,
        updateSettings,
        formatCurrency,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};
