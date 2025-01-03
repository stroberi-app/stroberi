import React, { useEffect } from 'react';
import { WebView } from 'react-native-webview';
import { View, Text } from 'tamagui';
import { useLocalSearchParams, useNavigation } from 'expo-router';

const WebViewScreen = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigation();

  const { url, title } = params;

  useEffect(() => {
    navigation.setOptions({ title });
  }, [title]);

  if (typeof url !== 'string') {
    return (
      <View flex={1} justifyContent="center" alignItems="center">
        <Text>URL not provided</Text>
      </View>
    );
  }
  return (
    <View flex={1}>
      <WebView
        source={{
          uri: url,
        }}
        style={{ flex: 1 }}
      />
    </View>
  );
};

export default WebViewScreen;
