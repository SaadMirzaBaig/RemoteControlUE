import { Component, ViewChild } from '@angular/core';
import { Object3D } from './models/object.model';
import { ObjectListComponent } from './components/object-list/object-list.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
  standalone: false,
})
export class AppComponent {
  @ViewChild(ObjectListComponent) private objectList?: ObjectListComponent;

  title = '3D object remote control';
  /** When set, the form is in edit mode for this object. */
  selectedObject: Object3D | null = null;
  listError: string | null = null;

  onEditObject(obj: Object3D): void {
    this.selectedObject = obj;
  }

  onListError(message: string): void {
    this.listError = message;
  }

  onFormSaved(): void {
    this.selectedObject = null;
    this.objectList?.refresh();
  }

  onFormCleared(): void {
    this.selectedObject = null;
  }
}
