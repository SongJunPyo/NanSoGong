package com.nansogong.service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/** 서버별 상한·만료가 있는 조회 캐시. 실패 결과는 저장하지 않는다. */
final class WeatherCache<K, V> {
    private final int limit;
    private final Map<K, Entry<V>> entries = new LinkedHashMap<>(16, 0.75f, true);

    WeatherCache(int limit) { this.limit = limit; }

    synchronized V get(K key, Instant now) {
        Entry<V> entry = entries.get(key);
        if (entry == null) return null;
        if (!now.isBefore(entry.expiresAt())) {
            entries.remove(key);
            return null;
        }
        return entry.value();
    }

    synchronized void put(K key, V value, Instant expiresAt) {
        entries.put(key, new Entry<>(value, expiresAt));
        if (entries.size() > limit) entries.remove(entries.keySet().iterator().next());
    }

    private record Entry<V>(V value, Instant expiresAt) {}
}
