package com.protocolo.cien;

final class SystemBarInsetPolicy {
    private SystemBarInsetPolicy() {
    }

    static int statusBarPadding(int insetTop) {
        return Math.max(0, insetTop);
    }
}
