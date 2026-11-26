// Settings are fractions in fade-in, fade-out, flame-motion, coverage order.
vec4 fireballWithFade(vec2 uv, float aspect, float time, bool softFade, vec4 settings) {
    const float settleStart = 0.66f;
    float centreTime = softFade ? min(time, settleStart) : time;
    if (softFade && settings.w != 1.0f) uv = (uv - 0.5f) / settings.w + 0.5f;
    vec4 flame = fireballAt(uv, aspect, time, centreTime, settings.z);

    if (!softFade) return flame;
    if (settings.x > 0.0f) flame.a *= smoothstep(0.0f, settings.x, time);
    if (settings.y > 0.0f) flame.a *= 1.0f - smoothstep(1.0f - settings.y, 1.0f, time);
    return flame.a < 0.5f / 255.0f ? vec4(0.0f) : flame;
}
