import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft } from 'lucide-react';

interface ViewerSidebarProps {
  open: boolean;
  onClose: () => void;
  preloadedImages: string[];
  currentPage: number;
  onPageClick: (index: number) => void;
}

export default function ViewerSidebar({
  open,
  onClose,
  preloadedImages,
  currentPage,
  onPageClick,
}: ViewerSidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-[55] bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-[60] flex h-full w-72 max-w-[85vw] flex-col border-r border-border bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] transition-transform duration-200 md:w-60 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-end px-2">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>
        <Separator />
        <div
          id="SideBar"
          className="min-h-0 flex-1"
          style={{ overflowY: 'auto', scrollBehavior: 'smooth' }}
        >
          {preloadedImages.map((el: string, i: number) => (
            <div className="border-b border-border" key={i}>
              <div
                id={'id_img_' + i}
                className="SideBar_img"
                style={{
                  backgroundColor:
                    currentPage === i ? 'rgba(255,255,255,0.1)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onClick={() => onPageClick(i)}
              >
                <img
                  height={120}
                  id={'imgSideBar_' + i}
                  className="SideBar_img"
                  src={el}
                  alt={`${i + 1}th page`}
                />
                <p className="SideBar_img_text">{i + 1}</p>
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
