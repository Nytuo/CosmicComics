import { useContext } from 'react';
import { VisibilityContext } from 'react-horizontal-scrolling-menu';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LeftArrow() {
  const { isFirstItemVisible, scrollPrev } = useContext(VisibilityContext);
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isFirstItemVisible}
      onClick={() => scrollPrev()}
    >
      <ArrowLeft />
    </Button>
  );
}

export function RightArrow() {
  const { isLastItemVisible, scrollNext } = useContext(VisibilityContext);
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={isLastItemVisible}
      onClick={() => scrollNext()}
    >
      <ArrowRight />
    </Button>
  );
}
