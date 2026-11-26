float unitRange(float value) { return clamp(value, 0.0f, 1.0f); }

float lattice(ivec3 point) {
    uint bits = uint(point.x) * 1640531513u ^ uint(point.y) * 2246822519u ^ uint(point.z) * 3266489917u;
    bits = (bits ^ (bits >> 16)) * 668265263u;
    return float(bits >> 8) * (1.0f / 16777215.0f);
}

float fieldNoise(vec3 position) {
    ivec3 cell = ivec3(floor(position));
    vec3 weight = fract(position);
    weight = weight * weight * (3.0f - 2.0f * weight);
    vec4 left = vec4(lattice(cell), lattice(cell + ivec3(0, 1, 0)),
                         lattice(cell + ivec3(0, 0, 1)), lattice(cell + ivec3(0, 1, 1)));
    vec4 right = vec4(lattice(cell + ivec3(1.0f, 0, 0)), lattice(cell + ivec3(1, 1, 0)),
                          lattice(cell + ivec3(1.0f, 0, 1)), lattice(cell + ivec3(1, 1, 1)));
    vec4 edges = mix(left, right, weight.x);
    return mix(mix(edges.x, edges.y, weight.y), mix(edges.z, edges.w, weight.y), weight.z);
}

vec3 rotateNoise(vec3 p) {
    return vec3(dot(p, vec3(0.36f, 0.48f, -0.80f)),
                  dot(p, vec3(-0.80f, 0.60f, 0.0f)), dot(p, vec3(0.48f, 0.64f, 0.60f)));
}

float turbulence(vec3 p) {
    float detail = fieldNoise(p) * 0.55f;
    p = rotateNoise(p) * 2.09f + 17.4f;
    detail += fieldNoise(p) * 0.27f;
    p = rotateNoise(p) * 2.12f - 8.1f;
    detail += fieldNoise(p) * 0.12f;
    return detail + fieldNoise(rotateNoise(p) * 2.14f) * 0.06f;
}

vec3 fireColour(float temperature) {
    vec3 red = mix(vec3(0.24f, 0.019f, 0.003f), vec3(0.79f, 0.133f, 0.009f), smoothstep(0.04f, 0.49f, temperature));
    vec3 gold = mix(red, vec3(1.0f, 0.58f, 0.115f), smoothstep(0.42f, 0.76f, temperature));
    return mix(gold, vec3(1.0f, 0.979f, 0.82f), smoothstep(0.69f, 1.0f, temperature));
}
