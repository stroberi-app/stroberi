import { BottomTabBar } from '@react-navigation/bottom-tabs';
import {
  CircleDollarSign,
  Home,
  Plane,
  Settings,
  TrendingUp,
  Wallet,
} from '@tamagui/lucide-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import type React from 'react';
import { useTheme } from 'tamagui';
import { useAdvancedAnalyticsEnabled } from '../../hooks/useAdvancedAnalyticsEnabled';
import { useBudgetingEnabled } from '../../hooks/useBudgetingEnabled';
import { useTripsEnabled } from '../../hooks/useTripsEnabled';
import { Platform } from 'react-native';

const CustomTabBar: React.ComponentProps<typeof Tabs>['tabBar'] = (props) => {
  return (
    <BlurView
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      }}
      intensity={Platform.OS === 'ios' ? 40 : 30}
      experimentalBlurMethod="dimezisBlurView"
      tint="dark"
    >
      <BottomTabBar {...props} />
    </BlurView>
  );
};

export default function TabLayout() {
  const { brandPrimary, seashell } = useTheme();
  const { budgetingEnabled } = useBudgetingEnabled();
  const { tripsEnabled } = useTripsEnabled();
  const { advancedAnalyticsEnabled } = useAdvancedAnalyticsEnabled();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: brandPrimary?.val,
        headerShown: false,
        tabBarInactiveTintColor: seashell?.val,
        tabBarStyle: {
          borderTopColor: '#66666666',
          backgroundColor: 'transparent',
          elevation: 0,
        },
      }}
      tabBar={CustomTabBar}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => <CircleDollarSign color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color }) => <TrendingUp color={color} />,
          href: advancedAnalyticsEnabled ? '/(tabs)/analytics' : null,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => <Plane color={color} />,
          href: tripsEnabled ? ('/(tabs)/trips' as const) : null,
        }}
      />
      <Tabs.Screen
        name="budgets"
        options={{
          title: 'Budgets',
          tabBarIcon: ({ color }) => <Wallet color={color} />,
          href: budgetingEnabled ? '/(tabs)/budgets' : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} />,
        }}
      />
    </Tabs>
  );
}
