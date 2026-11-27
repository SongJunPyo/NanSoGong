package com.nansogong.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AuthPasswordResetCompletionRequest(
        @NotBlank @Size(max = 100) String resetToken,
        @NotBlank @Size(min = 8, max = 64, message = "비밀번호는 8~64자로 입력해 주세요")
        @Pattern(regexp = "(?U)^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s])\\S+$", message = "비밀번호는 영문·숫자·특수문자를 포함하고 공백을 제외해 주세요") String password,
        @NotBlank @Size(max = 64) String passwordConfirm
) {}
