import React from 'react';
import { Card } from './Card.tsx';
import type { DisplayBook, DisplaySeries } from '@/interfaces/IDisplayBook.ts';
import { getProvider } from '@/API/providers';
import { t } from 'i18next';
import { jellyfinRef } from '@/API/jellyfinLibrary.ts';

type BookOrSeries = DisplayBook | DisplaySeries;

interface BookCardProps {
  book: BookOrSeries;
  provider: number | string;
  handleOpenDetails?: (
    isBook: boolean,
    book: BookOrSeries,
    id: string | number
  ) => void;
  onClick?: () => void;
  type: 'book' | 'lite' | 'volume';
  className?: string;
}

const CardWrapper: React.FC<BookCardProps> = ({
  book,
  provider,
  handleOpenDetails,
  onClick,
  className,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (handleOpenDetails) {
      handleOpenDetails(true, book, book.provider_id);
    }
  };

  const getTitle = (): string => {
    return book.title || t('untitled');
  };

  const getDescription = (): string => {
    return book.description || '';
  };

  const getImage = (): string | undefined => {
    return book.cover_url || undefined;
  };

  const getApiName = (providerId: number | string): string | undefined => {
    if (jellyfinRef(book)) return 'Jellyfin';
    const id =
      typeof providerId === 'string' ? parseInt(providerId, 10) : providerId;
    const prov = getProvider(id);
    return prov?.badgeName;
  };

  return (
    <Card
      title={getTitle()}
      description={getDescription()}
      image={getImage()}
      onClick={handleClick}
      apiName={getApiName(provider)}
      favorite={book.favorite}
      offline={!!jellyfinRef(book)?.offline}
      className={className}
    />
  );
};

export default CardWrapper;
