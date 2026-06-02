import { HomeBottomNav } from "@/components/home/HomeBottomNav";
import { HomeHeader } from "@/components/home/HomeHeader";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24 text-on-background md:pb-0">
      <HomeHeader />
      {/* Single content shell: matches header / bottom-nav max width so lists & nav align */}
      <div className="mx-auto w-full min-w-[280px] max-w-5xl flex-1 self-stretch px-margin-edge">
        {children}
      </div>
      <HomeBottomNav />
    </div>
  );
}
