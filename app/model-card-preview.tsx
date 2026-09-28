"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import type { OcctMesh, OcctModule } from "occt-import-js";
import { catalogModelFormat, type CatalogModel } from "./model-catalog-data";
import styles from "./catalog.module.css";

type ModelCardPreviewProps = {
  model: CatalogModel;
};

const previewCache = new Map<string, string>();
let previewQueue = Promise.resolve();
let occtModulePromise: Promise<OcctModule> | null = null;

function getOcctModule() {
  if (!occtModulePromise) {
    occtModulePromise = import("occt-import-js").then(({ default: createOcctModule }) => createOcctModule({
      locateFile: () => "/vendor/occt/occt-import-js.wasm",
    }));
  }
  return occtModulePromise;
}

function material() {
  return new THREE.MeshStandardMaterial({
    color: 0xe66f27,
    roughness: 0.62,
    metalness: 0.06,
    side: THREE.DoubleSide,
  });
}

function createStepMesh(source: OcctMesh) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(source.attributes.position.array, 3));
  if (source.attributes.normal) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(source.attributes.normal.array, 3));
  else geometry.computeVertexNormals();
  geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(source.index.array), 1));
  geometry.computeBoundingSphere();
  return new THREE.Mesh(geometry, material());
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((item) => item.dispose());
  });
}

async function loadModel(model: CatalogModel) {
  const response = await fetch(model.model);
  if (!response.ok) throw new Error("Model preview failed to load");
  const fileBuffer = await response.arrayBuffer();

  if (catalogModelFormat(model) === "STL") {
    const geometry = new STLLoader().parse(fileBuffer);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return new THREE.Mesh(geometry, material());
  }

  const occt = await getOcctModule();
  const result = occt.ReadStepFile(new Uint8Array(fileBuffer), {
    linearUnit: "millimeter",
    linearDeflectionType: "bounding_box_ratio",
    linearDeflection: 0.0035,
    angularDeflection: 0.45,
  });
  if (!result.success || result.meshes.length === 0) throw new Error("STEP preview has no geometry");
  const group = new THREE.Group();
  result.meshes.forEach((source) => group.add(createStepMesh(source)));
  return group;
}

async function renderPreview(model: CatalogModel) {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(640, 640, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf3f0ea);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x77736b, 2.65));
  const keyLight = new THREE.DirectionalLight(0xffffff, 3.4);
  keyLight.position.set(4, -5, 7);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xe66f27, 0.8);
  fillLight.position.set(-5, 2, 2);
  scene.add(fillLight);

  let object: THREE.Object3D | null = null;
  try {
    object = await loadModel(model);
    scene.add(object);

    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) throw new Error("Model preview has no bounds");
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);

    const centeredBox = new THREE.Box3().setFromObject(object);
    const sphere = centeredBox.getBoundingSphere(new THREE.Sphere());
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, Math.max(sphere.radius * 100, 100));
    camera.up.set(0, 0, 1);
    const distance = Math.max(sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)), 1) * 1.08;
    camera.position.copy(new THREE.Vector3(1.05, -1.25, 0.82).normalize().multiplyScalar(distance));
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    return renderer.domElement.toDataURL("image/png");
  } finally {
    if (object) disposeObject(object);
    renderer.dispose();
    renderer.forceContextLoss();
  }
}

export default function ModelCardPreview({ model }: ModelCardPreviewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState(() => previewCache.get(model.model) ?? "");
  const [failed, setFailed] = useState(false);
  const format = catalogModelFormat(model);

  useEffect(() => {
    if (preview) return;
    const root = rootRef.current;
    if (!root) return;
    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      previewQueue = previewQueue
        .then(() => renderPreview(model))
        .then((result) => {
          previewCache.set(model.model, result);
          if (active) setPreview(result);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    }, { rootMargin: "300px" });
    observer.observe(root);

    return () => {
      active = false;
      observer.disconnect();
    };
  }, [model, preview]);

  return (
    <div className={styles.modelGeneratedPreview} ref={rootRef} aria-hidden="true">
      {preview ? (
        <Image src={preview} alt="" fill unoptimized />
      ) : (
        <div className={styles.modelPreviewLoading} data-failed={failed}>
          <i />
          <small>{failed ? "ПРЕВЬЮ НЕДОСТУПНО" : `ГОТОВИМ ${format}`}</small>
        </div>
      )}
    </div>
  );
}
