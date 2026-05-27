import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import { Nav } from '@/components/Nav';

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Powerlifting Stats',
  description: 'Powerlifting analytics — equipped vs raw, missed lifts, competitiveness.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark", "font-sans", geist.variable)}>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
