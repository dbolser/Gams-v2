'use strict';

// Store the world-to-view basis so drags always use the screen's axes,
// including after a roll or a turn past either pole.
class ViewRotation {
  constructor() { this.reset(); }

  reset() {
    const cy = Math.cos(.45), sy = Math.sin(.45);
    const cp = Math.cos(.42), sp = Math.sin(.42);
    this.basis = [[cy, sy, 0], [sp * sy, -sp * cy, cp], [-cp * sy, cp * cy, sp]];
  }

  apply(point) {
    return this.basis.map(row => row[0] * point[0] + row[1] * point[1] + row[2] * point[2]);
  }

  turn(a, b, angle) {
    const c = Math.cos(angle), s = Math.sin(angle);
    const first = this.basis[a], second = this.basis[b];
    this.basis[a] = first.map((value, i) => c * value - s * second[i]);
    this.basis[b] = first.map((value, i) => s * value + c * second[i]);
  }

  drag(dx, dy, spin = false) {
    if (spin) {
      this.turn(0, 1, -dx * .007);
    } else {
      this.turn(0, 2, dx * .007);
      this.turn(1, 2, -dy * .007);
    }
  }

  orbit(angle) { this.turn(0, 2, angle); }
}
