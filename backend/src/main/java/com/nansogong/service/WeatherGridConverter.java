package com.nansogong.service;

import com.nansogong.dto.WeatherGrid;
import com.nansogong.exception.WeatherLookupException;
import org.springframework.http.HttpStatus;

/** 기상청 5km Lambert conformal conic 격자. 카카오 x=경도, y=위도 순서를 구분한다. */
public final class WeatherGridConverter {
    private WeatherGridConverter() {}

    public static WeatherGrid convert(double latitude, double longitude) {
        if (!Double.isFinite(latitude) || !Double.isFinite(longitude)
                || latitude < 30 || latitude > 44 || longitude < 120 || longitude > 135) {
            throw new WeatherLookupException(HttpStatus.BAD_GATEWAY, "WEATHER_INVALID_LOCATION",
                    "매장의 날씨 조회 위치를 확인할 수 없어요");
        }
        // 기상청 표준 투영 상수: 반경 6371.00877km, 5km 격자, 표준위선 30°/60°.
        // https://journal.kaopg.or.kr/articles/xml/k9OX/ (기상청 투영법·격자좌표체계)
        double radius = 6371.00877 / 5.0;
        double slat1 = Math.toRadians(30), slat2 = Math.toRadians(60);
        double sn = Math.log(Math.cos(slat1) / Math.cos(slat2))
                / Math.log(Math.tan(Math.PI / 4 + slat2 / 2) / Math.tan(Math.PI / 4 + slat1 / 2));
        double sf = Math.pow(Math.tan(Math.PI / 4 + slat1 / 2), sn) * Math.cos(slat1) / sn;
        double ro = radius * sf / Math.pow(Math.tan(Math.PI / 4 + Math.toRadians(38) / 2), sn);
        double ra = radius * sf / Math.pow(Math.tan(Math.PI / 4 + Math.toRadians(latitude) / 2), sn);
        double theta = Math.toRadians(longitude - 126) * sn;
        int nx = (int) Math.floor(ra * Math.sin(theta) + 43 + 0.5);
        int ny = (int) Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5);
        if (nx < 1 || nx > 149 || ny < 1 || ny > 253) {
            throw new WeatherLookupException(HttpStatus.BAD_GATEWAY, "WEATHER_INVALID_LOCATION",
                    "날씨 조회를 지원하는 매장 위치인지 확인해 주세요");
        }
        return new WeatherGrid(nx, ny);
    }
}
