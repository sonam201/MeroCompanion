import Image from "next/image";
import { TimezoneSync } from "@/components/dashboard/timezone-sync";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <TimezoneSync />
      <Image
        src="/andhakar.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-30"
      />
      <div className="relative z-10 flex flex-1 flex-col">{children}</div>
    </div>
  );
}
