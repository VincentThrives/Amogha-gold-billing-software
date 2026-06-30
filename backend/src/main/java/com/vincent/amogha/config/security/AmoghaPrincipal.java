package com.vincent.amogha.config.security;

/** The authenticated principal, carried in the SecurityContext. */
public record AmoghaPrincipal(
        String userId,
        String name,
        String role,
        String phone
) {}
