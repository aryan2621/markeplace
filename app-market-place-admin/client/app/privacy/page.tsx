


export const metadata = {
  title: "Privacy Policy",
  description: "Privacy policy for AndroHub Admin",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground space-y-4">
          <p>Last updated: {new Date().toLocaleDateString("en-US")}</p>
          <p>
            This admin panel and AndroHub collect minimal data necessary to operate. We
            do not sell your personal information.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Data we collect</h2>
          <p>
            For admin users we store your email and authentication data. We may collect IP address
            and usage data for security and operations.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Contact</h2>
          <p>For privacy questions, please contact the site administrator.</p>
        </div>
      </main>
    </div>
  );
}
