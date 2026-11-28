package com.nansogong.dto;

/** WGS84 좌표. 카카오 x·TourAPI mapx는 경도, y·mapy는 위도다. */
public record HomeEventCoordinates(double latitude, double longitude) {}
