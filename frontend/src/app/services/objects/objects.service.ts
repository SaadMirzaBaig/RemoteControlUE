import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Object3D, Object3DCreate, Object3DUpdate, Position3D, Rotation3D } from '../../models/object.model';

const API_BASE = 'http://localhost:8000';

// Service to handle objects.
@Injectable({
  providedIn: 'root',
})
export class ObjectsService {
  // Constructor to inject the HTTP client.
  constructor(private http: HttpClient) { }
  // List all objects.
  // Returns an observable of an array of Object3D.
  list(): Observable<Object3D[]> {
    return this.http
      .get<unknown[]>(`${API_BASE}/objects`)
      .pipe(map((rows) => rows.map((r) => this.mapObject3D(r))));
  }

  // Create a new object.
  // Returns an observable of an Object3D.
  create(body: Object3DCreate): Observable<Object3D> {
    return this.http
      .post<unknown>(`${API_BASE}/objects`, body, { headers: { 'Content-Type': 'application/json' } })
      .pipe(map((row) => this.mapObject3D(row)));
  }

  // Update an existing object.
  // Returns an observable of an Object3D.
  update(id: string, body: Object3DUpdate): Observable<Object3D> {
    return this.http
      .put<unknown>(`${API_BASE}/objects/${encodeURIComponent(id)}`, body, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(map((row) => this.mapObject3D(row)));
  }

  // Delete an existing object.
  // Returns an observable of void.
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/objects/${encodeURIComponent(id)}`);
  }

  // Map a raw object to an Object3D.
  private mapObject3D(raw: unknown): Object3D {
    const o = raw as {
      id: string;
      shape: Object3D['shape'];
      color: string | number[];
      size: number;
      position?: Position3D;
      rotation?: Rotation3D;
    };
    return {
      id: o.id,
      shape: o.shape,
      color: this.normalizeColor(o.color),
      size: o.size,
      position: o.position,
      rotation: o.rotation,
    };
  }

  // Normalize the color to a string.
  private normalizeColor(color: string | number[]): string {
    if (Array.isArray(color)) {
      return color.join(',');
    }
    return color;
  }
}
