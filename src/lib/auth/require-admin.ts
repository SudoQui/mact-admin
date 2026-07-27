import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminSession = {
  userId: string;
  email: string;
  role: "owner" | "admin" | "viewer";
};

export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    redirect("/login");
  }

  const ownerEmail = process.env.ADMIN_OWNER_EMAIL?.toLowerCase();
  const userEmail = user.email.toLowerCase();

  const admin = createSupabaseAdminClient();
  const { data: adminUser, error: adminError } = await admin
    .from("admin_users")
    .select("role, is_active")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (adminUser?.is_active) {
    return {
      userId: user.id,
      email: user.email,
      role: adminUser.role as AdminSession["role"],
    };
  }

  if (ownerEmail && ownerEmail === userEmail) {
    return {
      userId: user.id,
      email: user.email,
      role: "owner",
    };
  }

  if (adminError) {
    console.error("Admin lookup failed", adminError);
  }

  redirect("/login?error=not_admin");
}

export function requireWriteRole(admin: AdminSession) {
  if (admin.role === "viewer") {
    throw new Error("Viewer admins cannot create or edit records.");
  }
}
