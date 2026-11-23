package com.nansogong;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;

// 서버가 진짜 PostgreSQL · Redis 와 함께 뜨는지 확인하는 가장 기본 테스트
// 새 통합 테스트도 이렇게 @Import(TestcontainersConfig.class) 를 붙이면 된다
@SpringBootTest
@Import(TestcontainersConfig.class)
class NansogongApplicationTests {

	@Test
	void contextLoads() {
	}

}
