import React from 'react';
import { useTranslation } from 'react-i18next';
import { resolveImageUrl } from '@/utils/imageUrl.ts';
import styles from './card.module.css';
import { Badge } from '../../ui/badge.tsx';
import { CheckCircle2, Heart } from 'lucide-react';

interface CardProps {
  title: string;
  description: string;
  image?: string;
  onClick?: () => void;
  apiName?: string;
  favorite?: boolean;
  read?: boolean;
  className?: string;
}

export const GRID_CARD_CLASS =
  'm-2 w-[calc(50%-1rem)] sm:w-3xs decoration-none block cursor-pointer bg-card overflow-hidden rounded-md shadow-md';

export const Card: React.FC<CardProps> = ({
  title,
  description,
  image,
  onClick,
  apiName,
  favorite,
  read,
  className,
}) => {
  const { t } = useTranslation();
  const resolvedImage = resolveImageUrl(image);

  const getApiColor = (api?: string) => {
    if (!api) return '';

    const apiLower = api.toLowerCase();
    switch (apiLower) {
      case 'google_books':
        return styles.apiGoogleBooks;
      case 'anilist-manga':
        return styles.apiAnilist;
      case 'mangadex':
        return styles.apiMangadex;
      case 'manual':
        return styles.apiManual;
      case 'jellyfin':
        return styles.apiJellyfin;
      default:
        return styles.apiDefault;
    }
  };

  const formatApiName = (api?: string) => {
    if (!api) return '';

    const apiLower = api.toLowerCase();
    switch (apiLower) {
      case 'google_books':
        return 'Google Books';
      case 'anilist-manga':
        return 'ANILIST';
      case 'manual':
        return 'Manual';
      case 'jellyfin':
        return 'Jellyfin';
      case 'mangadex':
        return 'Mangadex';
      default:
        return api.toUpperCase();
    }
  };

  return (
    <div
      className={
        className ??
        'm-2 w-3xs decoration-none block cursor-pointer bg-card overflow-hidden rounded-md shadow-md'
      }
      onClick={() => {
        onClick?.();
      }}
    >
      {resolvedImage ? (
        <div className={styles.imageWrapper}>
          <div
            className={styles.bgImage}
            style={{
              backgroundImage: `url(${resolvedImage})`,
              filter: 'blur(12px)',
              transform: 'scale(1.1)',
              opacity: '0.7',
            }}
          />
          <div
            className={styles.foregroundImage}
            style={{ backgroundImage: `url(${resolvedImage})` }}
          />
          <div className={styles.apiBadgeContainer}>
            {apiName && (
              <span className={`${styles.apiBadge} ${getApiColor(apiName)}`}>
                {formatApiName(apiName)}
              </span>
            )}
            {favorite && (
              <Badge variant="destructive">
                <Heart className="h-3 w-3 mr-1 fill-current" />
                {t('favorite')}
              </Badge>
            )}
          </div>
          {read && (
            <CheckCircle2 className="absolute bottom-2 right-2 z-20 h-5 w-5 text-green-500 drop-shadow" />
          )}
        </div>
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.apiBadgeContainer}>
            {apiName && (
              <span className={`${styles.apiBadge} ${getApiColor(apiName)}`}>
                {formatApiName(apiName)}
              </span>
            )}
            {favorite && (
              <Badge variant="destructive">
                <Heart className="h-3 w-3 mr-1 fill-current" />
                {t('favorite')}
              </Badge>
            )}
          </div>
        </div>
      )}
      <div className={styles.content}>
        <h3 className="text-foreground line-clamp-1">{title}</h3>
        <p className="text-gray-400 m-0 break-keep line-clamp-2">
          {description ? description.trim() : t('no-description-available')}
        </p>
      </div>
    </div>
  );
};
