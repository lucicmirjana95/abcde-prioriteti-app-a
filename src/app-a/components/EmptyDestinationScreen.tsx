import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
}

export default function EmptyDestinationScreen({
  icon: Icon,
  eyebrow,
  title,
  description,
  status,
}: Props) {
  return (
    <div className="mx-auto w-full max-w-[680px] px-5 py-6 sm:px-6 md:py-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-[15px] bg-[#0A84FF]/10 text-[#0071E3] dark:text-[#0A84FF]">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <p className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0071E3] dark:text-[#0A84FF]">
        {eyebrow}
      </p>
      <h1 className="text-[30px] font-bold leading-tight tracking-[-0.035em] text-black sm:text-[36px] dark:text-white">
        {title}
      </h1>
      <p className="mt-3 max-w-[560px] text-[17px] leading-relaxed text-[#6E6E73] dark:text-[#AEAEB2]">
        {description}
      </p>
      <div className="mt-8 inline-flex min-h-[36px] items-center rounded-full bg-black/[0.055] px-4 text-[13px] font-medium text-[#6E6E73] dark:bg-white/[0.09] dark:text-[#AEAEB2]">
        {status}
      </div>
    </div>
  );
}
