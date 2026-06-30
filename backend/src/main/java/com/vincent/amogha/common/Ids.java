package com.vincent.amogha.common;

import java.security.SecureRandom;

public final class Ids {
    private static final SecureRandom RND = new SecureRandom();
    private static final char[] HEX = "0123456789ABCDEF".toCharArray();

    private Ids() {}

    public static String genId(String prefix) {
        return (prefix == null ? "id" : prefix) + "-"
                + Long.toString(System.nanoTime(), 36)
                + Integer.toString(RND.nextInt(0x1000000), 36);
    }

    /** Akshaya-style bill no: 4 digits + 6 hex chars, e.g. 1304FB98B3. */
    public static String genBillNo() {
        StringBuilder s = new StringBuilder(10);
        for (int i = 0; i < 4; i++) s.append(RND.nextInt(10));
        for (int j = 0; j < 6; j++) s.append(HEX[RND.nextInt(16)]);
        return s.toString();
    }
}
