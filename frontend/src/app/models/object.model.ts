/**
 * 3D object as stored and exchanged with the API.
 * Color is a string in the UI; the backend may also accept/return RGB tuples.
 */
export type Shape3D = 'cube' | 'sphere' | 'cylinder';

export interface Object3D {
  id: string;
  shape: Shape3D;
  color: string;
  size: number;
}

export interface Object3DCreate {
  shape: Shape3D;
  color: string;
  size: number;
}

export interface Object3DUpdate {
  shape?: Shape3D;
  color?: string;
  size?: number;
}
