package com.nansogong;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan     // common/AppProperties 같은 설정 클래스를 자동 등록
public class NansogongApplication {

	public static void main(String[] args) {
		SpringApplication.run(NansogongApplication.class, args);
	}

}
