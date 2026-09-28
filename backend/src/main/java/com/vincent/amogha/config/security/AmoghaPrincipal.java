package com.vincent.amogha.config.security;

/** The authenticated principal, carried in the SecurityContext. */
public record AmoghaPrincipal(
        String userId,
        String name,
        String role,
        String phone
) {
    /** Admin-level access (a normal admin or the super admin). */
    public boolean isAdmin() { return "admin".equals(role) || "superadmin".equals(role); }
    public boolean isSuperAdmin() { return "superadmin".equals(role); }
}
