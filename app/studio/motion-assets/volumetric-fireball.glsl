vec4 fireballAt(vec2 uv, float aspect, float time, float centreTime) {
    if (time <= 0.016f || time >= 0.994f) { return vec4(0.0f); }

    float growth = max(time - 0.022f, 0.0f);
    float radius = 0.065f + 2.48f * pow(unitRange(growth / 0.66f), 0.78f);
    float ignition = smoothstep(0.026f, 0.105f, time);
    float cooling = smoothstep(0.28f, 0.86f, time);
    float fade = (1.0f - smoothstep(0.66f, 0.994f, centreTime)) * ignition;
    float thickness = 0.045f + 0.204f * min(radius, 1.4f);
    float distortion = 0.12f + 0.28f * min(radius, 1.5f);
    vec2 screen = vec2(uv.x - 0.5f, 0.5f - uv.y) * vec2(2.92f * aspect / (16.0f / 9.0f), 1.6425f);
    float rise = centreTime * centreTime * 0.29f + 2.08f * smoothstep(0.70f, 0.97f, centreTime);
    vec2 centre = vec2(0.16f - centreTime * 0.29f, -0.10f + rise);
    vec2 ray = (screen - centre) * vec2(1.0f, 1.04f);
    float outer = radius + distortion + thickness * 2.1f;
    float distanceSquared = outer * outer - dot(ray, ray);
    if (distanceSquared <= 0.0f) { return vec4(0.0f); }

    // Orthographic projection through the expanding, uneven combustion shell.
    float bound = sqrt(distanceSquared);
    float depthStep = (2.0f * bound) / 88.0f;
    float depth = bound - depthStep * 0.5f;
    float colourScale = 4.9f * (1.0f - 0.38f * smoothstep(0.26f, 0.76f, time)) / (0.63f + min(radius, 1.5f) * 0.64f);
    vec3 travel = vec3(-time * 1.7f, -time * 2.5f, time * 1.3f);
    float fromCentre = length(ray) / radius;
    float limb = mix(0.77f, 1.0f, smoothstep(0.18f, 0.94f, fromCentre));
    float heatFalloff = mix(limb, 1.0f, smoothstep(0.18f, 0.46f, time));
    float burnout = smoothstep(0.0f, 0.34f, time - centreTime);
    vec4 accumulated = vec4(0.0f);
    for (uint rayStep = 0u; rayStep < 88u && accumulated.a < 0.994f; ++rayStep, depth -= depthStep) {
        vec3 point = vec3(ray, depth);
        float radial = length(point) - radius;
        if (abs(radial) > thickness * 2.2f + distortion * 0.62f) continue;

        vec3 field = point * colourScale + travel;
        float large = fieldNoise(field * 0.57f + 3.1f);
        float folded = fieldNoise(rotateNoise(field) * 1.49f + large * 1.4f);
        float surface = radial + (large - 0.5f) * distortion + (folded - 0.5f) * distortion * 0.48f;
        float offset = surface / thickness;
        float shell = exp(-offset * offset * 1.45f);
        if (shell < 0.022f) continue;

        vec3 warp = vec3(fieldNoise(field + 3.9f), fieldNoise(field - 5.8f), fieldNoise(field + 12.4f)) - 0.5f;
        vec3 eddies = field * 1.41f + warp * 2.15f + folded * 0.74f;
        float pattern = turbulence(eddies);
        float coarseFold = exp(-abs(pattern - 0.50f) * 14.0f);
        float fineFold = exp(-abs(fieldNoise(rotateNoise(eddies) * 4.1f) - 0.47f) * 22.0f);
        float pockets = smoothstep(0.19f, 0.58f, pattern * 0.66f + folded * 0.34f);
        float density = shell * pockets * (0.17f + 0.62f * coarseFold + 0.21f * fineFold);

        float rim = smoothstep(-0.72f, 0.42f, surface / thickness);
        float incandescent = 0.22f + coarseFold * 0.34f + fineFold * 0.15f + rim * 0.36f + (pattern - 0.5f) * 0.32f;
        float temperature = unitRange(incandescent * (1.17f - 0.66f * cooling) * heatFalloff);
        // Thin, cooler folds empty first. Dense hot filaments remain visible
        // between the gaps as the turbulence carries them through the fade.
        if (burnout > 0.0f) {
            float fuel = 0.62f * pockets + 0.38f * coarseFold;
            density *= 1.0f - smoothstep(fuel * 0.50f, 0.32f + fuel * 0.72f, burnout);
            temperature *= 1.0f - 0.23f * burnout;
        }
        float opacity = (1.0f - exp(-density * depthStep * (9.1f / (0.74f + radius * 0.22f)))) * fade;
        float contribution = (1.0f - accumulated.a) * opacity;
        accumulated += vec4(fireColour(temperature) * contribution, contribution);
    }

    // Seeded specks travel outwards with the early flame front.
    if (time < 0.40f && fromCentre > 0.96f && fromCentre < 1.43f) {
        vec2 sparkPosition = ray * (120.0f / (radius + 0.22f));
        ivec2 cell = ivec2(floor(sparkPosition));
        float seed = lattice(ivec3(cell, 49));
        if (seed > 0.956f) {
            vec2 offset = mix(vec2(0.22f), vec2(0.78f), vec2(lattice(ivec3(cell, 2)), lattice(ivec3(cell, 15))));
            float coverage = 1.0f - smoothstep(0.051f, 0.23f, length(fract(sparkPosition) - offset));
            float spread = smoothstep(0.96f, 1.08f, fromCentre) * (1.0f - smoothstep(1.17f, 1.43f, fromCentre));
            float alpha = coverage * spread * ignition * (1.0f - smoothstep(0.23f, 0.40f, time)) * 0.61f;
            accumulated = accumulated * (1.0f - alpha) + vec4(vec3(1.0f, 0.64f, 0.28f) * alpha, alpha);
        }
    }

    float alpha = accumulated.a;
    if (alpha < 0.5f / 255.0f) { return vec4(0.0f); }
    vec3 straight = accumulated.rgb / alpha;
    return vec4(straight, alpha);
}
