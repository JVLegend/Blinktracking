import { ReactNode } from "react";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const BentoGrid = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[280px] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
}: {
  name: string;
  className: string;
  background: ReactNode;
  Icon: any;
  description: string;
  href: string;
  cta: string;
}) => (
  <Link href={href} key={name} className="block h-full">
    <div
      className={cn(
        "group relative h-full flex flex-col justify-between overflow-hidden rounded-xl cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        // light styles
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        // dark styles
        "transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        className,
      )}
    >
      <div>{background}</div>
      
      {/* Content area with fixed structure */}
      <div className="z-10 flex flex-col h-full p-6">
        {/* Header with icon and title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0">
            <Icon className="h-12 w-12 text-primary transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-primary/80" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-semibold text-foreground dark:text-neutral-300 group-hover:text-primary transition-colors duration-300 line-clamp-2">
              {name}
            </h3>
          </div>
        </div>
        
        {/* Description area with fixed height */}
        <div className="flex-1 mb-4">
          <p className="text-sm text-muted-foreground group-hover:text-foreground/80 transition-colors duration-300 leading-relaxed line-clamp-4">
            {description}
          </p>
        </div>
        
        {/* CTA button area */}
        <div className="flex justify-end">
          <div className="opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              {cta}
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Hover overlay */}
      <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-primary/5 group-hover:dark:bg-primary/10" />
    </div>
  </Link>
);

export { BentoCard, BentoGrid }; 