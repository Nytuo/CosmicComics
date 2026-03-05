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
    <aside
      className={`fixed top-0 left-0 z-40 h-full w-60 border-r border-border bg-background transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center h-16 px-2 justify-end">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
      </div>
      <Separator />
      <div
        id="SideBar"
        style={{
          overflowY: 'scroll',
          height: '100%',
          scrollBehavior: 'smooth',
        }}
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
  );
}
