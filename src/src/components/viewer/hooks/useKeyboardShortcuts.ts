import * as React from 'react';

export interface KeyboardShortcutsParams {
  smartPanelMode: boolean;
  isPanelZoomed: boolean;
  rotation: number;
  zoomLevel: number;
  listofImgState: any[];
  setIsPanelZoomed: (v: boolean) => void;
  setPanelTransform: (v: string) => void;
  setCurrentPanelIndex: (v: number) => void;
  setRotation: (v: number) => void;
  setZoomLevel: (v: number) => void;
  setCurrentPage: (v: number) => void;
  PreviousPage: () => void;
  NextPage: () => void;
  PreviousPanel: () => void;
  NextPanel: () => void;
  Reader: (imgs: any[], page: number) => void;
}

export function useKeyboardShortcuts(params: KeyboardShortcutsParams) {
  const {
    smartPanelMode,
    isPanelZoomed,
    rotation,
    zoomLevel,
    listofImgState,
    setIsPanelZoomed,
    setPanelTransform,
    setCurrentPanelIndex,
    setRotation,
    setZoomLevel,
    setCurrentPage,
    PreviousPage,
    NextPage,
    PreviousPanel,
    NextPanel,
    Reader,
  } = params;

  React.useLayoutEffect(() => {
    function keyListener(e: { ctrlKey: any; shiftKey: any; key: string }) {
      if (!e.ctrlKey && !e.shiftKey && e.key === 'ArrowLeft') {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        smartPanelMode ? PreviousPanel() : PreviousPage();
      } else if (!e.ctrlKey && !e.shiftKey && e.key === 'ArrowRight') {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        smartPanelMode ? NextPanel() : NextPage();
      } else if (e.key === 'Escape') {
        if (isPanelZoomed) {
          setIsPanelZoomed(false);
          setPanelTransform('');
          setCurrentPanelIndex(-1);
        } else {
          document.exitFullscreen();
        }
      } else if (e.key === 'f') {
        document.documentElement.requestFullscreen();
      } else if (!e.ctrlKey && !e.shiftKey && e.key === 'ArrowUp') {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        smartPanelMode ? PreviousPanel() : PreviousPage();
      } else if (!e.ctrlKey && !e.shiftKey && e.key === 'ArrowDown') {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        smartPanelMode ? NextPanel() : NextPage();
      } else if (!e.ctrlKey && e.shiftKey && e.key === 'ArrowUp') {
        setCurrentPage(0);
        Reader(listofImgState, 0);
      } else if (!e.ctrlKey && e.shiftKey && e.key === 'ArrowDown') {
        setCurrentPage(listofImgState.length - 1);
        Reader(listofImgState, listofImgState.length - 1);
      } else if (!e.ctrlKey && e.shiftKey && e.key === 'ArrowLeft') {
        setCurrentPage(0);
        Reader(listofImgState, 0);
      } else if (!e.ctrlKey && e.shiftKey && e.key === 'ArrowRight') {
        setCurrentPage(listofImgState.length - 1);
        Reader(listofImgState, listofImgState.length - 1);
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'ArrowLeft') {
        setRotation(rotation - 90);
      } else if (e.ctrlKey && !e.shiftKey && e.key === 'ArrowRight') {
        setRotation(rotation + 90);
      }
    }

    const zoom = (e: { shiftKey: any; deltaY: number }) => {
      if (e.shiftKey) {
        if (e.deltaY < 0) {
          setZoomLevel(zoomLevel + 20);
        } else {
          setZoomLevel(zoomLevel - 20);
        }
      }
    };

    document.addEventListener('keyup', keyListener);
    document.addEventListener('wheel', zoom);

    return () => {
      document.removeEventListener('keyup', keyListener);
      document.removeEventListener('wheel', zoom);
    };
  });
}
