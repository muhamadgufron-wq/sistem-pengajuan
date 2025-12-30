import { useState, useEffect } from 'react';

export function useSubmissionStatus() {
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/settings/submission-status');
        const data = await res.json();
        if (data.success) {
          setIsOpen(data.isOpen);
        }
      } catch (error) {
        console.error('Failed to fetch submission status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return { isOpen, isLoading };
}
