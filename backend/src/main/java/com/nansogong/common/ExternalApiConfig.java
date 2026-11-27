package com.nansogong.common;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

// 🌐 외부 API 호출용 RestClient 를 서비스별로 하나씩 만들어 둔다
// 주소 · 타임아웃 · 인증 헤더는 여기서 한 번만 정한다 → 각 도메인 코드는 경로만 적으면 된다
// 로컬은 목업(mock, 8089), AWS 는 진짜 주소 (application.yml / application-aws.yml 의 app.external)
// 빈 이름 = 메서드 이름. 사용 예)
//   public WeatherClient(@Qualifier("kmaRestClient") RestClient kma, AppProperties props) { ... }
//   kma.get().uri(u -> u.path("/getVilageFcst").queryParam("serviceKey", key)...build()).retrieve().body(KmaResponse.class);
@Configuration
public class ExternalApiConfig {

    private final AppProperties.External ext;
    private final AppProperties.Sens sens;
    private final RestClient.Builder builder;

    public ExternalApiConfig(AppProperties props, RestClient.Builder builder) {
        this.ext = props.external();
        this.sens = props.sens();
        // 연결 3초 · 응답 10초가 넘으면 예외 → 호출한 쪽에서 '결과 확인 중' 으로 처리한다 (구현-6-6)
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(ext.connectTimeout());
        factory.setReadTimeout(ext.readTimeout());
        this.builder = builder.requestFactory(factory);
    }

    @Bean       // 국세청 사업자 진위확인 · 상태조회 (구현-1-2)
    RestClient ntsRestClient() {
        return builder.clone().baseUrl(ext.ntsBaseUrl()).build();
    }

    @Bean
    RestClient sensRestClient() {
        return builder.clone().baseUrl(sens.baseUrl()).build();
    }

    @Bean       // 기상청 단기예보 (구현-1-13)
    RestClient kmaRestClient() {
        return builder.clone().baseUrl(ext.kmaBaseUrl()).build();
    }

    @Bean   // 특일 정보 (구현-2-5)
    RestClient holidayRestClient() {
        return builder.clone().baseUrl(ext.holidayBaseUrl()).build();
    }

    @Bean  // 네이버 데이터랩 검색어 트렌드 (구현-4-5)
    RestClient naverDatalabRestClient() {
        return builder.clone().baseUrl(ext.naverDatalabBaseUrl())
                .defaultHeader("X-Naver-Client-Id", ext.naverClientId())
                .defaultHeader("X-Naver-Client-Secret", ext.naverClientSecret())
                .build();
    }

    @Bean       // POS (구현-1-7, 1-9, 1-14, 쿠폰 등록)
    RestClient posRestClient() {
        return builder.clone().baseUrl(ext.posBaseUrl()).build();
    }

    @Bean  // 가상 거래처 (구현-1-10, 3-9, 3-11, 3-14)
    RestClient supplierRestClient() {
        return builder.clone().baseUrl(ext.supplierBaseUrl()).build();
    }

    @Bean    // 마이데이터 (구현-1-8)
    RestClient mydataRestClient() {
        return builder.clone().baseUrl(ext.mydataBaseUrl()).build();
    }
}
