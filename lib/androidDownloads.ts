import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const { StorageAccessFramework } = FileSystem;

type SaveToDownloadsOptions = {
  sourceUri: string;
  filename: string;
  mimeType: string;
};

/**
 * Saves a file to a user-selected public folder on Android using the SAF APIs.
 * No-op on other platforms.
 */
export const saveUriToDownloadsOnAndroid = async ({
  sourceUri,
  filename,
  mimeType,
}: SaveToDownloadsOptions): Promise<void> => {
  if (Platform.OS !== 'android') {
    return;
  }

  if (!StorageAccessFramework) {
    throw new Error('Storage Access Framework is unavailable on this device.');
  }

  const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();

  if (!permissions.granted || !permissions.directoryUri) {
    throw new Error('Please choose a folder to save the exported file.');
  }

  const fileString = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const newFileUri = await StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    filename,
    mimeType
  );

  await FileSystem.writeAsStringAsync(newFileUri, fileString, {
    encoding: FileSystem.EncodingType.Base64,
  });
};
