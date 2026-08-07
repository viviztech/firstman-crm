import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

/**
 * These statements only cover better-auth's own admin-panel actions
 * (user/session management). Business-object permissions (enquiries, orders,
 * invoices, revenue reports) are enforced in src/services/* per spec 3 —
 * never trust this access-control layer for CRM data scoping.
 */
export const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

export const superAdminRole = ac.newRole({
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
});

export const managerRole = ac.newRole({
  user: ["list", "get"],
  session: ["list"],
});

export const executiveRole = ac.newRole({
  user: [],
  session: [],
});

export const accountantRole = ac.newRole({
  user: ["list", "get"],
  session: [],
});
