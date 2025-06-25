import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';
import { getProvider } from '@/API/providers';
import { Check, X, BookOpen, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookCopy, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import DatabaseEditorDialog from '../dialogs/DatabaseEditorDialog.tsx';
import MoreInfoDialog from '../dialogs/MoreInfoDialog.tsx';
import RematchDialog from '../dialogs/RematchDialog.tsx';
import {
  useContentViewer,
  type ContentViewerProps,
} from './contentviewer/useContentViewer.ts';
import { HeroCard } from './contentviewer/HeroCard.tsx';
import { DetailsCard } from './contentviewer/DetailsCard.tsx';
import { VolumesSection } from './contentviewer/VolumesSection.tsx';
import { TabsSection } from './contentviewer/TabsSection.tsx';
import { ReadingProgressCard } from './contentviewer/ReadingProgressCard.tsx';

function ContentViewer(props: ContentViewerProps) {
  const {
    TheBook,
    type,
    handleChangeToDetails,
    onDownloaderDetailPage: onDownloaderDetailPage,
    downloadProgress: downloadProgress,
    onVolumeDownload,
    onDelete,
    onBack,
  } = props;

  const cv = useContentViewer(props);
  const { t } = useTranslation();

  const statusBadgeInfo = cv.getStatusBadgeInfo();
  const statusBadge = (() => {
    if (!statusBadgeInfo) return null;
    const iconMap: Record<string, React.ReactNode> = {
      Check: <Check className="h-3 w-3 mr-1" />,
      X: <X className="h-3 w-3 mr-1" />,
      BookOpen: <BookOpen className="h-3 w-3 mr-1" />,
      HelpCircle: <HelpCircle className="h-3 w-3 mr-1" />,
    };
    return (
      <Badge variant={statusBadgeInfo.variant}>
        {iconMap[statusBadgeInfo.icon]}
        {t(statusBadgeInfo.text)}
      </Badge>
    );
  })();

  function onClickHandleOpenMoreInfo(el: any) {
    const providerImpl = getProvider(cv.provider);
    if (!providerImpl) return;
    const imgUrl = providerImpl.parseCharacterImage(el.image_url);
    const url =
      cv.provider === providerEnum.Marvel
        ? (tryToParse(el.url)?.[0]?.url ?? '')
        : el.url;
    cv.handleOpenMoreInfo(el.name, el.description, imgUrl, url);
  }

  const externalUrl = cv.getExternalUrl();
  const extra = TheBook.extra as Record<string, any> | undefined;
  const hasCharacters = cv.getCharactersCount() > 0 || cv.characters.length > 0;
  const hasStaff = cv.getCreatorsCount() > 0 || cv.staff.length > 0;
  const hasRelations = cv.relations.length > 0;
  const hasVolumes = type === 'series' && cv.openExplorer.explorer.length > 0;
  const hasTabContent = hasCharacters || hasStaff || hasRelations;

  return (
    <>
      <DatabaseEditorDialog
        openModal={cv.openDatabaseEditorDialog}
        onClose={cv.handleCloseDatabaseEditorDialog}
        TheBook={TheBook}
        type={type === 'volume' ? 'book' : 'series'}
        onSuccess={async () => {
          if (props.onRefresh) await props.onRefresh();
        }}
      />
      <MoreInfoDialog
        openModal={cv.openMoreInfo}
        onClose={cv.closeMoreInfo}
        desc={cv.moreInfoContent.desc}
        name={cv.moreInfoContent.name}
        hrefURL={cv.moreInfoContent.href}
        image={cv.moreInfoContent.image}
        type={cv.moreInfoContent.type}
      />
      <RematchDialog
        openModal={cv.openRematchDialog}
        onClose={cv.handleCloseRematchDialog}
        provider={cv.provider}
        type={type === 'volume' ? 'book' : 'series'}
        oldID={TheBook.id}
        onSuccess={async () => {
          if (props.onRefresh) await props.onRefresh();
        }}
      />

      <img id="imageBGOV2" src="#" alt="#" className="hidden" />

      <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
        <HeroCard
          TheBook={TheBook}
          type={type}
          provider={cv.provider}
          externalUrl={externalUrl}
          coverUrl={cv.getCoverUrl()}
          title={cv.getTitle(TheBook.title)}
          dateDisplay={cv.getDateDisplay(t)}
          rating={cv.rating}
          favorite={cv.favorite}
          hasFile={cv.hasFile}
          downloadProgress={downloadProgress}
          onDownloaderDetailPage={onDownloaderDetailPage}
          onPlay={cv.handlePlay}
          onFavoriteToggle={cv.handleFavoriteToggle}
          onStatusRead={cv.handleStatusRead}
          onStatusReading={cv.handleStatusReading}
          onStatusUnread={cv.handleStatusUnread}
          onRatingChange={cv.handleRatingChange}
          onEditClick={() => cv.setOpenDatabaseEditorDialog(true)}
          onRefreshMeta={cv.handleRefreshMeta}
          onRematchClick={cv.handleOpenRematchDialog}
          onDelete={onDelete ? cv.handleDelete : undefined}
          onBack={onBack}
          statusBadge={statusBadge}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {cv.isValid(TheBook.description) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    {t('description')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: (() => {
                        try {
                          return JSON.parse(TheBook.description);
                        } catch {
                          return TheBook.description;
                        }
                      })(),
                    }}
                    className="prose prose-sm dark:prose-invert max-w-none text-justify leading-relaxed"
                  />
                </CardContent>
              </Card>
            )}

            {type === 'volume' &&
              cv.isValid(extra?.collectedIssues) &&
              extra?.collectedIssues !== '0' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookCopy className="h-4 w-4" />
                      {t('collected-issues')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(extra?.collectedIssues)
                        ? extra.collectedIssues
                        : tryToParse(extra?.collectedIssues)
                      ).map((issue: { name: string }, index: number) => (
                        <Badge key={index} variant="outline">
                          {issue.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {type === 'volume' &&
              cv.isValid(extra?.collections) &&
              extra?.collections !== '0' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookCopy className="h-4 w-4" />
                      {t('collections')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(extra?.collections)
                        ? extra.collections
                        : tryToParse(extra?.collections)
                      ).map((col: { name: string }, index: number) => (
                        <Badge key={index} variant="outline">
                          {col.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

            {cv.isValid(extra?.variants) &&
              cv.provider === providerEnum.Marvel && (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('variantsList')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(extra?.variants)
                        ? extra.variants
                        : tryToParse(extra?.variants)
                      ).map((variant: { name: string }, index: number) => (
                        <Badge key={index} variant="secondary">
                          {variant.name}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>

          <div className="space-y-6">
            <DetailsCard
              TheBook={TheBook}
              type={type}
              provider={cv.provider}
              isValid={cv.isValid}
              hasValidPrices={cv.hasValidPrices}
              getSeriesName={cv.getSeriesName}
            />
          </div>
        </div>

        <ReadingProgressCard
          type={type}
          book={type === 'volume' ? (TheBook as DisplayBook) : undefined}
          readStatSeries={cv.readStatSeries}
          getReadingProgress={cv.getReadingProgress}
        />

        {hasVolumes && (
          <VolumesSection
            openExplorer={cv.openExplorer}
            type={type}
            provider={cv.provider}
            showPlaceholders={cv.showPlaceholders}
            onTogglePlaceholders={() =>
              cv.setShowPlaceholders(!cv.showPlaceholders)
            }
            handleChangeToDetails={handleChangeToDetails}
            onVolumeDownload={onVolumeDownload}
          />
        )}

        {hasTabContent && (
          <TabsSection
            characters={cv.characters}
            staff={cv.staff}
            relations={cv.relations}
            provider={cv.provider}
            hasCharacters={hasCharacters}
            hasStaff={hasStaff}
            hasRelations={hasRelations}
            getCharactersCount={cv.getCharactersCount}
            getCreatorsCount={cv.getCreatorsCount}
            onOpenMoreInfo={cv.handleOpenMoreInfo}
            onClickHandleOpenMoreInfo={onClickHandleOpenMoreInfo}
          />
        )}

        <div className="text-center pb-4">
          <p className="text-xs text-muted-foreground">
            {cv.getProviderLabel()}
          </p>
        </div>
      </div>
    </>
  );
}

export default ContentViewer;
