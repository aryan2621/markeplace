


export const metadata = {
  title: "Terms of Use",
  description: "Terms of use for AndroHub Admin",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="mx-auto max-w-6xl w-full px-4 py-8 flex-1">
        <h1 className="text-2xl font-bold mb-6">Terms of Use</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground space-y-4">
          <p>Last updated: {new Date().toLocaleDateString("en-US")}</p>
          <p>
            Use of this admin panel is subject to these terms. You are responsible for the content
            you publish to AndroHub and for keeping your credentials secure.
          </p>
          <h2 className="text-lg font-semibold text-foreground mt-6">Acceptable use</h2>
          <p>
            Do not list illegal, harmful, or misleading apps. We may remove content and suspend
            access at our discretion.
          </p>
        </div>
      </main>
    </div>
  );
}
