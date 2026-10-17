'use strict';

// h(z1,z2) = (2 Re(z1 conjugate(z2)), 2 Im(z1 conjugate(z2)), |z1|²-|z2|²).
// Multiplying both complex coordinates by exp(it) leaves h unchanged.
const HopfGeometry = {
  fiber(theta, phi, segments = 240) {
    const a = Math.cos(theta / 2), b = Math.sin(theta / 2);
    const points = [];
    for (let i = 0; i < segments; i++) {
      const t = i / segments * Math.PI * 2;
      const denominator = 1 - b * Math.cos(t - phi);
      points.push([
        a * Math.cos(t) / denominator,
        a * Math.sin(t) / denominator,
        b * Math.sin(t - phi) / denominator,
      ]);
    }
    points.push(points[0].slice());
    return points;
  },
  basePoint(theta, phi) {
    return [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
  },
  family(count, layers, centerDegrees) {
    const spread = Math.min(35, centerDegrees - 10, 160 - centerDegrees);
    return Array.from({length: count * layers}, (_, index) => {
      const layer = Math.floor(index / count);
      const theta = (centerDegrees + (layers === 1 ? 0 : (2 * layer / (layers - 1) - 1) * spread)) * Math.PI / 180;
      const phi = (index % count) / count * Math.PI * 2;
      return {
        points: this.fiber(theta, phi),
        base: this.basePoint(theta, phi),
        color: `hsl(${165 + (index % count) / count * 180}, 80%, ${60 + layer / layers * 16}%)`,
      };
    });
  },
};
