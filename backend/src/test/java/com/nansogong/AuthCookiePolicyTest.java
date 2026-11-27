package com.nansogong;

import com.nansogong.common.AppProperties;
import com.nansogong.service.AuthCookieService;
import com.nansogong.service.AuthSessionService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.time.Instant;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthCookiePolicyTest {
    @Test void crossSiteHttpsCookiesAndDeletionKeepSecureHttpOnlyPathAndSameSite() {
        var props=mock(AppProperties.class);
        when(props.session()).thenReturn(new AppProperties.Session(true,"None"));
        var cookies=new AuthCookieService(props);
        var created=new MockHttpServletResponse();
        cookies.write(created,new AuthSessionService.IssuedSession(null,"test-only-cookie",Instant.now().plusSeconds(1209600),true));
        assertThat(created.getHeader("Set-Cookie")).contains("Secure","HttpOnly","SameSite=None","Path=/api/auth","Max-Age=").doesNotContain("Domain=");
        var deleted=new MockHttpServletResponse();cookies.clear(deleted);
        assertThat(deleted.getHeader("Set-Cookie")).contains("Secure","HttpOnly","SameSite=None","Path=/api/auth","Max-Age=0");
    }
    @Test void refusesInsecureSameSiteNoneAndUnknownCookiePolicy() {
        assertThatThrownBy(()->new AppProperties.Session(false,"None")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(()->new AppProperties.Session(true,"unknown")).isInstanceOf(IllegalArgumentException.class);
    }
}
