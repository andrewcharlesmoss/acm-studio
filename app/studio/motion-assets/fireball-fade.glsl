vec4 fireballWithFade(vec2 uv, float aspect, float time, bool softFade) {
    const float fadeStart = 0.66f;
    // Hold the whole volume before its exit, including its position and turbulence.
    float flameTime = softFade ? min(time, fadeStart) : time;
    vec4 flame = fireballAt(uv, aspect, flameTime);
    if (!softFade || time <= fadeStart) return flame;

    flame.a *= 1.0f - smoothstep(fadeStart, 1.0f, time);
    return flame.a < 0.5f / 255.0f ? vec4(0.0f) : flame;
}
