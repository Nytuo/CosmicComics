import { useTranslation } from 'react-i18next';
import { BookOpen, Pencil, Users, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollMenu } from 'react-horizontal-scrolling-menu';
import { LeftArrow, RightArrow } from './ScrollArrows.tsx';
import CardWrapper from '../../card/CardWrapper.tsx';
import type { DisplayBook } from '@/interfaces/IDisplayBook.ts';
import { providerEnum, tryToParse } from '@/utils/utils.ts';
import { getProvider } from '@/API/providers';

interface TabsSectionProps {
  characters: any[];
  staff: any[];
  relations: any[];
  provider: number;
  hasCharacters: boolean;
  hasStaff: boolean;
  hasRelations: boolean;
  getCharactersCount: () => number;
  getCreatorsCount: () => number;
  onOpenMoreInfo: (
    name: string,
    desc: string,
    image: string,
    href: string,
    type?: 'avatar' | 'cover'
  ) => void;
  onClickHandleOpenMoreInfo: (el: any) => void;
}

export function TabsSection({
  characters,
  staff,
  relations,
  provider,
  hasCharacters,
  hasStaff,
  hasRelations,
  getCharactersCount,
  getCreatorsCount,
  onOpenMoreInfo,
  onClickHandleOpenMoreInfo,
}: TabsSectionProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="p-0">
        <Tabs
          defaultValue={
            hasCharacters ? 'characters' : hasStaff ? 'staff' : 'relations'
          }
          className="w-full"
        >
          <div className="border-b px-6 pt-4">
            <TabsList variant="line">
              {hasCharacters && (
                <TabsTrigger value="characters" className="gap-1.5">
                  <Users className="h-4 w-4" />
                  {t('characters')}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getCharactersCount()}
                  </Badge>
                </TabsTrigger>
              )}
              {hasStaff && (
                <TabsTrigger value="staff" className="gap-1.5">
                  <Pencil className="h-4 w-4" />
                  {t('Staff')}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getCreatorsCount()}
                  </Badge>
                </TabsTrigger>
              )}
              {hasRelations && (
                <TabsTrigger value="relations" className="gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {provider === providerEnum.Marvel
                    ? t('AFewComics')
                    : t('Relations')}
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {hasCharacters && (
            <TabsContent value="characters" className="p-6">
              <ScrollMenu LeftArrow={LeftArrow} RightArrow={RightArrow}>
                {characters.map((el: any, index: number) => (
                  <div
                    key={index}
                    className="ml-4 mt-2 text-center cursor-pointer group/char transition-transform hover:scale-105"
                    onClick={() => onClickHandleOpenMoreInfo(el)}
                  >
                    <Avatar className="w-20 h-20 mx-auto ring-2 ring-transparent group-hover/char:ring-primary transition-all">
                      <AvatarImage
                        alt={el.name}
                        src={getProvider(provider)?.parseCharacterImage(
                          el.image_url
                        )}
                      />
                      <AvatarFallback className="text-lg bg-muted">
                        <User className="h-8 w-8 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                    <p className="mt-2 text-xs font-medium max-w-20 truncate mx-auto">
                      {el.name}
                    </p>
                  </div>
                ))}
              </ScrollMenu>
            </TabsContent>
          )}

          {hasStaff && (
            <TabsContent value="staff" className="p-6">
              <ScrollMenu LeftArrow={LeftArrow} RightArrow={RightArrow}>
                {staff.map((el: any, index: number) => {
                  const role = el.role ?? null;
                  return (
                    <div
                      key={index}
                      className="ml-4 text-center mt-2 cursor-pointer group/staff transition-transform hover:scale-105"
                      onClick={() => onClickHandleOpenMoreInfo(el)}
                    >
                      <Avatar className="w-20 h-20 mx-auto ring-2 ring-transparent group-hover/staff:ring-primary transition-all">
                        <AvatarImage
                          src={getProvider(provider)?.parseCreatorImage(
                            el.image_url
                          )}
                        />
                        <AvatarFallback className="text-lg bg-muted">
                          <User className="h-8 w-8 text-muted-foreground" />
                        </AvatarFallback>
                      </Avatar>
                      <p className="mt-2 text-xs font-medium max-w-20 truncate mx-auto">
                        {el.name}
                      </p>
                      {role && (
                        <p className="text-xs text-muted-foreground max-w-20 truncate mx-auto">
                          {role}
                        </p>
                      )}
                    </div>
                  );
                })}
              </ScrollMenu>
            </TabsContent>
          )}

          {hasRelations && (
            <TabsContent value="relations" className="p-6">
              <div className="flex flex-wrap gap-2 justify-center">
                {relations.map((el: any, index: number) => (
                  <CardWrapper
                    key={index}
                    type="lite"
                    onClick={() => {
                      const url =
                        provider === providerEnum.Marvel
                          ? (tryToParse(el.url)?.[0]?.url ?? '')
                          : el.siteUrl || el.url || '';
                      onOpenMoreInfo(
                        el.name,
                        el.description,
                        el.image || '',
                        url,
                        'cover'
                      );
                    }}
                    book={
                      {
                        id: el.id ?? '',
                        external_id: el.id ?? '',
                        provider_id: provider,
                        provider_name: '',
                        title: el.name,
                        path: '',
                        cover_url: el.image || '',
                        description: el.description || '',
                        issue_number: '',
                        format: el.format || '',
                        page_count: 0,
                        creators: [],
                        characters: [],
                        read: false,
                        reading: false,
                        unread: false,
                        favorite: false,
                        note: null,
                        lock: false,
                        reading_progress: {
                          last_page: 0,
                          page_count: 0,
                          percentage: 0,
                        },
                        extra: {},
                        series_id: null,
                      } as DisplayBook
                    }
                    provider={provider}
                  />
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
