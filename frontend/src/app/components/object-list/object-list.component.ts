import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Object3D } from '../../models/object.model';
import { ObjectsService } from '../../services/objects/objects.service';

@Component({
  selector: 'app-object-list',
  templateUrl: './object-list.component.html',
  styleUrl: './object-list.component.css',
  standalone: false,
})

// Component to display a list of 3D objects.
export class ObjectListComponent implements OnInit {
  // Event emitter to emit the selected object.
  @Output() editObject = new EventEmitter<Object3D>();
  // Event emitter to emit the load error.
  @Output() loadError = new EventEmitter<string>();

  // List of objects to display.
  objects: Object3D[] = [];
  loading = false;

  // Constructor to inject the objects service.
  constructor(private objectsService: ObjectsService) { }

  ngOnInit(): void {
    this.refresh();
  }

  // Refresh the list of objects.
  refresh(): void {
    this.loading = true;
    // Fetch the list of objects from the server.
    this.objectsService.list().subscribe({
      next: (rows) => {
        this.objects = rows;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.loadError.emit('Failed to load objects. Is the API running at http://localhost:8000?');
      },
    });
  }

  // Handle edit button click.
  onEdit(obj: Object3D): void {
    this.editObject.emit(obj);
  }

  // Handle deleted event.
  onDeleted(): void {
    this.refresh();
  }
}
