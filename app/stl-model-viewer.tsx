"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { OcctMesh, OcctModule } from "occt-import-js";
import { catalogModelFormat, type CatalogModel } from "./model-catalog-data";
import { contact } from "./site-content";
import styles from "./catalog.module.css";

type StlModelViewerProps = {
  model: CatalogModel;
  onClose: () => void;
};

function displayName(value: string) {
  return value.charAt(0).toLocaleUpperCase("ru") + value.slice(1);
}

let occtModulePromise: Promise<OcctModule> | null = null;

function getOcctModule() {
  if (!occtModulePromise) {
    occtModulePromise = import("occt-import-js").then(({ default: createOcctModule }) => createOcctModule({
      locateFile: () => "/vendor/occt/occt-import-js.wasm",
    }));
  }
  return occtModulePromise;
}

function materialColor(source?: [number, number, number]) {
  if (!source) return new THREE.Color(0xe66f27);
  return new THREE.Color(source[0], source[1], source[2]);
}

function createStepMesh(source: OcctMesh) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(source.attributes.position.array, 3));
  if (source.attributes.normal) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(source.attributes.normal.array, 3));
  else geometry.computeVertexNormals();
  geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(source.index.array), 1));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    color: materialColor(source.color),
    roughness: 0.56,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = source.name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const edgesGeometry = new THREE.EdgesGeometry(geometry, 38);
  const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x11110f, transparent: true, opacity: 0.22 });
  const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
  edges.renderOrder = 2;

  const group = new THREE.Group();
  group.add(mesh, edges);
  return group;
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh || child instanceof THREE.LineSegments)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
}

function frameObject(object: THREE.Object3D, camera: THREE.PerspectiveCamera, controls: OrbitControls) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) throw new Error("Модель не содержит геометрии.");
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  object.position.sub(center);

  const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
  const distance = maxDimension / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  camera.near = Math.max(distance / 1000, 0.001);
  camera.far = Math.max(distance * 100, 100);
  camera.position.set(distance * 0.95, distance * 0.72, distance * 1.25);
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.minDistance = distance * 0.2;
  controls.maxDistance = distance * 6;
  controls.update();
}

export default function StlModelViewer({ model, onClose }: StlModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const format = catalogModelFormat(model);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3f0ea);

    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10000);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      queueMicrotask(() => setError("Браузер не смог запустить WebGL. Обновите страницу или откройте каталог в другом браузере."));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.075;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    controls.autoRotate = !reducedMotion.matches;
    controls.autoRotateSpeed = 1.25;
    controls.enablePan = true;
    const updateMotionPreference = () => { controls.autoRotate = !reducedMotion.matches; };
    reducedMotion.addEventListener("change", updateMotionPreference);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x4a4945, 2.4));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(4, 6, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xe66f27, 1.1);
    fillLight.position.set(-4, 1, -3);
    scene.add(fillLight);

    let modelObject: THREE.Object3D | null = null;
    let frame = 0;
    let disposed = false;

    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setError("3D-просмотр был остановлен браузером. Закройте окно и откройте модель ещё раз.");
    };
    canvas.addEventListener("webglcontextlost", handleContextLost);

    const resize = () => {
      const width = Math.max(canvas.clientWidth, 1);
      const height = Math.max(canvas.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    if (format === "STL") {
      const loader = new STLLoader();
      loader.load(
        model.model,
        (geometry) => {
          if (disposed) {
            geometry.dispose();
            return;
          }
          try {
            geometry.computeVertexNormals();
            geometry.center();
            const material = new THREE.MeshStandardMaterial({
              color: 0xe66f27,
              roughness: 0.58,
              metalness: 0.08,
              side: THREE.DoubleSide,
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            modelObject = mesh;
            scene.add(mesh);
            frameObject(mesh, camera, controls);
            setProgress(100);
          } catch {
            geometry.dispose();
            setError("Не удалось подготовить эту геометрию к просмотру. Закройте окно и попробуйте ещё раз.");
          }
        },
        (event) => {
          if (event.lengthComputable) setProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
        },
        () => setError("Не удалось загрузить 3D-модель. Попробуйте открыть её ещё раз."),
      );
    } else {
      void (async () => {
        try {
          setProgress(8);
          const [response, occt] = await Promise.all([fetch(model.model), getOcctModule()]);
          if (!response.ok) throw new Error("STEP-файл не загрузился.");
          setProgress(38);
          const fileBuffer = new Uint8Array(await response.arrayBuffer());
          if (disposed) return;
          setProgress(58);
          const result = occt.ReadStepFile(fileBuffer, {
            linearUnit: "millimeter",
            linearDeflectionType: "bounding_box_ratio",
            linearDeflection: 0.0025,
            angularDeflection: 0.35,
          });
          if (!result.success || result.meshes.length === 0) throw new Error("STEP-файл не содержит доступной геометрии.");

          const group = new THREE.Group();
          result.meshes.forEach((source) => group.add(createStepMesh(source)));
          if (disposed) {
            disposeObject(group);
            return;
          }
          modelObject = group;
          scene.add(group);
          frameObject(group, camera, controls);
          setProgress(100);
        } catch {
          if (!disposed) setError("Не удалось открыть STEP-модель. Проверьте файл в админке или загрузите его заново.");
        }
      })();
    }

    const render = () => {
      controls.update();
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(render);
    };
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", handleContextLost);
      controls.dispose();
      reducedMotion.removeEventListener("change", updateMotionPreference);
      if (modelObject) disposeObject(modelObject);
      renderer.dispose();
    };
  }, [format, model.model]);

  const title = displayName(model.name);
  const orderUrl = `${contact.telegram}?text=${encodeURIComponent(`Здравствуйте! Хочу заказать печать модели «${title}» из каталога Центра 3D-печати.`)}`;

  return (
    <div className={styles.viewerBackdrop} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className={styles.viewerDialog} role="dialog" aria-modal="true" aria-labelledby="viewer-title">
        <div className={styles.viewerCanvasWrap}>
          <canvas ref={canvasRef} aria-label={`Интерактивная 3D-модель ${format}: ${title}`} />
          {progress < 100 && !error && (
            <div className={styles.viewerLoading}>
              <span>{format === "STEP" ? "ОБРАБАТЫВАЕМ STEP" : "ЗАГРУЖАЕМ МОДЕЛЬ"}</span>
              <b>{progress > 0 ? `${progress}%` : "…"}</b>
            </div>
          )}
          {error && <div className={styles.viewerError} role="alert"><p>{error}</p></div>}
          <p className={styles.viewerHint}>ВРАЩЕНИЕ — МЫШЬ / ПАЛЕЦ · МАСШТАБ — КОЛЕСО / ЖЕСТ</p>
        </div>

        <div className={styles.viewerInfo}>
          <button className={styles.viewerClose} type="button" onClick={onClose} ref={closeRef} aria-label="Закрыть просмотр модели">
            <span>ЗАКРЫТЬ</span><i aria-hidden="true" />
          </button>
          <span>{model.category}</span>
          <h2 id="viewer-title">{title}</h2>
          <p>{model.description}</p>
          <dl>
            <div><dt>ФОРМАТ</dt><dd>{format}</dd></div>
            <div><dt>МАТЕРИАЛ</dt><dd>{model.material}</dd></div>
            <div><dt>СТОИМОСТЬ</dt><dd>от {model.price.toLocaleString("ru-RU")} ₽</dd></div>
          </dl>
          <a href={orderUrl} target="_blank" rel="noreferrer">ЗАКАЗАТЬ ПЕЧАТЬ</a>
        </div>
      </section>
    </div>
  );
}
