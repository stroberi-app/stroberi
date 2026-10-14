import { useEffect } from 'react';
import { seedDefaultCategories } from '../database/actions/categories';

export const useSeedCategories = () => {
  useEffect(() => {
    seedDefaultCategories().catch(() => {
      // Already logged by the action; the app stays usable without defaults.
    });
  }, []);
};
