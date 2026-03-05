// noinspection HtmlUnknownTarget

import { useLayoutEffect } from 'react';
import { Spinner } from '@/components/ui/spinner.tsx';

export function SuspensePage() {
  useLayoutEffect(() => {
    document.querySelector('#navbar')?.classList.add('hidden');
  }, []);
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 bg-black">
      <div className="flex items-center gap-2">
        <img
          src="Images/Logo.png"
          alt=""
          height="180px"
          id="logo_id"
          className="navbar-brand rotate linear infinite h-45 w-auto"
        />
        <img
          src="Images/LogoTxt.png"
          alt=""
          id="logo_id_txt"
          className="navbar-brand h-45"
        />
      </div>
      <Spinner size="lg" />
    </div>
  );
}
