import { BottomTabBar } from '@react-navigation/bottom-tabs';
import { CircleDollarSign, Home, Settings } from '@tamagui/lucide-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import type React from 'react';
import { useTheme } from 'tamagui';

const CustomTabBar: React.ComponentProps<typeof Tabs>['tabBar'] = (props) => {
  return (
    <BlurView
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
      }}
      intensity={40}
      tint="dark"
    >
      <BottomTabBar {...props} />
    </BlurView>
  );
};

export default function TabLayout() {
  const { brandPrimary, seashell } = useTheme();
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
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings color={color} />,
        }}
      />
    </Tabs>
  );
}
