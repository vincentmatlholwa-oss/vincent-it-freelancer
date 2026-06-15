// 3D Particle Background with Three.js
(function () {
    const container = document.getElementById('canvas-container');
    if (!container || typeof THREE === 'undefined') return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 4000;
    const positions = new Float32Array(particlesCount * 3);
    const colors = new Float32Array(particlesCount * 3);

    const color1 = new THREE.Color(0x00d4ff);
    const color2 = new THREE.Color(0x7b2ff7);

    for (let i = 0; i < particlesCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 30;
        positions[i + 1] = (Math.random() - 0.5) * 30;
        positions[i + 2] = (Math.random() - 0.5) * 30;

        const mix = Math.random();
        const c = color1.clone().lerp(color2, mix);
        colors[i] = c.r;
        colors[i + 1] = c.g;
        colors[i + 2] = c.b;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.03,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    // Floating geometric shapes
    const shapesGroup = new THREE.Group();

    // Torus Knot
    const torusKnotGeo = new THREE.TorusKnotGeometry(0.5, 0.15, 100, 16);
    const torusKnotMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.15,
        wireframe: true
    });
    const torusKnot = new THREE.Mesh(torusKnotGeo, torusKnotMat);
    torusKnot.position.set(5, -2, -5);
    torusKnot.rotation.x = Math.PI / 4;
    torusKnot.rotation.y = Math.PI / 4;
    shapesGroup.add(torusKnot);

    // Icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(0.4, 0);
    const icoMat = new THREE.MeshBasicMaterial({
        color: 0x7b2ff7,
        transparent: true,
        opacity: 0.1,
        wireframe: true
    });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    ico.position.set(-4, 3, -6);
    shapesGroup.add(ico);

    // Octahedron
    const octGeo = new THREE.OctahedronGeometry(0.35);
    const octMat = new THREE.MeshBasicMaterial({
        color: 0xff6b35,
        transparent: true,
        opacity: 0.08,
        wireframe: true
    });
    const oct = new THREE.Mesh(octGeo, octMat);
    oct.position.set(3, 4, -8);
    shapesGroup.add(oct);

    // Dodecahedron
    const dodGeo = new THREE.DodecahedronGeometry(0.3);
    const dodMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.06
    });
    const dod = new THREE.Mesh(dodGeo, dodMat);
    dod.position.set(-5, -3, -7);
    shapesGroup.add(dod);

    scene.add(shapesGroup);

    camera.position.z = 8;

    let mouseX = 0;
    let mouseY = 0;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (event.clientY / window.innerHeight - 0.5) * 2;
    });

    // Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Animation
    let time = 0;

    function animate() {
        requestAnimationFrame(animate);
        time += 0.001;

        particlesMesh.rotation.x += 0.0001;
        particlesMesh.rotation.y += 0.0002;

        torusKnot.rotation.x += 0.003;
        torusKnot.rotation.y += 0.005;
        ico.rotation.x += 0.004;
        ico.rotation.y -= 0.003;
        oct.rotation.x -= 0.005;
        oct.rotation.z += 0.004;
        dod.rotation.y += 0.002;
        dod.rotation.x += 0.003;

        const floatY = Math.sin(time * 0.5) * 0.3;
        torusKnot.position.y = -2 + floatY;
        ico.position.y = 3 + Math.sin(time * 0.7 + 1) * 0.3;
        oct.position.y = 4 + Math.sin(time * 0.6 + 2) * 0.3;
        dod.position.y = -3 + Math.sin(time * 0.8 + 3) * 0.3;

        camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.02;
        camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.02;
        camera.lookAt(scene.position);

        renderer.render(scene, camera);
    }

    animate();
})();
