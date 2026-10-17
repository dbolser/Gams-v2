const assert = require('assert').strict;
const {readFileSync} = require('fs');
const vm = require('vm');
const test = (name, check) => { check(); console.log(`PASS: ${name}`); };
const context = vm.createContext({});
vm.runInContext(readFileSync(`${__dirname}/../hopf-geometry.js`, 'utf8'), context);
const geometry = vm.runInContext('HopfGeometry', context);
const subtract = (a, b) => a.map((v, i) => v - b[i]);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const dot = (a, b) => a.reduce((sum, v, i) => sum + v*b[i], 0);

test('every sampled point maps back to its stated base-sphere point', () => {
  for (const center of [20, 90, 140]) for (const layers of [1, 3, 5]) {
    const fibers = geometry.family(12, layers, center);
    assert.equal(fibers.length, 12 * layers);
    for (const fiber of fibers) {
      assert.deepEqual(fiber.points[0], fiber.points[fiber.points.length - 1]);
      for (const p of fiber.points) {
        assert.ok(p.every(Number.isFinite));
        const norm = dot(p, p), denominator = norm + 1;
        const [a, b, c, d] = [2*p[0]/denominator, 2*p[1]/denominator, (norm-1)/denominator, 2*p[2]/denominator];
        const base = [2*(a*c+b*d), 2*(b*c-a*d), a*a+b*b-c*c-d*d];
        assert.ok(Math.hypot(...subtract(base, fiber.base)) < 1e-12);
      }
    }
  }
});

test('projected fibers are planar circles', () => {
  for (const theta of [.2, 1, 2.7]) {
    const points = geometry.fiber(theta, .7);
    const origin = points[0], u = subtract(points[80], origin), v = subtract(points[160], origin);
    const normal = cross(u, v), normalSquared = dot(normal, normal);
    const ux = cross(v, normal), vx = cross(normal, u);
    const center = origin.map((value, i) => value + (dot(u,u)*ux[i]+dot(v,v)*vx[i])/(2*normalSquared));
    const radius = Math.hypot(...subtract(origin, center));
    for (const p of points) {
      assert.ok(Math.abs(dot(subtract(p, origin), normal)) < 1e-10);
      assert.ok(Math.abs(Math.hypot(...subtract(p, center)) - radius) < 1e-10);
    }
  }
});

test('distinct fibers link once, including fibers on different tori', () => {
  const a = geometry.fiber(1.1, .2, 400);
  for (const b of [geometry.fiber(1.1, 2, 400), geometry.fiber(2.1, 1.2, 400)]) {
    let integral = 0;
    for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
      const delta = a[i].map((value, k) => (value + a[i-1][k] - b[j][k] - b[j-1][k]) / 2);
      integral += dot(delta, cross(subtract(a[i], a[i-1]), subtract(b[j], b[j-1]))) / Math.hypot(...delta)**3;
    }
    assert.ok(Math.abs(Math.abs(integral / (4*Math.PI)) - 1) < .002);
  }
});
