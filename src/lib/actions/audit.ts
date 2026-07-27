import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminSession } from "@/lib/auth/require-admin";

type AuditInput = {
  admin: AdminSession;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: unknown;
  afterData?: unknown;
  importBatchId?: string | null;
};

export async function writeAuditLog(input: AuditInput) {
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.from("audit_log").insert({
    admin_user_id: input.admin.userId,
    admin_email: input.admin.email,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    before_data: input.beforeData ?? null,
    after_data: input.afterData ?? null,
    import_batch_id: input.importBatchId ?? null,
  });

  if (error) {
    console.error("Audit log write failed", error);
  }
}
