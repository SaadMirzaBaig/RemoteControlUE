import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { Object3D, Object3DCreate, Object3DUpdate } from '../../models/object.model';

const API_BASE = 'http://localhost:8000';

@Injectable({
  providedIn: 'root',
})
export class ObjectsService {
  constructor(private http: HttpClient) {}

  list(): Observable<Object3D[]> {
    return this.http
      .get<unknown[]>(`${API_BASE}/objects`)
      .pipe(map((rows) => rows.map((r) => this.mapObject3D(r))));
  }

  create(body: Object3DCreate): Observable<Object3D> {
    return this.http
      .post<unknown>(`${API_BASE}/objects`, body, { headers: { 'Content-Type': 'application/json' } })
      .pipe(map((row) => this.mapObject3D(row)));
  }

  update(id: string, body: Object3DUpdate): Observable<Object3D> {
    return this.http
      .put<unknown>(`${API_BASE}/objects/${encodeURIComponent(id)}`, body, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(map((row) => this.mapObject3D(row)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/objects/${encodeURIComponent(id)}`);
  }

  private mapObject3D(raw: unknown): Object3D {
    const o = raw as {
      id: string;
      shape: Object3D['shape'];
      color: string | number[];
      size: number;
    };
    return {
      id: o.id,
      shape: o.shape,
      color: this.normalizeColor(o.color),
      size: o.size,
    };
  }

  private normalizeColor(color: string | number[]): string {
    if (Array.isArray(color)) {
      return color.join(',');
    }
    return color;
  }
}
