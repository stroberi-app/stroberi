import { ArrowLeft } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Button, Text, View } from 'tamagui';

const WebViewScreen = () => {
  const params = useLocalSearchParams();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const { url } = params;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation.setOptions]);

  if (typeof url !== 'string') {
    return (
      <View flex={1} justifyContent="center" alignItems="center">
        <Text>URL not provided</Text>
      </View>
    );
  }

  return (
    <View flex={1} paddingTop={insets.top} paddingBottom={insets.bottom}>
      <View
        flexDirection="row"
        alignItems="center"
        paddingHorizontal={16}
        paddingVertical={8}
      >
        <Button onPress={() => navigation.goBack()}>
          <ArrowLeft />
          Back
        </Button>
      </View>
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
