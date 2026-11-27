package com.nansogong.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** 본인 이름과 선택적인 비밀번호 변경만 받는다. 아이디·전화번호·상태는 쓰기 대상이 아니다. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record MemberUpdateRequest(
        @NotBlank(message = "이름을 입력해 주세요") @Size(max = 50, message = "이름은 최대 50자예요") String name,
        @Size(max = 64, message = "현재 비밀번호를 확인해 주세요") String currentPassword,
        @Size(min = 8, max = 64, message = "비밀번호는 8~64자로 입력해 주세요")
        @Pattern(regexp = "(?U)^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s])\\S+$", message = "비밀번호는 영문·숫자·특수문자를 포함하고 공백을 제외해 주세요") String password,
        @Size(max = 64, message = "비밀번호 확인은 최대 64자예요") String passwordConfirm
) {
    public MemberUpdateRequest {
        name = name == null ? null : name.strip();
    }

    public boolean changesPassword() {
        return currentPassword != null || password != null || passwordConfirm != null;
    }
}
