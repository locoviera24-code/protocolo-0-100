package com.protocolo.cien;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class SystemBarInsetPolicyTest {
    @Test
    public void preservesPhysicalStatusBarInset() {
        assertEquals(72, SystemBarInsetPolicy.statusBarPadding(72));
    }

    @Test
    public void rejectsNegativeInsets() {
        assertEquals(0, SystemBarInsetPolicy.statusBarPadding(-1));
    }
}
