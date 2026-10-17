'use strict';

(() => {
  const get = id => document.getElementById(id);
  const canvas = get('hopf-view'), ctx = canvas.getContext('2d');
  const baseCanvas = get('hopf-base'), baseCtx = baseCanvas.getContext('2d');
  const rotation = new ViewRotation();
  let width = 0, height = 0, zoom = 1, drag = null;
  let fibers = [], extent = 1, last = 0;

  function rebuild() {
    const count = +get('hopf-count').value, layers = +get('hopf-family').value;
    fibers = HopfGeometry.family(count, layers, +get('hopf-latitude').value);
    extent = Math.max(...fibers.map(fiber => Math.max(...fiber.points.map(p => Math.hypot(...p)))));
    get('hopf-count-out').value = count;
    get('hopf-latitude-out').value = `${get('hopf-latitude').value}°`;
    get('hopf-status').textContent = `${fibers.length} FIBERS`;
    get('hopf-highlight').max = fibers.length - 1;
    get('hopf-highlight').value = Math.min(+get('hopf-highlight').value, fibers.length - 1);
    highlight();
  }

  function highlight() {
    get('hopf-highlight-out').value = `${+get('hopf-highlight').value + 1} / ${fibers.length}`;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect(), ratio = Math.min(2, devicePixelRatio);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    baseCanvas.width = baseCanvas.height = 110 * ratio;
    baseCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function rotateBase(p, y = .5, pch = .35) {
    const x = Math.cos(y) * p[0] + Math.sin(y) * p[1];
    const depth = -Math.sin(y) * p[0] + Math.cos(y) * p[1];
    return [x, Math.cos(pch) * p[2] - Math.sin(pch) * depth,
      Math.sin(pch) * p[2] + Math.cos(pch) * depth];
  }

  function screen(p) {
    const r = rotation.apply(p), scale = Math.min(width, height) * .39 * zoom / extent;
    return [width / 2 + r[0] * scale, height / 2 - r[1] * scale, r[2]];
  }

  function drawBase(selected) {
    baseCtx.clearRect(0, 0, 110, 110);
    baseCtx.fillStyle = '#0d1c2b'; baseCtx.strokeStyle = '#365068';
    baseCtx.beginPath(); baseCtx.arc(55, 55, 43, 0, 2 * Math.PI); baseCtx.fill(); baseCtx.stroke();
    // A fixed camera on S² makes latitude changes easy to compare.
    const points = fibers.map((fiber, index) => ({index, color: fiber.color, p: rotateBase(fiber.base)}));
    points.sort((a, b) => b.p[2] - a.p[2]);
    for (const {index, color, p} of points) {
      baseCtx.globalAlpha = p[2] > 0 ? .3 : 1;
      baseCtx.fillStyle = color;
      baseCtx.beginPath(); baseCtx.arc(55 + p[0] * 43, 55 - p[1] * 43, 2.5, 0, 2 * Math.PI); baseCtx.fill();
    }
    const p = points.find(point => point.index === selected).p;
    baseCtx.globalAlpha = 1; baseCtx.strokeStyle = '#fff'; baseCtx.lineWidth = 1.5;
    baseCtx.beginPath(); baseCtx.arc(55 + p[0] * 43, 55 - p[1] * 43, 5, 0, 2 * Math.PI); baseCtx.stroke();
  }

  function render(now) {
    const elapsed = Math.min(50, now - last); last = now;
    if (get('hopf-rotate').checked && !drag) rotation.orbit(elapsed * .00009);
    ctx.clearRect(0, 0, width, height);
    const selected = +get('hopf-highlight').value;
    const projected = fibers.map(fiber => fiber.points.map(screen));
    // Sort individual segments, so nearer crossings visibly pass over distant ones.
    const segments = [];
    projected.forEach((points, index) => {
      for (let i = 1; i < points.length; i++) {
        segments.push({a: points[i - 1], b: points[i], index, depth: (points[i - 1][2] + points[i][2]) / 2});
      }
    });
    segments.sort((a, b) => b.depth - a.depth);
    ctx.lineCap = 'round';
    for (const {a, b, index} of segments) {
      ctx.strokeStyle = index === selected ? '#fff' : fibers[index].color;
      ctx.lineWidth = index === selected ? 2.3 : 1.4;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    const points = projected[selected], p = points[Math.floor(now * .018) % (points.length - 1)];
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 2 * Math.PI); ctx.fill();
    drawBase(selected);
    requestAnimationFrame(render);
  }

  function resetCamera() { rotation.reset(); zoom = 1; }
  function zoomBy(factor) { zoom = Math.max(.4, Math.min(3, zoom * factor)); }
  for (const id of ['hopf-count', 'hopf-latitude', 'hopf-family']) get(id).addEventListener('input', rebuild);
  get('hopf-highlight').addEventListener('input', highlight);
  get('hopf-reset').addEventListener('click', resetCamera);
  canvas.addEventListener('pointerdown', event => {
    canvas.focus({preventScroll: true});
    drag = [event.clientX, event.clientY]; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    rotation.drag(event.clientX - drag[0], event.clientY - drag[1], event.shiftKey);
    drag = [event.clientX, event.clientY];
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { drag = null; });
  canvas.addEventListener('wheel', event => { event.preventDefault(); zoomBy(Math.exp(-event.deltaY * .001)); }, {passive: false});
  canvas.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'ArrowLeft') rotation.drag(-.1 / .007, 0, event.shiftKey);
    if (event.key === 'ArrowRight') rotation.drag(.1 / .007, 0, event.shiftKey);
    if (event.key === 'ArrowUp') rotation.drag(0, -.1 / .007);
    if (event.key === 'ArrowDown') rotation.drag(0, .1 / .007);
    if (event.key === '+' || event.key === '=') zoomBy(1.1);
    if (event.key === '-') zoomBy(1 / 1.1);
    if (event.key === 'Home') resetCamera();
  });
  new ResizeObserver(resize).observe(canvas);
  rebuild(); resize(); requestAnimationFrame(render);
})();
