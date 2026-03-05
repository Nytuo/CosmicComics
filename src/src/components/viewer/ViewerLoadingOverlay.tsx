import { Progress } from '@/components/ui/progress';
import { useTranslation } from 'react-i18next';

interface ViewerLoadingOverlayProps {
  unzipStatus: {
    status: string;
    percentage: number;
    current_file: string;
  };
}

export default function ViewerLoadingOverlay({
  unzipStatus,
}: ViewerLoadingOverlayProps) {
  const { t } = useTranslation();

  return (
    <div
      id="overlay"
      style={{
        background: 'var(--theme-gradient, var(--background))',
        display: 'none',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginTop: '25%',
          marginLeft: '10%',
          marginRight: '10%',
        }}
      >
        <Progress value={unzipStatus.percentage} />
        <p id="overlaymsg" style={{ marginTop: '10px' }}>
          {t('extracting')} ({unzipStatus.current_file} {unzipStatus.percentage}
          %)
        </p>
      </div>
    </div>
  );
}
