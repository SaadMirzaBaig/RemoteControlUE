import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Object3D, Object3DCreate, Shape3D } from '../../models/object.model';
import { ObjectsService } from '../../services/objects/objects.service';

@Component({
  selector: 'app-object-form',
  templateUrl: './object-form.component.html',
  styleUrl: './object-form.component.css',
  standalone: false,
})
export class ObjectFormComponent implements OnChanges {
  @Input() object: Object3D | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cleared = new EventEmitter<void>();

  readonly shapeOptions: Shape3D[] = ['cube', 'sphere', 'cylinder'];

  form: ReturnType<FormBuilder['group']>;
  busy = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private objectsService: ObjectsService,
  ) {
    this.form = this.fb.group({
      shape: this.fb.nonNullable.control<Shape3D>('cube', { validators: [Validators.required] }),
      color: this.fb.nonNullable.control('', { validators: [Validators.required] }),
      size: this.fb.nonNullable.control<number | null>(1, {
        validators: [Validators.required, Validators.min(0.0001)],
      }),
    });
  }

  get isEditMode(): boolean {
    return this.object !== null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['object']) {
      this.error = null;
      if (this.object) {
        this.form.patchValue({
          shape: this.object.shape,
          color: this.object.color,
          size: this.object.size,
        });
      } else {
        this.form.reset({
          shape: 'cube' as Shape3D,
          color: '',
          size: 1,
        });
      }
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { shape, color, size } = this.form.getRawValue();
    if (size === null) {
      return;
    }
    this.error = null;
    this.busy = true;

    if (this.object) {
      this.objectsService
        .update(this.object.id, { shape, color, size })
        .subscribe({
          next: () => {
            this.busy = false;
            this.saved.emit();
          },
          error: () => {
            this.busy = false;
            this.error = 'Update failed.';
          },
        });
    } else {
      const body: Object3DCreate = { shape, color, size };
      this.objectsService.create(body).subscribe({
        next: () => {
          this.busy = false;
          this.saved.emit();
        },
        error: () => {
          this.busy = false;
          this.error = 'Create failed.';
        },
      });
    }
  }

  newObject(): void {
    this.cleared.emit();
  }
}
