import * as React from 'react';
import {
  Bookmark,
  CloudDownload,
  Info,
  ImageIcon,
  Settings,
  Lightbulb,
  Wrench,
  Home,
  LibraryBig,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';
import { openUrl } from '@tauri-apps/plugin-opener';

export function AppSidebar({
  sidebarActions,
  onOpenBookmarks,
  onOpenSettings,
  onOpenDownloaders,
  onOpenAbout,
  onOpenHome,
  onOpenLibraries,
  onExtractMissingImages,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  sidebarActions: {
    label: string;
    icon: React.ElementType;
    action: () => void;
  }[];
  onOpenBookmarks: () => void;
  onOpenSettings: () => void;
  onOpenDownloaders: () => void;
  onOpenAbout: () => void;
  onOpenHome: () => void;
  onOpenLibraries: () => void;
  onExtractMissingImages: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Sidebar side="left" variant="sidebar" collapsible="none" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#" onClick={onOpenHome}>
                <div className="w-full flex items-center justify-center">
                  <div className="aspect-square size-12">
                    <img
                      src="Images/Logo.png"
                      alt="Cosmic Comics"
                      className="size-12 rotate linear infinite"
                    />
                  </div>
                  <div>
                    <img
                      src="Images/LogoTxt.png"
                      alt="Cosmic Comics"
                      className="h-9 w-auto cursor-pointer"
                    />
                  </div>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onOpenHome} tooltip={t('HOME')}>
                  <Home />
                  <span>{t('HOME')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenLibraries}
                  tooltip={t('libraries')}
                >
                  <LibraryBig />
                  <span>{t('libraries')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={onOpenDownloaders}
                  tooltip={t('downloaders')}
                >
                  <CloudDownload />
                  <span>{t('downloaders')}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarMenu>
              {sidebarActions.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton onClick={item.action} tooltip={item.label}>
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full">
                <SidebarMenuButton tooltip={t('tools')}>
                  <Wrench />
                  <span>{t('tools')}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onClick={onOpenBookmarks}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  {t('Bookmark')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenSettings}>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onExtractMissingImages}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  {t('ExtractMissingImg')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() =>
                    openUrl('https://github.com/Nytuo/CosmicComics/wiki')
                  }
                >
                  <Lightbulb className="mr-2 h-4 w-4" />
                  {t('wiki')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenAbout}>
                  <Info className="mr-2 h-4 w-4" />
                  {t('about')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
