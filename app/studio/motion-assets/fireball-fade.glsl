vec4 fireballWithFade(vec2 uv, float aspect, float time, bool softFade) {
    const float fadeStart = 0.66f;
    vec4 flame = fireballAt(uv, aspect, time);
    if (!softFade || time <= fadeStart) return flame;

    // Fade the composited volume once. Its straight RGB stays intact as the
    // footage underneath shows through, with hot folds lingering slightly.
    float heat = dot(flame.rgb, vec3(0.2126f, 0.7152f, 0.0722f));
    float end = mix(0.94f, 1.0f, smoothstep(0.04f, 0.45f, heat));
    flame.a *= 1.0f - smoothstep(fadeStart, end, time);
    return flame.a < 0.5f / 255.0f ? vec4(0.0f) : flame;
}
