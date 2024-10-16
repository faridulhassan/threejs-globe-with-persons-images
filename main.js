import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { convertLatLonToVec3 } from "./src/utils";
import peopleData from "./src/peopleData.json";
import gsap from "gsap";
import "./style.css";

function init() {
  const app = document.getElementById("app");
  const sphereRadius = 4.5;
  let isGlobRotating = true;

  // create scene, camera, renderer
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 10);

  let sizes = { width: window.innerWidth, height: window.innerHeight };
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.useLegacyLights = true;
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  app.appendChild(renderer.domElement);

  /* Orbit Control */
  const orbitControl = new OrbitControls(camera, renderer.domElement);
  orbitControl.minDistance = 7.5;
  orbitControl.maxDistance = 35;
  orbitControl.enablePan = false;
  orbitControl.enableZoom = false;
  orbitControl.enableDamping = true;
  orbitControl.dampingFactor = 0.05;
  orbitControl.rotateSpeed = 0.8;

  /* Textures */
  const textureLoader = new THREE.TextureLoader();
  const earthTexture = textureLoader.load("/images/2k_earth_nightmap.jpeg");
  const earthBumpMap = textureLoader.load("/images/8081-earthbump2k.jpeg");
  const earthCloudsMap = textureLoader.load("/images/2k_earth_clouds.png");

  /* Light */
  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(-1, 1, 1);
  scene.add(directionalLight);

  /* Globe */
  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  const earthGeoMetry = new THREE.SphereGeometry(sphereRadius, 64, 64);
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: earthBumpMap,
    bumpScale: 0.2
  });
  const earthMesh = new THREE.Mesh(earthGeoMetry, earthMaterial);
  earthGroup.add(earthMesh);

  const earthCloudMesh = new THREE.Mesh(
    new THREE.SphereGeometry(sphereRadius + 0.003, 64, 64),
    new THREE.MeshPhongMaterial({
      map: earthCloudsMap,
      transparent: true,
      opacity: 0.2
    })
  );
  earthGroup.add(earthCloudMesh);

  // Earth Glow Shader

  const earthGlowGeometry = new THREE.SphereGeometry(sphereRadius + 0.65),
    earthGlowMaterial = new THREE.ShaderMaterial({
      uniforms: {},

      vertexShader: [
        "varying vec3 vNormal;",

        "void main() {",

        "vNormal = normalize( normalMatrix * normal );",

        "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

        "}"
      ].join("\n"),

      fragmentShader: [
        "varying vec3 vNormal;",

        "void main() {",

        "float intensity = pow( 0.99 - dot( vNormal, vec3( 0, 0, 1.0 ) ), 6.0 );",

        "gl_FragColor = vec4( .28, .48, 1.0, 0.4 ) * intensity;",

        "}"
      ].join("\n"),

      side: THREE.BackSide,

      blending: THREE.AdditiveBlending,

      transparent: true,

      depthWrite: false
    });

  const glowingEarth = new THREE.Mesh(earthGlowGeometry, earthGlowMaterial);

  glowingEarth.renderOrder = -1;

  earthGroup.add(glowingEarth);

  /* People Images */
  const peopleGroup = new THREE.Group();
  earthGroup.add(peopleGroup);

  // Add people data to the globe
  peopleData.forEach((person, index) => {
    const peopleMaterial = new THREE.SpriteMaterial({
      map: textureLoader.load(`/images/${person.img}`),
      side: THREE.DoubleSide
    });
    const peopleMesh = new THREE.Sprite(peopleMaterial);
    peopleMesh.position.copy(
      convertLatLonToVec3(person.lat, person.lon).multiplyScalar(
        sphereRadius + 0.65
      )
    );
    peopleMesh.userData.id = index; // Add ID to identify person
    peopleGroup.add(peopleMesh);
  });

  earthGroup.rotation.y = 4;

  /* Utility Function: Animate and Rotate to Focus */
  function focusOnPerson(personMesh) {
    // Animate scale-up using GSAP
    gsap.to(personMesh.scale, {
      x: 1.5,
      y: 1.5,
      z: 1.5,
      duration: 0.5,
      ease: "power2.out"
    });

    // Calculate rotation to bring person in front
    const targetPosition = personMesh.position.clone().normalize();
    const spherical = new THREE.Spherical().setFromVector3(targetPosition);
    const targetRotationY = spherical.theta;
    const targetRotationX = spherical.phi - Math.PI / 2;

    // Animate globe rotation using GSAP
    gsap.to(earthGroup.rotation, {
      y: -targetRotationY,
      x: -targetRotationX,
      duration: 1.2,
      ease: "power2.inOut"
    });
  }

  // Raycaster for detecting clicks
  const raycaster = new THREE.Raycaster();
  const mousePos = new THREE.Vector2(0, 0);
  renderer.domElement.addEventListener("click", (event) => {
    mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
    mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mousePos, camera);

    const intersects = raycaster.intersectObjects(peopleGroup.children);
    if (intersects.length > 0) {
      isGlobRotating = false;
      const selectedPerson = intersects[0].object;

      // Reset scales for all people
      peopleGroup.children.forEach((person) => {
        gsap.to(person.scale, { x: 0.8, y: 0.8, z: 0.8, duration: 0.5 });
      });

      // Focus on the selected person
      focusOnPerson(selectedPerson);
    } else {
      isGlobRotating = true;
    }
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    sizes = { width: window.innerWidth, height: window.innerHeight };
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize(sizes.width, sizes.height);
    renderer.render(scene, camera);
  });

  // Animation loop
  function tick() {
    if (isGlobRotating) {
      earthGroup.rotation.y += 0.0007; // Continuously rotate the globe
    }
    orbitControl.update();
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}

init();
