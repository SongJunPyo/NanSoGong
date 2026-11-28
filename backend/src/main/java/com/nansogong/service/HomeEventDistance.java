package com.nansogong.service;

import com.nansogong.dto.HomeEventCoordinates;

/** Haversine 구면 거리. 도보·도로 이동 거리가 아닌 직선 거리(m)다. */
final class HomeEventDistance {
    private static final double EARTH_RADIUS_METERS = 6_371_008.8;

    private HomeEventDistance() {}

    static double meters(HomeEventCoordinates from, HomeEventCoordinates to) {
        double lat1 = Math.toRadians(from.latitude());
        double lat2 = Math.toRadians(to.latitude());
        double deltaLat = lat2 - lat1;
        double deltaLon = Math.toRadians(to.longitude() - from.longitude());
        double a = Math.pow(Math.sin(deltaLat / 2), 2)
                + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(deltaLon / 2), 2);
        return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.clamp(a, 0, 1)));
    }
}
