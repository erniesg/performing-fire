/* In-board orbit modal: click any [data-glb] button to inspect that model.
   THREE initialized lazily on first open; ESC or CLOSE to dismiss. */
(function () {
  const modal = document.getElementById("orbmodal");
  const wrap = document.getElementById("orbwrap");
  const label = document.getElementById("orblabel");
  if (!modal || !window.THREE) return;
  let renderer = null, scene, cam, controls, current = null, running = false;

  function init() {
    if (renderer) return true;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch (e) { label.textContent = "WEBGL UNAVAILABLE"; return false; }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    wrap.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07070c);
    cam = new THREE.PerspectiveCamera(40, 1, 0.01, 100);
    controls = new THREE.OrbitControls(cam, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 1.5;
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x120e0a, 0.6));
    const key = new THREE.DirectionalLight(0xfff1de, 1.5); key.position.set(3, 4, 3); scene.add(key);
    const rimM = new THREE.PointLight(0xff3ea5, 9, 22); rimM.position.set(3.2, 1.0, -2.4); scene.add(rimM);
    const rimC = new THREE.PointLight(0x2bd9ff, 7, 22); rimC.position.set(-3.2, 0.7, -2.2); scene.add(rimC);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 48),
      new THREE.MeshStandardMaterial({ color: 0x060609, roughness: 0.85, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2; floor.name = "pfFloor"; scene.add(floor);
    size();
    (function loop() {
      requestAnimationFrame(loop);
      if (!running) return;
      controls.update(); renderer.render(scene, cam);
    })();
    return true;
  }
  function size() {
    if (!renderer) return;
    renderer.setSize(innerWidth, innerHeight);
    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
  }
  addEventListener("resize", size);

  function b64buf(b64) {
    const s = atob(b64), a = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a.buffer;
  }

  function open(key2, name) {
    if (!init()) { modal.classList.add("on"); return; }
    modal.classList.add("on");
    running = true;
    label.textContent = (name || key2).toUpperCase();
    new THREE.GLTFLoader().parse(b64buf(PF_GLB[key2]), "", (g) => {
      if (current) scene.remove(current);
      current = g.scene;
      const box = new THREE.Box3().setFromObject(current);
      const sz = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      current.position.sub(c);
      scene.getObjectByName("pfFloor").position.y = -sz.y / 2 - 0.02;
      scene.add(current);
      const R = Math.max(sz.x, sz.y, sz.z);
      cam.position.set(R * 0.9, R * 0.45, R * 1.6);
      cam.near = R / 100; cam.far = R * 20; cam.updateProjectionMatrix();
      controls.target.set(0, 0, 0); controls.update();
    }, (e) => { label.textContent = "PARSE FAILED"; console.warn(e); });
  }
  function close() { modal.classList.remove("on"); running = false; }

  document.getElementById("orbclose").addEventListener("click", close);
  addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.querySelectorAll("button.rot[data-glb]").forEach(b => {
    if (!PF_GLB[b.dataset.glb]) { b.style.display = "none"; return; }
    b.addEventListener("click", () => {
      const cap = b.closest("figure");
      const nm = cap ? (cap.querySelector("b, figcaption b") || {}).textContent : "";
      open(b.dataset.glb, nm || b.dataset.glb);
    });
  });
})();
