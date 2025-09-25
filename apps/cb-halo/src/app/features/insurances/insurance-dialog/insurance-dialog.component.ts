import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    FormsModule,
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
  insurance: Partial<Insurance> = {};
  readonly dialogRef = inject(MatDialogRef<InsuranceDialogComponent>);
  data = inject(MAT_DIALOG_DATA);

  constructor(
  ) {
    if (this.data.mode === 'edit' && this.data.insurance) {
      this.insurance = { ...this.data.insurance };
    } else {
      this.insurance = {
        name: '',
        description: '',
        pricePerDay: 0,
        currency: 'EUR',
        amountCovered: 0,
        region: 'Europe'
      };
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(this.insurance);
  }
}
