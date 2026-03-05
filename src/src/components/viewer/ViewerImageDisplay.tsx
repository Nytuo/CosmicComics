import MovableImage from './MovableImage.tsx';
import Magnifier from './Magnifier.tsx';

interface ViewerImageDisplayProps {
  VIV_On: boolean;
  isMagnifierOn: boolean;
  smartPanelMode: boolean;
  isPanelZoomed: boolean;
  isTransitioning: boolean;
  panelTransform: string;
  imageOne: string | null;
  imageTwo: string | null;
  origins: any[][];
  baseWidth: number | string;
  baseHeight: number | string;
  zoomLevel: number;
  rotation: number;
  preloadedImages: string[];
}

export default function ViewerImageDisplay({
  VIV_On,
  isMagnifierOn,
  smartPanelMode,
  isPanelZoomed,
  isTransitioning,
  panelTransform,
  imageOne,
  imageTwo,
  origins,
  baseWidth,
  baseHeight,
  zoomLevel,
  rotation,
  preloadedImages,
}: ViewerImageDisplayProps) {
  const resolvedWidth =
    typeof baseWidth === 'number' ? baseWidth + zoomLevel + 'px' : 'auto';
  const resolvedHeight =
    typeof baseHeight === 'number' ? baseHeight + zoomLevel + 'px' : 'auto';

  if (VIV_On) {
    return (
      <>
        {preloadedImages.map((el: string, i: number) => (
          <div id={'div_imgViewer_' + i} key={i}>
            <img
              id={'imgViewer_' + i}
              src={el}
              alt={`${i + 1}th page`}
              width={
                typeof baseWidth === 'number'
                  ? baseWidth + zoomLevel + 'px'
                  : 'auto'
              }
              height={
                typeof baseHeight === 'number'
                  ? baseHeight + zoomLevel + 'px'
                  : 'auto'
              }
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                margin: 'auto',
                position: 'relative',
              }}
            />
          </div>
        ))}
      </>
    );
  }

  if (isMagnifierOn) {
    return (
      <Magnifier zoomFactor={2}>
        {imageOne !== null && (
          <MovableImage
            id="imgViewer_0"
            disableMove={true}
            src={imageOne}
            origin={origins[0]}
            center={imageTwo === null}
            width={resolvedWidth}
            height={resolvedHeight}
            rotation={rotation}
            alt="Logo"
          />
        )}
        {imageTwo !== null && (
          <MovableImage
            id="imgViewer_1"
            disableMove={true}
            src={imageTwo}
            origin={origins[1]}
            center={imageOne === null}
            width={resolvedWidth}
            height={resolvedHeight}
            rotation={rotation}
            alt="Logo"
          />
        )}
      </Magnifier>
    );
  }

  return (
    <div
      style={{
        transform:
          smartPanelMode && isPanelZoomed && !isTransitioning
            ? panelTransform
            : 'none',
        transition: 'transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1)',
        transformOrigin: '0 0',
        willChange: 'transform',
      }}
    >
      {imageOne !== null && (
        <MovableImage
          id="imgViewer_0"
          src={imageOne}
          origin={origins[0]}
          center={imageTwo === null}
          disableMove={smartPanelMode}
          width={resolvedWidth}
          height={resolvedHeight}
          rotation={rotation}
          alt="Logo"
        />
      )}
      {imageTwo !== null && (
        <MovableImage
          id="imgViewer_1"
          src={imageTwo}
          origin={origins[1]}
          center={imageOne === null}
          disableMove={smartPanelMode}
          width={resolvedWidth}
          height={resolvedHeight}
          rotation={rotation}
          alt="Logo"
        />
      )}
    </div>
  );
}
