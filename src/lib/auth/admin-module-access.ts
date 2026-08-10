import { getAdminModule, type AdminModuleKey } from "./admin-modules";
import { requireRole } from "./session";

export async function requireAdminModule(key: AdminModuleKey) {
  const module = getAdminModule(key);
  return requireRole(module.allowedRoles);
}
