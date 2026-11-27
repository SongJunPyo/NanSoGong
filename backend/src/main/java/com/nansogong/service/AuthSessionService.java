package com.nansogong.service;

import com.nansogong.common.AppProperties;
import com.nansogong.dto.TokenResponse;
import com.nansogong.model.Member;
import com.nansogong.model.MemberStatus;
import com.nansogong.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

/** JWT의 자격 버전과 별개로 현재 세션의 종료·만료·재사용을 검사한다. */
@Service
@RequiredArgsConstructor
public class AuthSessionService implements OAuth2TokenValidator<Jwt> {
    private final AuthSessionStore sessions;
    private final AuthCredentialService credentials;
    private final MemberRepository members;
    private final AppProperties props;
    private final JwtEncoder encoder;

    public IssuedSession create(Member member, boolean remember) {
        if (member.getStatus() != MemberStatus.ACTIVE) throw invalid();
        return issue(sessions.create(member.getId(), credentials.version(member), props.jwt().refreshTokenTtl(), remember));
    }

    @Transactional(readOnly = true)
    public IssuedSession refresh(String token) {
        AuthSessionStore.Rotation rotation = sessions.rotate(token);
        if (rotation.result() != AuthSessionStore.Result.OK) throw invalid();
        var issued = rotation.issued();
        var session = issued.session();
        var member = members.findById(session.memberId());
        if (member.isEmpty() || member.get().getStatus() != MemberStatus.ACTIVE
                || !credentials.matches(session.version(), credentials.version(member.get()))) {
            sessions.revoke(session.id());
            throw invalid();
        }
        return issue(issued);
    }

    public String csrfToken(String refreshToken) {
        if (!sessions.recognizes(refreshToken)) throw invalid();
        var session = sessions.find(AuthSessionStore.sessionId(refreshToken));
        if (session == null || session.revoked()) throw invalid();
        return credentials.fingerprint("session-csrf", refreshToken);
    }
    public void checkCsrf(String refreshToken, String supplied) {
        if (!credentials.matches(csrfToken(refreshToken), supplied)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "요청의 보안 정보를 확인할 수 없어요. 새로고침 후 다시 시도해 주세요");
        }
    }
    public void logout(String refreshToken) {
        if (!sessions.recognizes(refreshToken)) throw invalid();
        sessions.revoke(AuthSessionStore.sessionId(refreshToken));
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        try {
            Object id = jwt.getClaims().get("sid"), version = jwt.getClaims().get("credentialVersion");
            if (id instanceof String sid && version instanceof String supplied) {
                var session = sessions.find(sid);
                if (session != null && !session.revoked() && session.memberId().toString().equals(jwt.getSubject())
                        && credentials.matches(session.version(), supplied)) return OAuth2TokenValidatorResult.success();
            }
        } catch (DataAccessException | IllegalArgumentException malformed) {
            // 저장소가 실패해도 Access 토큰을 허용하지 않는다.
        }
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "다시 로그인해 주세요", null));
    }
    private IssuedSession issue(AuthSessionStore.Issued issued) {
        var session = issued.session();
        Instant now = Instant.now();
        Instant expires = now.plus(props.jwt().accessTokenTtl());
        if (expires.isAfter(session.expiresAt())) expires = session.expiresAt();
        var claims = JwtClaimsSet.builder().subject(session.memberId().toString()).id(UUID.randomUUID().toString())
                .issuedAt(now).expiresAt(expires).claim("sid", session.id()).claim("credentialVersion", session.version()).build();
        String access = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new IssuedSession(TokenResponse.bearer(access, Math.max(0, expires.getEpochSecond() - now.getEpochSecond())),
                issued.refreshToken(), session.expiresAt(), session.remember());
    }
    private ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 만료되었거나 종료됐어요. 다시 로그인해 주세요"); }
    public record IssuedSession(TokenResponse access, String refreshToken, Instant expiresAt, boolean remember) {
        @Override public String toString() { return "IssuedSession[redacted]"; }
    }
}
