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

// Component to create or edit 3D objects.
export class ObjectFormComponent implements OnChanges {
  @Input() object: Object3D | null = null;
  @Output() saved = new EventEmitter<void>();
  @Output() cleared = new EventEmitter<void>();

  readonly shapeOptions: Shape3D[] = ['cube', 'sphere', 'cylinder'];

  // Form group for the object form.
  form: ReturnType<FormBuilder['group']>;
  // Flag to indicate if the form is busy.
  busy = false;
  // Error message to display.
  error: string | null = null;

  // Constructor to inject the form builder and objects service.
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
      positionX: this.fb.nonNullable.control<number>(0),
      positionY: this.fb.nonNullable.control<number>(0),
      positionZ: this.fb.nonNullable.control<number>(0),
      rotationPitch: this.fb.nonNullable.control<number>(0),
      rotationYaw: this.fb.nonNullable.control<number>(0),
      rotationRoll: this.fb.nonNullable.control<number>(0),
    });
  }

  // Getter to check if the form is in edit mode.
  get isEditMode(): boolean {
    return this.object !== null;
  }

  // Lifecycle hook to handle changes to the input object.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['object']) {
      this.error = null;
      if (this.object) {
        this.form.patchValue({
          shape: this.object.shape,
          color: this.object.color,
          size: this.object.size,
          positionX: this.object.position?.x ?? 0,
          positionY: this.object.position?.y ?? 0,
          positionZ: this.object.position?.z ?? 0,
          rotationPitch: this.object.rotation?.pitch ?? 0,
          rotationYaw: this.object.rotation?.yaw ?? 0,
          rotationRoll: this.object.rotation?.roll ?? 0,
        });
      } else {
        // Reset the form to defaults if the object is null.
        this.resetToDefaults();
      }
    }
  }

  // Reset the form to default values.
  private resetToDefaults(): void {
    this.form.reset({
      shape: 'cube' as Shape3D,
      color: '',
      size: 1,
      positionX: 0,
      positionY: 0,
      positionZ: 0,
      rotationPitch: 0,
      rotationYaw: 0,
      rotationRoll: 0,
    });
    this.error = null;
  }

  // Submit the form.
  submit(): void {
    // Check if the form is invalid.
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Get the form values.
    const {
      shape,
      color,
      size,
      positionX,
      positionY,
      positionZ,
      rotationPitch,
      rotationYaw,
      rotationRoll,
    } = this.form.getRawValue();
    if (size === null) {
      return;
    }
    const position = { x: positionX ?? 0, y: positionY ?? 0, z: positionZ ?? 0 };
    const rotation = { pitch: rotationPitch ?? 0, yaw: rotationYaw ?? 0, roll: rotationRoll ?? 0 };
    this.error = null;
    this.busy = true;

    // If the object is not null, update the object.
    if (this.object) {
      this.objectsService
        .update(this.object.id, { shape, color, size, position, rotation })
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
      // If the object is null, create a new object.
      const body: Object3DCreate = { shape, color, size, position, rotation };
      this.objectsService.create(body).subscribe({
        next: () => {
          this.busy = false;
          this.resetToDefaults();
          this.saved.emit();
        },
        error: () => {
          this.busy = false;
          this.error = 'Create failed.';
        },
      });
    }
  }

  // Clear the form and emit a cleared event.
  newObject(): void {
    this.cleared.emit();
  }
}
