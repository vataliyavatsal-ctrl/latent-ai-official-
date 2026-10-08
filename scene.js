(function () {
  if (typeof THREE === "undefined") {
    console.warn("Three.js load nahi hua, background skip.");
    return;
  }

  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isSmall = window.innerWidth < 700;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c10);
  scene.fog = new THREE.Fog(0x0b0c10, 70, 280);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);

  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- lights ---------- */
  scene.add(new THREE.AmbientLight(0x2a3350, 0.9));

  const moonLight = new THREE.DirectionalLight(0x8fa8ff, 0.6);
  moonLight.position.set(-40, 60, 30);
  scene.add(moonLight);

  const warmLight = new THREE.PointLight(0xffb86b, 1.4, 75);
  warmLight.position.set(-30, 38, 2);
  scene.add(warmLight);

  const purpleLight = new THREE.PointLight(0xa78bfa, 1.2, 70);
  purpleLight.position.set(32, 16, 14);
  scene.add(purpleLight);

  /* ---------- helpers ---------- */
  function beam(a, b, thickness, material) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, thickness), material);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  }

  function windowTexture() {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 128;
    const g = c.getContext("2d");
    g.fillStyle = "#0c0e15";
    g.fillRect(0, 0, 64, 128);
    const cols = ["#ffd98a", "#ffc46b", "#cfe0ff"];
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 8; x++) {
        if (Math.random() < 0.38) {
          g.fillStyle = Math.random() < 0.08 ? "#a78bfa" : cols[Math.floor(Math.random() * 3)];
          g.globalAlpha = rand(0.55, 1);
          g.fillRect(x * 8 + 2, y * 8 + 2, 4, 5);
        }
      }
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    return t;
  }

  const baseTextures = [windowTexture(), windowTexture(), windowTexture(), windowTexture(), windowTexture()];
  const matCache = {};

  function buildingMaterial(variant, rx, ry) {
    const key = variant + "_" + rx + "_" + ry;
    if (!matCache[key]) {
      const tex = baseTextures[variant].clone();
      tex.repeat.set(rx, ry);
      tex.needsUpdate = true;
      matCache[key] = new THREE.MeshBasicMaterial({ map: tex });
    }
    return matCache[key];
  }

  const roofMat = new THREE.MeshBasicMaterial({ color: 0x14161f });

  /* ---------- ground + river ---------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 500),
    new THREE.MeshBasicMaterial({ color: 0x0a0b10 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -100);
  scene.add(ground);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 400),
    new THREE.MeshStandardMaterial({ color: 0x0b1d33, roughness: 0.35, metalness: 0.4 })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, -40);
  scene.add(water);

  // light reflections on the river
  const sparkCount = isSmall ? 150 : 350;
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkCol = new Float32Array(sparkCount * 3);
  const sparkPalette = [new THREE.Color(0xffc46b), new THREE.Color(0xcfe0ff), new THREE.Color(0xa78bfa)];
  for (let i = 0; i < sparkCount; i++) {
    sparkPos[i * 3] = rand(-17, 17);
    sparkPos[i * 3 + 1] = 0.15;
    sparkPos[i * 3 + 2] = rand(-120, 80);
    const c = sparkPalette[Math.floor(Math.random() * 3)];
    sparkCol[i * 3] = c.r;
    sparkCol[i * 3 + 1] = c.g;
    sparkCol[i * 3 + 2] = c.b;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute("position", new THREE.BufferAttribute(sparkPos, 3));
  sparkGeo.setAttribute("color", new THREE.BufferAttribute(sparkCol, 3));
  const sparks = new THREE.Points(
    sparkGeo,
    new THREE.PointsMaterial({ size: 0.5, vertexColors: true, transparent: true, opacity: 0.8 })
  );
  scene.add(sparks);

  /* ---------- sky ---------- */
  const starCount = 700;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = rand(-450, 450);
    starPos[i * 3 + 1] = rand(60, 350);
    starPos[i * 3 + 2] = -rand(150, 450);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  scene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xbfc8ff, size: 1.4, sizeAttenuation: false, fog: false })
    )
  );

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(7, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xdfe6ff, fog: false })
  );
  moon.position.set(-70, 100, -230);
  scene.add(moon);

  /* ---------- Big Ben (Elizabeth Tower) + Parliament ---------- */
  const stone = new THREE.MeshStandardMaterial({ color: 0xb59f78, roughness: 0.9 });
  const roofGreen = new THREE.MeshStandardMaterial({ color: 0x2c3d3a, roughness: 0.7 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9b45a, roughness: 0.4, metalness: 0.5 });
  const faceMat = new THREE.MeshBasicMaterial({ color: 0xffe3a0 });
  const handMat = new THREE.MeshBasicMaterial({ color: 0x2a2418 });

  const bigBen = new THREE.Group();
  bigBen.position.set(-30, 0, -6);
  bigBen.scale.setScalar(1.15);

  const benBase = new THREE.Mesh(new THREE.BoxGeometry(6.4, 10, 6.4), stone);
  benBase.position.y = 5;
  bigBen.add(benBase);

  const benShaft = new THREE.Mesh(new THREE.BoxGeometry(4.6, 24, 4.6), stone);
  benShaft.position.y = 22;
  bigBen.add(benShaft);

  const benClock = new THREE.Mesh(new THREE.BoxGeometry(6, 6.4, 6), stone);
  benClock.position.y = 37.2;
  bigBen.add(benClock);

  function clockFace(rotY, ox, oz) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(2.3, 32), faceMat);
    const h1 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.6, 0.05), handMat);
    h1.position.set(0, 0.7, 0.03);
    const h2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.1, 0.05), handMat);
    h2.position.set(0.45, 0.1, 0.03);
    h2.rotation.z = -1.1;
    face.add(h1, h2);
    face.position.set(ox, 37.2, oz);
    face.rotation.y = rotY;
    bigBen.add(face);
  }
  clockFace(0, 0, 3.02);
  clockFace(Math.PI, 0, -3.02);
  clockFace(Math.PI / 2, 3.02, 0);
  clockFace(-Math.PI / 2, -3.02, 0);

  const benSpire = new THREE.Mesh(new THREE.ConeGeometry(4.2, 12, 4), roofGreen);
  benSpire.position.y = 46.4;
  benSpire.rotation.y = Math.PI / 4;
  bigBen.add(benSpire);

  const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), gold);
  finial.position.y = 53.5;
  bigBen.add(finial);
  scene.add(bigBen);

  const parliament = new THREE.Mesh(
    new THREE.BoxGeometry(34, 10, 8),
    [
      buildingMaterial(0, 1, 1),
      buildingMaterial(0, 1, 1),
      roofMat,
      roofMat,
      buildingMaterial(1, 8, 1),
      buildingMaterial(1, 8, 1),
    ]
  );
  parliament.position.set(-54, 5, -6);
  scene.add(parliament);

  /* ---------- London Eye ---------- */
  const steel = new THREE.MeshStandardMaterial({ color: 0xe6ecff, roughness: 0.5, metalness: 0.3 });
  const capMat = new THREE.MeshBasicMaterial({ color: 0xcfe3ff });
  const R = 13;

  const wheel = new THREE.Group();
  wheel.position.set(32, 15.5, 6);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.28, 8, 64), steel);
  wheel.add(ring);

  for (let i = 0; i < 16; i++) {
    const pivot = new THREE.Object3D();
    pivot.rotation.z = (i / 16) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.07, R, 0.07), steel);
    spoke.position.y = R / 2;
    pivot.add(spoke);
    wheel.add(pivot);
  }

  const capsules = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 10), capMat);
    cap.scale.set(1, 1.2, 1);
    cap.position.set(Math.cos(a) * R, Math.sin(a) * R, 0.7);
    wheel.add(cap);
    capsules.push(cap);
  }
  scene.add(wheel);

  scene.add(beam(new THREE.Vector3(32, 15.5, 4.6), new THREE.Vector3(25, 0, 0), 0.45, steel));
  scene.add(beam(new THREE.Vector3(32, 15.5, 4.6), new THREE.Vector3(39, 0, 0), 0.45, steel));

  /* ---------- Tower Bridge ---------- */
  const bridgeStone = new THREE.MeshStandardMaterial({ color: 0x7b8394, roughness: 0.85 });
  const bridgeBlue = new THREE.MeshStandardMaterial({ color: 0x2f64b5, roughness: 0.6 });
  const bridgeRoof = new THREE.MeshStandardMaterial({ color: 0x2d3a4f, roughness: 0.7 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffc46b });

  const bridge = new THREE.Group();
  bridge.position.set(0, 0, -10);

  [-8, 8].forEach((x) => {
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 22, 4.4), bridgeStone);
    body.position.set(x, 11, 0);
    bridge.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.4, 7, 4), bridgeRoof);
    roof.position.set(x, 25.5, 0);
    roof.rotation.y = Math.PI / 4;
    bridge.add(roof);

    [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]].forEach(([dx, dz]) => {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.7, 3.5, 4), bridgeRoof);
      t.position.set(x + dx, 23.75, dz);
      t.rotation.y = Math.PI / 4;
      bridge.add(t);
    });
  });

  const walkway = new THREE.Mesh(new THREE.BoxGeometry(11.6, 1.2, 2), bridgeBlue);
  walkway.position.set(0, 17, 0);
  bridge.add(walkway);

  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.8, 3.4),
    new THREE.MeshStandardMaterial({ color: 0x1c2230, roughness: 0.9 })
  );
  deck.position.set(0, 5.5, 0);
  bridge.add(deck);

  [-1.3, 1.3].forEach((z) => {
    [-1, 1].forEach((side) => {
      bridge.add(
        beam(
          new THREE.Vector3(side * 8, 17.5, z),
          new THREE.Vector3(side * 18, 6, z),
          0.35,
          bridgeBlue
        )
      );
    });
  });

  for (let i = 0; i < 14; i++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), lampMat);
    lamp.position.set(-17 + i * (34 / 13), 6.6, i % 2 ? 1.6 : -1.6);
    bridge.add(lamp);
  }
  scene.add(bridge);

  /* ---------- The Shard ---------- */
  const shard = new THREE.Mesh(
    new THREE.ConeGeometry(4, 60, 4),
    new THREE.MeshStandardMaterial({ color: 0x9fb4c8, emissive: 0x1b2a3a, roughness: 0.3, metalness: 0.4 })
  );
  shard.position.set(-22, 30, -60);
  shard.rotation.y = Math.PI / 4;
  scene.add(shard);

  /* ---------- city buildings ---------- */
  const blocked = [
    { x: -30, z: -6, r: 14 },
    { x: -54, z: -6, r: 22 },
    { x: 32, z: 6, r: 22 },
    { x: -22, z: -60, r: 10 },
  ];

  const buildingCount = isSmall ? 70 : 150;
  let placed = 0;
  let tries = 0;
  while (placed < buildingCount && tries < 1000) {
    tries++;
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * rand(22, 110);
    const z = rand(-150, 40);
    if (blocked.some((b) => Math.hypot(x - b.x, z - b.z) < b.r)) continue;

    const w = rand(4, 9);
    const d = rand(4, 9);
    const h = rand(8, 36);
    const variant = Math.floor(Math.random() * baseTextures.length);
    const side_ = buildingMaterial(variant, Math.max(1, Math.round(w / 4)), Math.max(1, Math.round(h / 8)));

    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side_, side_, roofMat, roofMat, side_, side_]);
    b.position.set(x, h / 2, z);
    scene.add(b);
    placed++;
  }

  /* ---------- camera + interaction ---------- */
  let mx = 0;
  let my = 0;
  let tx = 0;
  let ty = 0;

  window.addEventListener("pointermove", (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 2;
    ty = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 1 ? 72 : 50;
    camera.updateProjectionMatrix();
    if (reduceMotion) renderer.render(scene, camera);
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---------- animation ---------- */
  const clock = new THREE.Clock();

  function placeCamera(t) {
    camera.position.set(Math.sin(t * 0.08) * 10 + mx * 8, 15 - my * 3, 70);
    camera.lookAt(mx * 2, 22, -20);
  }

  if (reduceMotion) {
    placeCamera(0);
    renderer.render(scene, camera);
    return;
  }

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    mx += (tx - mx) * 0.04;
    my += (ty - my) * 0.04;
    placeCamera(t);

    wheel.rotation.z -= dt * 0.06;
    capsules.forEach((c) => (c.rotation.z = -wheel.rotation.z));

    const p = sparkGeo.attributes.position.array;
    for (let i = 0; i < sparkCount; i++) {
      p[i * 3 + 2] += dt * 1.5;
      if (p[i * 3 + 2] > 80) p[i * 3 + 2] = -120;
    }
    sparkGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
  }
  animate();
})();