import { PanelRect } from '@/API/TauriAPI';

interface ViewerPanelDebugOverlayProps {
  smartPanelMode: boolean;
  showDebugOverlay: boolean;
  panels: PanelRect[];
  imageOne: string | null;
  VIV_On: boolean;
  webToonMode: boolean;
  currentPanelIndex: number;
  origins: any[][];
  isPanelZoomed: boolean;
  isTransitioning: boolean;
  panelTransform: string;
}

export default function ViewerPanelDebugOverlay({
  smartPanelMode,
  showDebugOverlay,
  panels,
  imageOne,
  VIV_On,
  webToonMode,
  currentPanelIndex,
  origins,
  isPanelZoomed,
  isTransitioning,
  panelTransform,
}: ViewerPanelDebugOverlayProps) {
  if (
    !smartPanelMode ||
    !showDebugOverlay ||
    panels.length === 0 ||
    !imageOne ||
    VIV_On ||
    webToonMode
  ) {
    return null;
  }

  return (
    <div
      id="panel-debug-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 9998,
        transform:
          smartPanelMode && isPanelZoomed && !isTransitioning
            ? panelTransform
            : 'none',
        transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
        transformOrigin: '0 0',
      }}
    >
      {panels.map((panel, idx) => {
        const imgEl = document.getElementById(
          'imgViewer_0'
        ) as HTMLImageElement;
        if (!imgEl) return null;

        const naturalW = imgEl.naturalWidth;
        const naturalH = imgEl.naturalHeight;
        if (naturalW === 0 || naturalH === 0) return null;

        const displayW = imgEl.offsetWidth;
        const displayH = imgEl.offsetHeight;
        const scaleX = displayW / naturalW;
        const scaleY = displayH / naturalH;

        const panelDisplayX = panel.x * scaleX;
        const panelDisplayY = panel.y * scaleY;
        const panelDisplayW = panel.w * scaleX;
        const panelDisplayH = panel.h * scaleY;

        const isActive = idx === currentPanelIndex;

        const imgOriginX =
          typeof origins[0]?.[0] === 'number' ? origins[0][0] : 0;
        const imgOriginY =
          typeof origins[0]?.[1] === 'number' ? origins[0][1] : 0;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: imgOriginX + panelDisplayX,
              top: imgOriginY + panelDisplayY,
              width: panelDisplayW,
              height: panelDisplayH,
              border: isActive ? '3px solid #00ff00' : '2px solid #ff0000',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 2,
                left: 2,
                background: isActive ? '#00ff00' : '#ff0000',
                color: 'white',
                padding: '2px 6px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {idx + 1}
            </div>
          </div>
        );
      })}
    </div>
  );
}
