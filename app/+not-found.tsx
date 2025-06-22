import { Link, useNavigation } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View } from 'tamagui';

export default function NotFoundScreen() {
  const navigation = useNavigation();
  const { top } = useSafeAreaInsets();
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation.setOptions]);
  return (
    <>
      <View padding={10} paddingTop={32 + top} backgroundColor="$black4" flex={1}>
        <Text>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText} color="$stroberi">
            Go to home screen!
          </Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    fontSize: 14,
  },
});
