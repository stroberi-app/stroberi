import * as Burnt from 'burnt';
import type { AlertOptions } from 'burnt/build/types';
import type { SFSymbol } from 'sf-symbols-typescript';

export interface IconParams {
  ios: {
    /**
     * The name of an iOS-only SF Symbol. For a full list, see https://developer.apple.com/sf-symbols/.
     * @platform ios
     */
    name: SFSymbol | string;
    /**
     * Change the custom icon color, default is system blue.
     * @platform ios
     */
    color: string;
  };
  web?: JSX.Element;
}

interface BurntCroutonProps {
  title: string;
  message?: string;
  preset?: 'error' | 'done' | 'none' | 'custom';
  duration?: number;
  haptic?: 'success' | 'warning' | 'error' | 'none';
  shouldDismissByDrag?: boolean;
  from?: 'top' | 'bottom';
  layout?: {
    iconSize?: {
      height: number;
      width: number;
    };
  };
  icon?: IconParams;
}

const useToast = () => {
  const show = async (props: BurntCroutonProps) => {
    const {
      title,
      message,
      preset = 'done',
      duration = 2,
      haptic = 'none',
      shouldDismissByDrag = true,
      from = 'top',
      layout = {
        iconSize: {
          height: 24,
          width: 24,
        },
      },
      icon = {
        ios: {
          name: 'checkmark.seal',
          color: 'hsl(151, 50.0%, 53.2%)',
        },
      },
    } = props;

    Burnt.toast({
      title,
      message,
      preset,
      duration,
      haptic,
      shouldDismissByDrag,
      from,
      layout,
      icon,
    });
  };
  const alert = (props: AlertOptions) => {
    Burnt.alert({
      preset: 'done', // or "error", "heart", "custom"
      message: '', // optional
      duration: 8, // duration in seconds
      layout: {
        iconSize: {
          height: 18,
          width: 18,
        },
      },
      // @ts-expect-error ignore
      icon: {
        ios: {
          // SF Symbol. For a full list, see https://developer.apple.com/sf-symbols/.
          name: 'checkmark.seal',
          color: '#1D9BF0',
        },
      },
      ...props,
    });
  };

  return {
    show,
    alert,
  };
};

export default useToast;
