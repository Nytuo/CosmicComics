import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import ContentViewer from './ContentViewer.tsx';
import { useEffect, useState } from 'react';
import * as TauriAPI from '@/API/TauriAPI.ts';

type BookOrSeries = DisplayBook | DisplaySeries;

function SeriesDetails({
  stateSeries,
  handleAddBreadcrumbs,
  handleChangeToDetails,
  handleChangeToSeries,
  onDelete,
  onBack,
}: {
  stateSeries: { open: boolean; series: DisplaySeries; provider: any } | null;
  handleAddBreadcrumbs: any;
  handleChangeToDetails: (
    open: boolean,
    book: BookOrSeries,
    provider: any
  ) => void;
  handleChangeToSeries: (
    open: boolean,
    series: BookOrSeries,
    provider: any
  ) => void;
  onDelete?: () => void;
  onBack?: () => void;
}) {
  const [series, setSeries] = useState<DisplaySeries | null>(
    stateSeries?.series || null
  );

  useEffect(() => {
    if (stateSeries && stateSeries.series) {
      handleAddBreadcrumbs(stateSeries.series.title, () => {
        handleChangeToSeries(true, stateSeries.series, stateSeries.provider);
      });
    }
  }, []);

  useEffect(() => {
    if (stateSeries?.series) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSeries((prev) => {
        if (prev?.id === stateSeries.series.id) return prev;
        return stateSeries.series;
      });
    }
  }, [stateSeries?.series]);

  const handleRefresh = async () => {
    if (!series) return;
    try {
      const refreshedSeries = await TauriAPI.getSeriesById(series.id);
      if (refreshedSeries) {
        setSeries(refreshedSeries);
      }
    } catch (err) {
      console.error('Failed to refresh series:', err);
    }
  };

  return (
    <>
      {stateSeries && stateSeries.open && series ? (
        <ContentViewer
          type={'series'}
          provider={stateSeries.provider}
          TheBook={series}
          handleAddBreadcrumbs={handleAddBreadcrumbs}
          handleChangeToDetails={handleChangeToDetails}
          onDelete={onDelete}
          onRefresh={handleRefresh}
          onBack={onBack}
        />
      ) : (
        <></>
      )}
    </>
  );
}

export default SeriesDetails;
