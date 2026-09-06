import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PresetManager } from "@/components/PresetManager";

export default async function PresetsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return <PresetManager />;
}
