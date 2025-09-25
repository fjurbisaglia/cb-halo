import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Insurance } from '../../../interfaces/insurance.interface';

export interface DialogData {
  insurance?: Insurance;
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-insurance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './insurance-dialog.component.html',
  styleUrl: './insurance-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsuranceDialogComponent {
  insuranceForm: FormGroup;
  readonly dialogRef = inject(MatDialogRef<InsuranceDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  constructor() {
    this.insuranceForm = this.fb.group({
      name: ['', [Validators.required]],
      description: ['', [Validators.required]],
      pricePerDay: [0, [Validators.required, Validators.min(0)]],
      currency: ['EUR', [Validators.required]],
      amountCovered: [0, [Validators.required, Validators.min(0)]],
      region: ['Europe', [Validators.required]]
    });

    if (this.data.mode === 'edit' && this.data.insurance) {
      this.insuranceForm.patchValue(this.data.insurance);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.insuranceForm.valid) {
      this.dialogRef.close(this.insuranceForm.value);
    }
  }
}
