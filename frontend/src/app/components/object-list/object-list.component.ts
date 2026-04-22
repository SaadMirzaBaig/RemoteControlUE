import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Object3D } from '../../models/object.model';
import { ObjectsService } from '../../services/objects/objects.service';

@Component({
  selector: 'app-object-list',
  templateUrl: './object-list.component.html',
  styleUrl: './object-list.component.css',
  standalone: false,
})
export class ObjectListComponent implements OnInit {
  @Output() editObject = new EventEmitter<Object3D>();
  @Output() loadError = new EventEmitter<string>();

  objects: Object3D[] = [];
  loading = false;

  constructor(private objectsService: ObjectsService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
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

  onEdit(obj: Object3D): void {
    this.editObject.emit(obj);
  }

  onDeleted(): void {
    this.refresh();
  }
}
