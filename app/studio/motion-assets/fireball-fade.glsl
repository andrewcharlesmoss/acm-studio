vec4 fireballWithFade(vec2 uv, float aspect, float time, bool softFade) {
    const float fadeStart = 0.52f;
    const float settleStart = 0.66f;
    // Let the glow start thinning during expansion, before the flame settles in place.
    float centreTime = softFade ? min(time, settleStart) : time;
    vec4 flame = fireballAt(uv, aspect, time, centreTime);
    if (!softFade || time <= fadeStart) return flame;

    flame.a *= 1.0f - smoothstep(fadeStart, 1.0f, time);
    return flame.a < 0.5f / 255.0f ? vec4(0.0f) : flame;
}
