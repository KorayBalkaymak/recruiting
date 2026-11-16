import localFont from "next/font/local";
import { HomePage } from "@/components/marketing/home-page";

const anthropicSans = localFont({
  src: "./fonts/AnthropicSans-Romans-Variable.ttf",
  weight: "300 800",
  display: "swap",
  variable: "--font-heading",
});

export default function PublicHome() {
  return (
    <div className={anthropicSans.variable}>
      <HomePage />
    </div>
  );
}
