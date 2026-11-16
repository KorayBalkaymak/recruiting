import localFont from "next/font/local";
import { HomePage } from "@/components/marketing/home-page";

const headingSerif = localFont({
  src: [
    { path: "./fonts/source-serif-4-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/source-serif-4-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  display: "swap",
  variable: "--font-heading",
});

export default function PublicHome() {
  return (
    <div className={headingSerif.variable}>
      <HomePage />
    </div>
  );
}
