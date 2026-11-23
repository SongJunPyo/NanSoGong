package com.nansogong.common;

import net.javacrumbs.shedlock.core.LockProvider;
import net.javacrumbs.shedlock.provider.jdbctemplate.JdbcTemplateLockProvider;
import net.javacrumbs.shedlock.spring.annotation.EnableSchedulerLock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

import javax.sql.DataSource;

// ⏰ ASG 로 서버가 여러 대 떠도 @Scheduled 작업은 한 대에서만 돌게 한다
// 잠금은 DB 의 shedlock 테이블에 기록한다 (테이블은 Flyway 의 db/migration/V1__init.sql 이 만든다)
// dev 와 prod 는 DB 가 따로라서 잠금도 환경별로 따로 걸린다
// 사용 예)
//   @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
//   @SchedulerLock(name = "dailySalesForecast", lockAtMostFor = "PT30M")
//   public void dailySalesForecast() { ... }
@Configuration
@EnableScheduling
@EnableSchedulerLock(defaultLockAtMostFor = "PT10M")
public class SchedulingConfig {

    @Bean
    LockProvider lockProvider(DataSource dataSource) {
        return new JdbcTemplateLockProvider(
                JdbcTemplateLockProvider.Configuration.builder()
                        .withJdbcTemplate(new JdbcTemplate(dataSource))
                        .usingDbTime()      // 서버마다 시계가 달라도 DB 시간을 기준으로 잠근다
                        .build());
    }
}
