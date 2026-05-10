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
      {children}
      <HomeBottomNav />
    </div>
  );
}
