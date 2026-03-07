import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  try {
    const { userId } = await auth();
    if (userId) redirect("/apps");
  } catch {
    redirect("/sign-in");
  }
  redirect("/sign-in");
}
