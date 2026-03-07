import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for AndroHub",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground space-y-4">
          <p>Last updated: {new Date().toLocaleDateString("en-US")}</p>
          <p>
            AndroHub collects minimal data necessary to operate the service. We do not
            sell your personal information.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Data we collect</h2>
          <p>
            When you use AndroHub, we may collect: app listings you view, your IP address
            and browser type for security and analytics, and any information you provide when
            contacting us.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">How we use it</h2>
          <p>
            We use this data to provide and improve AndroHub, prevent abuse, and comply with
            legal obligations.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Contact</h2>
          <p>
            For questions about this privacy policy or your data, please contact us through the
            contact information provided on this site.
          </p>
        </div>
      </main>
    </div>
  );
}
