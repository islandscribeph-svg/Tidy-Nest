export type AppRole = "ADMIN" | "STAFF" | "MEMBER";

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "ADMIN";
}

export function roleLabel(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "STAFF":
    case "MEMBER":
      return "Member";
    default:
      return "Member";
  }
}

export function assignableRoles(): Array<"ADMIN" | "MEMBER"> {
  return ["ADMIN", "MEMBER"];
}
