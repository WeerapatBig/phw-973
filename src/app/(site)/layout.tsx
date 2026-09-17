import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { Onboarding } from "@/components/Onboarding";
import { getLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <LocaleProvider initialLocale={locale}>
      <Header />
      <main>{children}</main>
      <Footer />
      <Onboarding />
    </LocaleProvider>
  );
}
