import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Terms of Use",
  description: "Terms of use for AndroHub",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">Terms of Use</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground space-y-4">
          <p>Last updated: {new Date().toLocaleDateString("en-US")}</p>
          <p>
            By using AndroHub you agree to these terms. This is not the Google Play
            Store or any official app store. Use at your own risk.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Use of AndroHub</h2>
          <p>
            You may browse and download apps listed here for personal use. App information and
            download links are provided by developers or curators. We do not guarantee the safety,
            accuracy, or legality of any listed app.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Disclaimer</h2>
          <p>
            AndroHub and all apps are provided &quot;as is&quot; without warranties of any
            kind. We are not responsible for any damage, loss, or issues arising from downloading
            or using any app. You are responsible for verifying apps before installation.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of AndroHub after
            changes constitutes acceptance of the updated terms.
          </p>
        </div>
      </main>
    </div>
  );
}
