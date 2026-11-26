// Small incandescent fragments travel beyond the flame front, slow, and fall.
float sparksAt(vec2 point, float time) {
    float brightest = 0.0f;
    for (int i = 0; i < 24; ++i) {
        float angle = 6.28318f * lattice(ivec3(i, 23, 6));
        vec2 direction = vec2(cos(angle), sin(angle));
        float speed = 1.1f + 1.65f * lattice(ivec3(i, 9, 12));
        float travel = 1.0f - exp(-4.1f * time);
        vec2 centre = direction * speed * travel + vec2(0.0f, 0.30f * time - 0.95f * time * time);
        vec2 tail = direction * (0.010f + 0.042f * (1.0f - travel));
        vec2 offset = point - centre;
        float along = unitRange(-dot(offset, tail) / dot(tail, tail));
        float distanceToStreak = length(offset + along * tail);
        float coverage = 1.0f - smoothstep(0.001f, 0.007f, distanceToStreak);
        brightest = max(brightest, coverage * (1.0f - 0.75f * along) * (0.38f + 0.55f * lattice(ivec3(i, 4, 7))));
    }
    return brightest * smoothstep(0.03f, 0.14f, time) * (1.0f - smoothstep(0.25f, 0.8f, time));
}

vec4 fireballAt(vec2 uv, float aspect, float time, float /* centreTime */, float /* residualSpeed */) {
    if (time <= 0.0f || time >= 1.0f) return vec4(0.0f);
    float radius = 0.045f + 1.52f * (1.0f - exp(-4.25f * time));
    vec2 screen = (uv - 0.5f) * vec2(2.0f * aspect, -2.0f);
    float sparkAlpha = sparksAt(screen - vec2(-0.09f, -0.34f), time);
    vec3 sparkColour = vec3(1.0f, 0.63f, 0.24f);
    screen -= vec2(-0.09f + 0.19f * time, -0.34f + 0.97f * time * time);
    vec2 ray = screen / (radius * vec2(1.15f, 0.96f));
    float chord = 1.52f * 1.52f - dot(ray, ray);
    if (chord <= 0.0f) return sparkAlpha < 0.5f / 255.0f ? vec4(0.0f) : vec4(sparkColour, sparkAlpha);

    float depth = sqrt(chord);
    float stepSize = 2.0f * depth / 68.0f;
    float cooling = smoothstep(0.12f, 0.84f, time);
    float fade = 1.0f - smoothstep(0.64f, 1.0f, time);
    vec4 light = vec4(0.0f);
    for (int i = 0; i < 68 && light.a < 0.993f; ++i) {
        vec3 p = vec3(ray, depth - (float(i) + 0.5f) * stepSize);
        float distanceFromCentre = length(p);
        if (distanceFromCentre > 1.49f) continue;
        // A rising layer shears across slower gas beneath it. Domain warping
        // keeps small curls attached to the larger billows during expansion.
        vec3 flow = p * (2.58f + 0.61f * time) + vec3(2.8f, -1.15f * time, 5.2f);
        vec3 warp = vec3(fieldNoise(flow), fieldNoise(flow + 7.3f), fieldNoise(flow - 4.7f)) - 0.5f;
        vec3 folds = rotateNoise(flow + warp * (0.84f + 0.7f * time));
        float broad = fieldNoise(folds + 1.2f);
        float mids = fieldNoise(folds * 2.37f);
        float edge = distanceFromCentre - (0.86f + (broad - 0.46f) * 1.0f + (mids - 0.49f) * 0.40f);
        if (edge > 0.15f) continue;
        float detail = turbulence(5.1f * folds + 0.82f * mids);
        edge += (detail - 0.50f) * 0.24f;
        float fuel = 0.48f * broad + 0.30f * mids + 0.22f * detail;
        float breaks = cooling * smoothstep(0.5f, 0.9f, time) * 0.37f;
        float density = (1.0f - smoothstep(-0.13f, 0.065f, edge))
            * smoothstep(0.10f + breaks, 0.49f + breaks, fuel);
        // Dense, cooler folds obscure the interior. Gaps expose luminous gas.
        float creases = 1.0f - smoothstep(0.015f, 0.22f, abs(detail - 0.50f));
        float heat = 0.76f + 1.9f * (fuel - 0.50f) + 0.16f * creases
            - 0.64f * cooling - 0.45f * smoothstep(-0.32f, 0.035f, edge)
            - 0.075f * p.y + 0.48f * exp(-10.0f * time);
        vec3 soot = mix(vec3(0.09f, 0.054f, 0.043f), vec3(0.30f, 0.21f, 0.16f),
            unitRange(0.48f + 0.33f * p.y + 0.65f * (detail - 0.5f)));
        vec3 flame = fireColour(unitRange(heat));
        vec3 colour = mix(soot, flame, smoothstep(0.23f, 0.52f, heat));
        float opacity = 1.0f - exp(-density * stepSize * 18.0f);
        float weight = (1.0f - light.a) * opacity;
        light += vec4(colour * weight, weight);
    }
    float visibility = fade * smoothstep(0.0f, 0.038f, time);
    float alpha = light.a * visibility;
    vec3 emitted = light.rgb * visibility;
    emitted += (1.0f - alpha) * sparkColour * sparkAlpha;
    alpha += (1.0f - alpha) * sparkAlpha;
    if (alpha < 0.5f / 255.0f) return vec4(0.0f);
    return vec4(emitted / alpha, alpha);
}
