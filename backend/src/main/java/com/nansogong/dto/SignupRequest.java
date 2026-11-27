package com.nansogong.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** 회원·사업자 등록을 한 번에 요청한다. 프론트의 사업자 확인 결과는 신뢰하지 않고 다시 검증한다. */
public record SignupRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z][A-Za-z0-9_]{5,49}", message = "아이디는 영문으로 시작하는 영문·숫자·밑줄 6~50자로 입력해 주세요") String loginId,
        @NotBlank @Size(min = 8, max = 64, message = "비밀번호는 8~64자로 입력해 주세요")
        @Pattern(regexp = "(?U)^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s])\\S+$", message = "비밀번호는 영문·숫자·특수문자를 포함하고 공백을 제외해 주세요") String password,
        @NotBlank(message = "이름을 입력해 주세요") @Size(max = 50) String name,
        @NotBlank @Pattern(regexp = "01[016789][0-9]{7,8}", message = "휴대전화 번호를 확인해 주세요") String phone,
        @NotBlank(message = "휴대전화 인증을 완료해 주세요") @Size(max = 100) String phoneVerificationToken,
        @NotEmpty(message = "사업자를 최소 1개 등록해 주세요") @Size(max = 100, message = "사업자는 한 번에 100개까지 등록할 수 있어요")
        List<@NotNull @Valid StoreRegistrationRequest> stores
) {
    public SignupRequest {
        name = name == null ? null : name.strip();
        phone = phone == null ? null : phone.replaceAll("[-\\s]", "");
    }
}
