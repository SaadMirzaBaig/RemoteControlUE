import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Object3D } from '../../models/object.model';
import { ObjectsService } from '../../services/objects/objects.service';

@Component({
  selector: 'app-object-item',
  templateUrl: './object-item.component.html',
  styleUrl: './object-item.component.css',
  standalone: false,
})

// Component to display a 3D object item.
export class ObjectItemComponent {
  @Input({ required: true }) object!: Object3D;
  @Output() edit = new EventEmitter<Object3D>();
  @Output() deleted = new EventEmitter<void>();

  busy = false;
  error: string | null = null;

  constructor(private objectsService: ObjectsService) { }

  // Handle edit button click.
  onEditClick(): void {
    this.error = null;
    this.edit.emit(this.object);
  }

  // Handle delete button click.
  onDeleteClick(): void {
    this.error = null;
    if (!confirm(`Delete object ${this.object.id}?`)) {
      return;
    }
    this.busy = true;
    this.objectsService.delete(this.object.id).subscribe({
      next: () => {
        this.busy = false;
        this.deleted.emit();
      },
      error: () => {
        this.busy = false;
        this.error = 'Delete failed.';
      },
    });
  }
}
