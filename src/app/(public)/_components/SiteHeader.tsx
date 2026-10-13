import { Suspense } from "react";
import { Brand } from "./Brand";
import { MainNav, StaticNav } from "./MainNav";

export function SiteHeader() {
  return (
    <header className="site-header theme-dark">
      <div className="container site-header-inner">
        <Brand />
        <Suspense fallback={<StaticNav />}>
          <MainNav />
        </Suspense>
      </div>
    </header>
  );
}
