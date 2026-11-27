package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.model.Member;
import com.nansogong.model.MemberStatus;
import com.nansogong.repository.MemberRepository;
import org.springframework.dao.DataAccessException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.HexFormat;

/** 비밀번호 해시를 노출하지 않는 자격 버전. 비밀번호가 바뀌면 이전 JWT를 거절한다. */
@Service
public class AuthCredentialService implements OAuth2TokenValidator<Jwt> {
    private final MemberRepository members;
    private final byte[] secret;
    public AuthCredentialService(MemberRepository members, AppProperties props) {
        this.members = members; this.secret = props.jwt().secret().getBytes(StandardCharsets.UTF_8);
    }
    public String version(Member member) {
        return fingerprint("credential-version", member.getId() + "\n" + member.getPasswordHash());
    }
    public String fingerprint(String purpose, String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((purpose + "\n" + value).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) { throw new IllegalStateException("인증 설정을 확인할 수 없습니다"); }
    }
    public boolean matches(String expected, String actual) {
        return expected != null && actual != null && MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), actual.getBytes(StandardCharsets.UTF_8));
    }
    @Override
    @Transactional(readOnly = true)
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        try {
            Object suppliedVersion = jwt.getClaims().get("credentialVersion");
            Object suppliedSubject = jwt.getClaims().get("sub");
            if (!(suppliedVersion instanceof String version) || !(suppliedSubject instanceof String subject)) {
                return invalid();
            }
            var member = members.findById(Long.valueOf(subject));
            if (member.isPresent() && member.get().getStatus() == MemberStatus.ACTIVE
                    && matches(version(member.get()), version)) return OAuth2TokenValidatorResult.success();
        } catch (IllegalArgumentException | DataAccessException e) {
            // 파싱·저장소 오류는 허용하지 않는다. 토큰·원본 예외를 기록하지 않는다.
        }
        return invalid();
    }
    private OAuth2TokenValidatorResult invalid() {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "다시 로그인해 주세요", null));
    }
}
