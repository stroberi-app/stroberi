import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const { StorageAccessFramework, writeAsStringAsync, documentDirectory, EncodingType } =
  FileSystem;

const androidExport = async (fileName: string, fileContent: string, mimeType: string) => {
  const permissions =
    await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    throw Error('Permissions not granted');
  }

  try {
    const uri = await StorageAccessFramework.createFileAsync(
      permissions.directoryUri,
      fileName,
      mimeType
    );

    await writeAsStringAsync(uri, fileContent, {
      encoding: EncodingType.UTF8,
    });
  } catch (err) {
    console.log(err);
    throw Error('An error occurred while exporting file');
  }
};

const shareExport = async (fileName: string, fileContent: string, mimeType: string) => {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    throw Error('Sharing not available');
  }

  const localBackupFileRoute = `${documentDirectory}${fileName}`;

  try {
    await writeAsStringAsync(localBackupFileRoute, fileContent, {
      encoding: EncodingType.UTF8,
    });

    await Sharing.shareAsync(localBackupFileRoute, {
      dialogTitle: fileName,
      UTI: 'public.item',
      mimeType,
    });
  } catch (err) {
    console.log(err);
    throw Error('An error occurred while exporting file');
  }
};

export const doExport = async (fileName: string, fileContent: string, mimeType: string) => {
  if (Platform.OS === 'android') {
    try {
      await androidExport(fileName, fileContent, mimeType);
    } catch (e) {
      console.log('SAF export failed, falling back to share:', e);
      return shareExport(fileName, fileContent, mimeType);
    }
  } else {
    return shareExport(fileName, fileContent, mimeType);
  }
};