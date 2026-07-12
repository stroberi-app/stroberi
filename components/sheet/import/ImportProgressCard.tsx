import {
  AlertCircle,
  CheckCircle,
  FileText,
  FolderInput,
  Info,
} from '@tamagui/lucide-icons';
import { Progress, Text, XStack, YStack } from 'tamagui';
import type { ImportProgress } from '../../../features/import/useCsvImport';

const getPhaseIcon = (phase: ImportProgress['phase']) => {
  switch (phase) {
    case 'parsing':
      return <FileText size={16} color="$blue9" />;
    case 'validating':
      return <AlertCircle size={16} color="$orange9" />;
    case 'importing':
      return <FolderInput size={16} color="$green9" />;
    case 'complete':
      return <CheckCircle size={16} color="$green9" />;
    default:
      return <Info size={16} color="$gray9" />;
  }
};

type ImportProgressCardProps = {
  progress: ImportProgress;
};

export const ImportProgressCard = ({ progress }: ImportProgressCardProps) => {
  const percent = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <YStack gap={'$4'} my={'$4'} p={'$4'} backgroundColor={'$gray2'} borderRadius={'$4'}>
      <XStack alignItems={'center'} justifyContent={'center'} gap={'$3'}>
        {getPhaseIcon(progress.phase)}
        <Text fontSize={'$4'} fontWeight={'600'} textAlign={'center'} color={'$gray12'}>
          {progress.message}
        </Text>
      </XStack>

      <YStack gap={'$2'}>
        <Progress value={percent} backgroundColor={'$gray5'} height={'$1'}>
          <Progress.Indicator backgroundColor={'$green9'} />
        </Progress>
        <XStack justifyContent={'space-between'} alignItems={'center'}>
          <Text fontSize={'$2'} color={'$gray10'}>
            {progress.phase === 'parsing' && 'Getting ready...'}
            {progress.phase === 'validating' && `${progress.current} / ${progress.total}`}
            {progress.phase === 'importing' && `${progress.current} / ${progress.total}`}
            {progress.phase === 'complete' && 'Complete!'}
          </Text>
          <Text fontSize={'$2'} color={'$gray10'}>
            {progress.total > 0 ? `${Math.round(percent)}%` : ''}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
};
