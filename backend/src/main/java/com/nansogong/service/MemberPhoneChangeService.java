package com.nansogong.service;

import com.nansogong.dto.*;
import com.nansogong.model.Member;
import com.nansogong.model.MemberStatus;
import com.nansogong.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MemberPhoneChangeService {
    private final MemberRepository members;
    private final AuthCredentialService credentials;
    private final PasswordEncoder passwords;
    private final AuthSmsVerificationService sms;
    private final AuthSmsDeliveryService delivery;

    /** 외부 발송을 기다리는 동안 DB 트랜잭션을 유지하지 않는다. */
    public AuthPhoneChallengeResponse request(Long memberId, String version, MemberPhoneStartRequest request, String remoteAddress) {
        delivery.requireAvailable();
        Member member = requireMember(memberId, version, false);
        if (request.currentPassword().getBytes(StandardCharsets.UTF_8).length > 72
                || !passwords.matches(request.currentPassword(), member.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않아요");
        }
        if (normalizedPhone(member).equals(request.phone())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 번호와 다른 새 번호를 입력해 주세요");
        return sms.request(AuthSmsVerificationService.Purpose.PHONE_CHANGE, binding(member), request.phone(), remoteAddress);
    }
    public MemberPhoneProofResponse confirm(Long memberId, String version, UUID challenge, MemberPhoneConfirmationRequest request) {
        Member member = requireMember(memberId, version, false);
        var proof = sms.confirm(AuthSmsVerificationService.Purpose.PHONE_CHANGE, binding(member), request.phone(), challenge, request.code());
        return new MemberPhoneProofResponse(proof.token(), proof.expiresAt());
    }
    @Transactional
    public MemberResponse complete(Long memberId, String version, MemberPhoneUpdateRequest request) {
        Member member = requireMember(memberId, version, true);
        var proof = sms.requireProof(request.verificationToken(), AuthSmsVerificationService.Purpose.PHONE_CHANGE, binding(member), request.phone());
        sms.claim(proof);
        member.changePhone(request.phone(), proof.verifiedAt());
        members.flush();
        return MemberResponse.from(member);
    }
    private Member requireMember(Long memberId, String version, boolean lock) {
        var member = (lock ? members.findForPasswordReset(memberId) : members.findById(memberId))
                .orElseThrow(this::unauthorized);
        if (member.getStatus() != MemberStatus.ACTIVE || !credentials.matches(credentials.version(member), version)) throw unauthorized();
        return member;
    }
    private String normalizedPhone(Member member) { return member.getPhone().replaceAll("[-\\s]", ""); }
    private String binding(Member member) { return member.getId() + "\n" + credentials.version(member) + "\n" + normalizedPhone(member); }
    private ResponseStatusException unauthorized() { return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요"); }
}
