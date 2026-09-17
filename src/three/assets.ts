import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_NAMES = [
  'bedSingle', 'bookcaseOpen', 'books', 'desk', 'chairDesk',
  'lampRoundTable', 'lampSquareFloor', 'televisionModern', 'cabinetTelevision',
  'loungeChair', 'pottedPlant', 'plantSmall1', 'rugRectangle', 'rugRound',
  'pillow', 'computerScreen', 'computerKeyboard', 'computerMouse', 'laptop', 'speaker',
  'sideTable', 'tableCoffee', 'lampSquareTable', 'pillowBlue', 'pillowBlueLong',
  'trashcan', 'cardboardBoxClosed',
] as const;

export type ModelName = (typeof MODEL_NAMES)[number];
export type ModelLibrary = Record<ModelName, THREE.Group>;

/** Loads every kit model once (via a shared LoadingManager for real progress reporting), returning clone-ready templates. */
export async function loadModels(manager: THREE.LoadingManager): Promise<ModelLibrary> {
  const loader = new GLTFLoader(manager);
  const entries = await Promise.all(
    MODEL_NAMES.map(async (name) => {
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`);
      const root = gltf.scene;
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if ((mesh as THREE.Mesh).isMesh) {
          mesh.castShadow = false;
          mesh.receiveShadow = false;
        }
      });
      return [name, root] as const;
    })
  );
  return Object.fromEntries(entries) as ModelLibrary;
}

/** Clone a loaded model for placement — geometry/materials are shared, transforms are independent. */
export function useModel(library: ModelLibrary, name: ModelName): THREE.Group {
  return library[name].clone(true);
}
